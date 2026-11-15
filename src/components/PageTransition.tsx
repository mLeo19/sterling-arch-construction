"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useIntroReady } from "@/components/motion/IntroSequence";
import {
  ease,
  pageSlideDuration,
  pageSlideHoldDuration,
  pageSlideScaleFrom,
  pageTransitionState,
} from "@/lib/motion";

/**
 * fluid.glass-style rising pane: the incoming page slides up from fully
 * below the viewport (scale pageSlideScaleFrom -> 1, translateY 100vh -> 0)
 * over a solid, permanently-dark backdrop - fluid.glass's own actual
 * technique. Two earlier versions of this file instead tried to keep the
 * *real* outgoing page visible and darkened in that margin: first by
 * cloning its DOM (because Next's App Router silently re-renders a
 * "frozen" outgoing slot to the new route the instant pathname changes,
 * so a live subtree can't be trusted to stay accurate), later via the
 * browser's native View Transitions API (which snapshots the page as a
 * real bitmap instead, sidestepping the clone). Both chased exact visual
 * fidelity to fluid.glass and both proved unreliable in ways that only
 * ever showed up on a real device - wrong-content flashes, scroll
 * corruption, a white flash from a browser-engine timing gap - across
 * many rounds of fixes neither this file's own author nor the user could
 * fully verify without a physical phone in hand. Full history in this
 * file's own git log and this project's memory if that's ever worth
 * re-deriving.
 *
 * This version gives up pixel-exact fidelity to fluid.glass (the outgoing
 * page is simply gone, covered by a solid backdrop, not visible-and-
 * darkened) in exchange for a mechanism with nothing left to go wrong in a
 * browser-specific way: no DOM cloning, no browser transition API, just
 * plain React state and GSAP tweens - the exact same kind of mechanism
 * this file's own *incoming* pane has used, bug-free, this entire history
 * (every bug above was specifically about the outgoing side).
 *
 * How a real navigation works end to end:
 *   1. A capture-phase document click listener (handleClick below)
 *      intercepts a real internal link click, synchronously (before
 *      calling router.push) parks the pane off-screen behind an opaque
 *      backdrop and resets scroll to 0 - all imperative, direct DOM/GSAP
 *      calls, not React state, so it's guaranteed to apply in the exact
 *      same tick as the click, before anything async (the route change
 *      itself, however long it takes) can possibly paint a frame of the
 *      wrong content. Nothing about the outgoing page needs to stay
 *      accurate from this instant on - it's fully covered regardless of
 *      what it does underneath.
 *   2. Once Next actually commits the new route (the `pathname` effect
 *      below fires), the pane's own children are already the new page's
 *      content (same div, React just re-rendered what's inside it) - a
 *      brief hold (image-decode race, same as every other navigation)
 *      then the rise itself, revealing it.
 *   3. On settle, the pane returns to normal flow and the backdrop
 *      disappears - by then it's fully covered anyway.
 * `popstate` (browser back/forward) goes through the exact same
 * parkPane()/settle sequence, just triggered by the browser's own history
 * traversal instead of a click - see handlePopState below.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const ready = useIntroReady();

  const paneRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
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

  // True for as long as the pane is fixed/off-screen (removed from normal
  // document flow) - the trailing spacer below reserves exactly one
  // viewport of room for it so Footer/SiteNav don't jump up while it's
  // fixed. Starts true: the very first entry (before the intro loader's
  // `ready` flip) is parked exactly the same way.
  const [paneReserved, setPaneReserved] = useState(true);

  // Synchronously parks the pane off-screen behind an opaque backdrop and
  // resets scroll to 0 - called from both the click listener (before
  // router.push) and the popstate listener (the browser already changed
  // the URL by the time popstate fires). Direct GSAP/DOM calls, not React
  // state, so this applies in the exact same tick it's called, regardless
  // of how long the actual route change then takes to resolve.
  function parkPane() {
    const pane = paneRef.current;
    const backdrop = backdropRef.current;
    if (!pane || !backdrop) return;
    transitioningRef.current = true;
    // Kills any in-flight rise tween first - without this, a popstate
    // (which, unlike a click, is never guarded against re-entering mid-
    // transition - skipping it would leave the displayed content out of
    // sync with the URL the browser already changed) interrupting an
    // already-rising pane would have that tween's own next tick
    // immediately overwrite the gsap.set() call right below it.
    gsap.killTweensOf(pane);
    gsap.set(pane, {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      height: "100dvh",
      overflow: "hidden",
      y: window.innerHeight,
      scale: pageSlideScaleFrom,
      zIndex: 10,
      willChange: "transform",
    });
    gsap.set(backdrop, { opacity: 1, pointerEvents: "none" });
    window.scrollTo(0, 0);
    setPaneReserved(true);
  }

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
      // than compounding two overlapping parkPane()/settle() sequences -
      // the backdrop already covers the screen for the first one, so
      // there's nothing stale showing in the meantime for the user to
      // click through anyway.
      if (transitioningRef.current) return;
      event.preventDefault();
      pageTransitionState.onNavigate?.();
      parkPane();
      routerRef.current.push(url.pathname + url.search + url.hash);
    }
    // Capture phase, same reasoning as every click-listener this file has
    // ever used: runs before the anchor's own default navigation and
    // before anything else's bubble-phase handler, regardless of where in
    // the tree the actual link lives.
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    function handlePopState() {
      pageTransitionState.onNavigate?.();
      parkPane();
      // No router.push here - the browser already changed the URL by the
      // time popstate fires; Next's own router picks up the new pathname
      // independently.
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Compensates for the spacer below collapsing from one viewport to 0 the
  // instant the pane settles back into normal flow and contributes its own
  // real height to the document - without this, a user scrolled far enough
  // down to have Footer/SiteNav already in view would see them jump up by
  // a viewport the moment that happens. Scroll is already pinned to 0 for
  // the whole transition (parkPane, settle below), so there's nothing to
  // compensate *during* it - only right as paneReserved flips back to
  // false and the spacer actually shrinks.
  useGSAP(
    () => {
      if (!ready || !paneRef.current) return;
      const pane = paneRef.current;

      const settle = () => {
        gsap.set(pane, {
          clearProps: "position,top,left,right,height,overflow,y,scale,zIndex,willChange",
        });
        const backdrop = backdropRef.current;
        if (backdrop) gsap.set(backdrop, { opacity: 0, pointerEvents: "none" });
        setPaneReserved(false);
        ScrollTrigger.refresh();
        pageTransitionState.hasPlayedInitial = true;
        transitioningRef.current = false;
      };

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (prefersReducedMotion) {
        settle();
        return;
      }

      // el is fully offscreen right now - nothing inside it is visible
      // yet, so briefly delaying the rise costs nothing. Spent decoding
      // non-lazy images (typically a full-bleed hero photo) before the
      // rise starts: a brand-new <img> isn't guaranteed to reuse any
      // previously-decoded raster even when Next's own `priority` preload
      // already has the bytes on the wire. Raced against a timeout so one
      // slow decode can't hold up the whole reveal.
      const priorityImgs = Array.from(
        pane.querySelectorAll<HTMLImageElement>("img"),
      ).filter((img) => img.loading !== "lazy");
      const decodePromises = priorityImgs.map((img) =>
        img.decode ? img.decode().catch(() => {}) : Promise.resolve(),
      );
      const decodeTimeout = new Promise<void>((resolve) =>
        setTimeout(resolve, pageSlideHoldDuration * 1000),
      );

      let cancelled = false;
      Promise.race([Promise.allSettled(decodePromises), decodeTimeout]).then(
        () => {
          if (cancelled) return;
          gsap.to(pane, {
            y: 0,
            scale: 1,
            duration: pageSlideDuration,
            ease: ease.inOutQuart,
            onComplete: settle,
          });
        },
      );

      return () => {
        cancelled = true;
      };
      // Runs once per real navigation (pathname changing) and once for the
      // very first page (ready flipping true) - never both at once, since
      // ready is already permanently true by the time any real navigation
      // can happen. See the dependency array below.
    },
    { scope: paneRef, dependencies: [ready, pathname] },
  );

  // Very first entry: parked fixed/offscreen via this inline style on
  // every render until `ready` flips (see useGSAP above, which clears
  // every one of these props once it actually settles) - after that,
  // parkPane's own gsap.set calls take over this same job for every real
  // navigation, so this only ever matters once per page load.
  const initialStyle: React.CSSProperties | undefined = !ready
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "100dvh",
        overflow: "hidden",
        transform: `translateY(100vh) scale(${pageSlideScaleFrom})`,
        zIndex: 10,
        willChange: "transform",
      }
    : undefined;

  return (
    <>
      {/* Permanently-dark backdrop behind the rising pane - see this
          file's own doc comment above for why this exists instead of
          showing the real outgoing page. Starts invisible (the very first
          load has its own intro-loader overlay doing this job instead -
          see IntroSequence.tsx); parkPane() makes it opaque the instant a
          real navigation starts. pointer-events: none always - this is
          purely visual, never meant to intercept clicks (same page it
          dims is about to be replaced anyway). */}
      <div
        ref={backdropRef}
        aria-hidden
        className="fixed inset-0 bg-black opacity-0"
        style={{ zIndex: 9, pointerEvents: "none" }}
      />
      <div ref={paneRef} className="relative bg-background" style={initialStyle}>
        {children}
      </div>
      {/* Reserves the pane's own one-viewport contribution to document
          flow while it's position:fixed (and therefore contributing
          nothing) - without this, Footer/SiteNav would jump up by a
          viewport for the whole hold+rise, then back down at settle. */}
      {paneReserved && <div style={{ height: "100dvh" }} />}
    </>
  );
}
