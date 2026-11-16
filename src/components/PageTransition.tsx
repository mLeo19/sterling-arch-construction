"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
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
      .then(waitForDecode)
      .then(() => pageColumnsApi.reveal())
      .finally(() => {
        transitioningRef.current = false;
      });
  }, [waitForDecode]);

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
      // Ignore a second nav attempt while one is already in flight, rather
      // than compounding two overlapping cover()/reveal() sequences - the
      // columns already cover the screen for the first one (and are
      // pointer-events-none, so this is purely a don't-double-fire guard,
      // not something blocking a real click), so there's nothing stale
      // showing in the meantime for the user to click through anyway.
      if (transitioningRef.current) return;

      event.preventDefault();
      pageTransitionState.onNavigate?.();

      const href = url.pathname + url.search + url.hash;
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (prefersReducedMotion) {
        routerRef.current.push(href);
        return;
      }

      transitioningRef.current = true;
      // Sequential, not concurrent: the columns have to be fully, solidly
      // covering - not mid-stagger - before the route swap happens
      // underneath, or a fast (likely, since this site is fully static)
      // navigation can land while some columns haven't grown in yet,
      // visible through the gap. router.push() only fires once cover()'s
      // own promise has actually resolved.
      pageColumnsApi.cover().then(() => {
        routerRef.current.push(href);
        settleAfterCovered();
      });
    }
    // Capture phase, same reasoning as every click-listener this file has
    // ever used: runs before the anchor's own default navigation and
    // before anything else's bubble-phase handler, regardless of where in
    // the tree the actual link lives.
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [settleAfterCovered]);

  useEffect(() => {
    function handlePopState() {
      pageTransitionState.onNavigate?.();

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
      settleAfterCovered();
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [settleAfterCovered]);

  return <>{children}</>;
}
