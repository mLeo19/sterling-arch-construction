"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ScrollTrigger } from "@/lib/gsap";
import { useIntroReady } from "@/components/motion/IntroSequence";
import { pageColumnsApi } from "@/components/PageTransitionColumns";
import { pageRevealHoldDuration, pageTransitionState } from "@/lib/motion";

/**
 * A link click (or browser back/forward) covers the screen with
 * PageTransitionColumns' own vertical-columns wipe, swaps the route
 * underneath while fully hidden, then reveals it. See pageColumnCount's
 * own doc comment in lib/motion.ts for why this project landed here
 * instead of a browser-API-driven crossfade or a transform-based rising
 * pane - both tried before, both the direct source of every real-device-
 * only bug ever chased in this area (full history in this file's own git
 * log and this project's memory, if that's ever worth re-deriving). This
 * version never touches, measures, or clones the actual page content at
 * all - the columns are a solid, opaque, purely decorative overlay
 * sitting above everything while the real page quietly swaps behind it,
 * which structurally can't exhibit that entire bug class.
 *
 * Click and popstate are NOT symmetric, and it's tempting to make them so
 * - they can't be, for one real reason: a click lets this file control
 * exactly when the route actually changes (router.push() is only called
 * once cover()'s own animation has fully finished), so there's never a
 * window where new content could paint before the columns have grown
 * in enough to hide it. A popstate fires *after* the browser has already
 * changed the URL - Next's own router can re-render to match it on
 * whatever timing it likes, which this file has no way to delay the way
 * a click's own router.push() call can be delayed. Covering animated,
 * the normal way, on a popstate would leave a real window for that race.
 * See pageColumnsApi.coverInstant's own doc comment (PageTransitionColumns.tsx)
 * for the fix: popstate snaps the columns to their fully-covered end state
 * synchronously, with no animation, removing that window entirely rather
 * than trying to win a race against it.
 *
 * A click arriving while a previous one is still mid-cycle doesn't get
 * dropped - see queuedHrefRef's own doc comment below for why that used
 * to let next/link's own default handler sneak an uncontrolled, un-
 * animated navigation through underneath. It's queued (only the latest
 * survives) and runs its own full cycle once the current one settles.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const ready = useIntroReady();

  const transitioningRef = useRef(false);
  // Mirrors `routerRef` pattern used throughout this project - the click
  // listener effect below attaches exactly once (empty deps) and needs
  // router.push to stay current across however many renders happen
  // between attachment and an actual click, regardless of whether
  // useRouter() ever returns a new object identity.
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);
  // Holds the callback that tells the in-flight transition "the DOM now
  // matches the new route" - router.push() itself doesn't signal this
  // (App Router navigation is async), and a popstate-driven change has no
  // equivalent call to await at all, so both paths wait on this same ref
  // until the pathname effect below confirms React has actually committed
  // the new page.
  const resolveRef = useRef<(() => void) | null>(null);
  // A click arriving while transitioningRef is already true used to just
  // `return` before preventDefault - the click's own default browser
  // action (next/link's own onClick, which still runs in the bubble phase
  // since this listener never stopped it) then fired completely
  // uncontrolled: an instant, un-animated route swap with no cover(), no
  // reveal(), and no ScrollTrigger.refresh() for the page it landed on.
  // Confirmed live (a `page.on("load")` count that never incremented,
  // ruling out a hard reload, plus the next pathname's own parallax
  // reading as permanently stuck at its un-refreshed starting value) -
  // this is a real, not-even-rare path: the full cover-through-reveal
  // cycle takes long enough (see pageColumnCount's own doc comment) that
  // clicking a second link before the first settles is an easy thing for
  // an impatient real user to do. Queuing instead: preventDefault always
  // fires now, so next/link's own handler never gets this click at all;
  // if one's already in flight, only the *latest* queued href survives
  // (overwriting, not stacking), and settleAfterCovered's own `finally`
  // drains it once the current cycle fully finishes.
  const queuedHrefRef = useRef<string | null>(null);

  useEffect(() => {
    if (ready) pageTransitionState.hasPlayedInitial = true;
  }, [ready]);

  // Resolves whatever transition is in flight once the new route has
  // actually committed, and resets scroll to the top of it - matching Vue
  // Router's own default scrollBehavior (fluid.glass's actual mechanism
  // for this). Runs while the columns are still fully covering the
  // screen, so the jump is never visible.
  useEffect(() => {
    resolveRef.current?.();
    resolveRef.current = null;
    window.scrollTo(0, 0);
  }, [pathname]);

  // Races the new page's own priority-image decode against
  // pageRevealHoldDuration before letting the columns reveal it - a brand-
  // new <img> isn't guaranteed to reuse any previously-decoded raster even
  // when Next's own `priority` preload already has the bytes on the wire,
  // and the columns are fully opaque right up until reveal() actually
  // starts, so there's nothing visible to lose by waiting out whichever
  // finishes first.
  const waitForDecode = useCallback(() => {
    const priorityImgs = Array.from(
      document.querySelectorAll<HTMLImageElement>("img"),
    ).filter((img) => img.loading !== "lazy");
    const decodePromises = priorityImgs.map((img) =>
      img.decode ? img.decode().catch(() => {}) : Promise.resolve(),
    );
    const decodeTimeout = new Promise<void>((resolve) =>
      setTimeout(resolve, pageRevealHoldDuration * 1000),
    );
    return Promise.race([Promise.allSettled(decodePromises), decodeTimeout]);
  }, []);

  // Checked after EITHER settle path (click or popstate) finishes - see
  // queuedHrefRef's own doc comment above. Not folded into
  // settleAfterCovered itself: that would make it call runClickNavigation
  // and runClickNavigation call it right back, which isn't actually a
  // problem for plain JS closures (both call each other only once already
  // running, never at definition time) but IS something React's hooks
  // lint has no way to verify is safe, so it can't be expressed as two
  // mutually-dependent useCallbacks here - each of this function's two
  // call sites (runClickNavigation's own promise chain below, and
  // handlePopState further down) runs it directly instead.
  function drainQueuedHref() {
    const queued = queuedHrefRef.current;
    if (queued) {
      queuedHrefRef.current = null;
      runClickNavigation(queued);
    }
  }

  // Shared by both the click and popstate paths once the screen is
  // already (or about to be) fully covered: wait for the route to commit,
  // wait out the decode race, reveal. `afterCovered` is where the two
  // paths actually differ - see each call site below. Only reads
  // refs/stable imports, so a plain empty dependency array here is
  // correct, not a lint-rule workaround - this identity never needs to
  // change for the click/popstate effects below to keep seeing current
  // behavior.
  const settleAfterCovered = useCallback(() => {
    const routeCommitted = new Promise<void>((resolve) => {
      resolveRef.current = resolve;
    });
    return routeCommitted
      .then(() => {
        // Every ScrollTrigger on the page (Footer's own parallax,
        // Parallax.tsx, PinnedScale, etc.) caches its start/end scroll
        // positions against the page's layout at the time it was
        // created - stale the instant a real navigation swaps in a page
        // with a different height, since nothing else re-measures them.
        // Every previous PageTransition architecture called this on
        // settle; this rebuild dropped it entirely. Confirmed live:
        // without it, a parallax's own scrub read anywhere from "short of
        // its real end" (a similarly-tall page) to "stuck at its very
        // start value the whole time" (a much shorter page, where the
        // stale end position no longer exists on the new page at all).
        // Safe to refresh now, before reveal() - the new route's layout
        // has already committed (that's what routeCommitted means), and
        // the columns are still fully covering the screen regardless, so
        // nothing user-visible depends on exactly when this runs.
        ScrollTrigger.refresh();
      })
      .then(waitForDecode)
      .then(() => pageColumnsApi.reveal())
      .finally(() => {
        transitioningRef.current = false;
      });
  }, [waitForDecode]);

  // Not wrapped in useCallback - its only non-stable-ref dependency is
  // settleAfterCovered, which never changes identity (waitForDecode,
  // transitively, never does either), so there would be nothing left for
  // memoizing this to actually buy; a plain function keeps the two
  // call sites below (handleClick, drainQueuedHref) simple closures
  // instead of needing their own ref-mirroring dance.
  function runClickNavigation(href: string) {
    transitioningRef.current = true;
    // Sequential, not concurrent: the columns have to be fully, solidly
    // covering - not mid-stagger - before the route swap happens
    // underneath, or a fast (likely, since this site is fully static)
    // navigation can land while some columns haven't grown in yet,
    // visible through the gap. router.push() only fires once cover()'s
    // own promise has actually resolved.
    pageColumnsApi.cover().then(() => {
      routerRef.current.push(href);
      settleAfterCovered().then(drainQueuedHref);
    });
  }

  // runClickNavigation is a plain function (not useCallback) specifically
  // because it and drainQueuedHref call each other (see runClickNavigation's
  // own doc comment above) - true mutual recursion between two `const
  // useCallback`s isn't expressible (each would need the other in its own
  // dependency array before that other const has been initialized), and
  // storing either in a ref to break the cycle is exactly the pattern
  // this project's own stricter hooks lint now rejects outright. Safe to
  // omit here: runClickNavigation only ever closes over refs and
  // settleAfterCovered, neither of which this effect's own re-run would
  // ever need to react to - the warning's underlying premise (this
  // closure can go stale) doesn't actually hold for this function.
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      // preventDefault unconditionally, even if a transition is already
      // in flight - see queuedHrefRef's own doc comment above for the bug
      // that exists if this is skipped: next/link's own bubble-phase
      // onClick still runs this exact click otherwise, doing an instant,
      // completely uncontrolled route swap with no columns, no
      // ScrollTrigger.refresh(), nothing.
      event.preventDefault();
      // Awaited below (not fire-and-forget) - see pageTransitionState.
      // onNavigate's own doc comment in lib/motion.ts for why: a menu open
      // at click time gets to play its own real, graceful close animation
      // and actually finish before cover() starts, instead of the two
      // competing for the same frame budget. Resolves on (essentially)
      // the same tick when the menu wasn't open, which is the overwhelming
      // majority of clicks.
      const menuClosed = pageTransitionState.onNavigate?.() ?? Promise.resolve();

      const href = url.pathname + url.search + url.hash;
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (prefersReducedMotion) {
        menuClosed.then(() => routerRef.current.push(href));
        return;
      }

      if (transitioningRef.current) {
        // Only the latest queued href survives - a second then third
        // click while still covered should land wherever the user
        // clicked *last*, not visit every intermediate link along the
        // way. Not chained off menuClosed - draining this queue later
        // only ever calls runClickNavigation, which doesn't need to know
        // about the menu at all; onNavigate already fired above and the
        // menu is closing (or already closed) on its own timeline
        // regardless of when this queued href eventually runs.
        queuedHrefRef.current = href;
        return;
      }

      menuClosed.then(() => runClickNavigation(href));
    }
    // Capture phase, same reasoning as every click-listener this file has
    // ever used: runs before the anchor's own default navigation and
    // before anything else's bubble-phase handler, regardless of where in
    // the tree the actual link lives.
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // drainQueuedHref is a plain function for the same reason
  // runClickNavigation is (see its own explanation above the click
  // effect) - it only closes over queuedHrefRef and runClickNavigation,
  // neither of which this effect's own re-run would ever need to react to.
  useEffect(() => {
    function handlePopState() {
      pageTransitionState.onNavigate?.();
      // A popstate represents the browser's own, already-committed
      // navigation - it wins over anything merely queued from an earlier
      // click (see queuedHrefRef's own doc comment above), rather than
      // that queued click firing afterward and immediately navigating
      // away from where the user just went back/forward to.
      queuedHrefRef.current = null;

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      // No router.push here - the browser already changed the URL by the
      // time popstate fires; Next's own router picks up the new pathname
      // independently. Under reduced motion there's nothing left for this
      // handler to do at all: the pathname effect above still resets
      // scroll regardless of how the navigation started.
      if (prefersReducedMotion) return;

      transitioningRef.current = true;
      pageColumnsApi.coverInstant();
      // Not draining anything queued *before* this popstate (cleared
      // above), but a click can still arrive *during* this popstate's own
      // settle (transitioningRef is already true by the time it would
      // land) - that one still deserves its own cycle once this settles.
      settleAfterCovered().then(drainQueuedHref);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settleAfterCovered]);

  return <>{children}</>;
}
