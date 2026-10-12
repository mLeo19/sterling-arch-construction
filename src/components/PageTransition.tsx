"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useIntroReady } from "@/components/motion/IntroSequence";
import { useLenis } from "@/components/SmoothScroll";
import { ease, pageTransition } from "@/lib/motion";

/**
 * The incoming page starts smaller and centered (transformOrigin: "center",
 * not "top center" - a top-anchored origin can only ever grow downward from
 * a fixed top edge, never symmetrically), translated a full viewport-height
 * below the screen, then slides up to y:0 while scaling to 1. The Y motion
 * settles first; the scale keeps growing a little after - these are
 * deliberately NOT simultaneous from the start, so it reads as "rises, then
 * grows" instead of one continuous blended move.
 *
 * Our page content is normal-flow and often taller than the viewport, so we
 * pin its height to 100svh with overflow:hidden for the transition instead of
 * position:fixed, which would pull it out of flow and collapse whatever
 * comes after it (footer, next section) upward underneath it. A normal-flow
 * box with a fixed height still reserves its space normally; transform
 * (the scale/translate) is paint-only and never touches sibling layout.
 * Height/overflow are released back to auto/visible once the transform
 * settles, in release() below.
 *
 * This also plays on the initial hard load, not just client-side
 * navigations - timed to start at the exact instant IntroSequence's own
 * liftoff begins (`ready` flips true at that label), so the outgoing loader
 * and the incoming pane rise together instead of one waiting for the other.
 * On the initial load specifically, this pane must paint ABOVE the intro
 * overlay (z-[100] in IntroSequence.tsx) while it rises, or the whole rise
 * happens invisibly behind that opaque overlay and only its fade-out would
 * be visible - reading as a plain fade-in instead of a rise. Elevated to
 * z-[101] only while that specific transition is running, released back to
 * the resting z-50 the nav itself uses once it settles.
 *
 * The backdrop darkens smoothly during every transition, not just the
 * initial load - a dedicated overlay sitting behind the incoming pane,
 * visible in whatever margin the pane hasn't grown to cover yet. It's
 * released back to transparent once the pane fully covers the screen - by
 * then it's already hidden regardless, this is just cleanup.
 *
 * The outgoing page has to stay visible underneath while the incoming pane
 * rises over it, not disappear the instant navigation starts - the App
 * Router unmounts the outgoing route's content immediately on navigation, so
 * by the time this component re-renders for the new pathname there's no old
 * DOM left to show on its own. Solved with a DOM snapshot: clone the
 * outgoing page's still-attached, still-fully-rendered DOM and park the
 * clone in snapshotRef, a stable container that (unlike contentRef) isn't
 * keyed on pathname and so survives the swap untouched. The clone is inert
 * (no live GSAP/ScrollTrigger bindings) but visually identical at the
 * instant of capture, which is all a few hundred ms of "old page still
 * sitting there" needs to be. translateY'd by the negative of window.scrollY
 * at capture time so a scrolled page still shows what was actually on
 * screen, not its own top.
 *
 * Captured eagerly - a capture-phase click listener on document for link
 * clicks, a popstate listener for browser back/forward - not in an unmount
 * effect cleanup. Both of those fire before Next's router has re-rendered
 * anything, so contentRef.current still shows the outgoing page's real,
 * intact DOM. By the time an unmount cleanup runs, that DOM may already be
 * detached and any inline styles GSAP had set on it (e.g. an opacity:1 a
 * useGSAP context set, then reverted on unmount) already stripped back to
 * their default classes, so a clone taken there can capture a page that's
 * already missing pieces (or, for back/forward specifically, capture
 * nothing at all - confirmed by screenshotting a real back navigation and
 * finding the "outgoing page" snapshot was blank). The unmount-cleanup path
 * is kept only as a last-resort fallback, for navigations that are neither
 * a click nor popstate (a programmatic router.push elsewhere) -
 * capturedForTransitionRef makes all three paths mutually idempotent so
 * whichever one captures first wins.
 *
 * Concurrency: nothing in the mechanism above is safe against a second
 * navigation starting while the first transition's entrance timeline is
 * still running - contentRef re-keys on every pathname change, so a second
 * change mid-animation would leave a stale timeline running against DOM
 * React has already detached, while a new one starts on the real content;
 * both would still write to the same darkenRef/el refs and fight each other.
 * Two guards close that off: transitioningRef blocks (preventDefault) any
 * further tracked link click while a transition is in flight, which covers
 * ordinary double-clicks at the source; and tlRef, killed at the top of
 * every run before a new timeline is built, covers browser back/forward
 * (which can't be preventDefault'd the same way) by guaranteeing whichever
 * transition fires last always wins cleanly and still reaches release().
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ready = useIntroReady();
  const lenisRef = useLenis();
  const contentRef = useRef<HTMLDivElement>(null);
  const darkenRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<HTMLDivElement>(null);
  const hasPlayedInitialRef = useRef(false);
  const capturedForTransitionRef = useRef(false);
  // True from the moment a navigation is captured until its entrance
  // timeline fully releases - see the concurrency doc comment above.
  const transitioningRef = useRef(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const captureSnapshot = useCallback(() => {
    const el = contentRef.current;
    const snapshotContainer = snapshotRef.current;
    if (!el || !snapshotContainer) return;
    if (capturedForTransitionRef.current) return;
    capturedForTransitionRef.current = true;
    transitioningRef.current = true;

    // Freeze Lenis's own scroll loop immediately - it drives scroll position
    // every tick independent of React, so if the user was still mid-flick
    // when navigation started, stop() halts that before it can keep moving
    // the page (or fighting the reset below) while the new route swaps in.
    // Resumed once the new page's own scroll position is explicitly set, in
    // the entrance effect below.
    lenisRef?.current?.stop();
    // Read fresh, right here at capture time - an earlier-captured value can
    // be stale (e.g. zero) by the time a click actually happens, which bakes
    // a wrong compensating offset into the clone.
    const scrollY = window.scrollY;

    const clone = el.cloneNode(true) as HTMLElement;
    clone.style.transform = `translateY(${-scrollY}px)`;
    snapshotContainer.replaceChildren(clone);

    // Harmless when already loaded, and removes the one theoretical gap (a
    // still-pending lazy image frozen mid-load at the instant of capture).
    clone.querySelectorAll("img").forEach((img) => {
      img.loading = "eager";
    });
  }, [lenisRef]);

  // Primary capture path - capture-phase so this always runs before the
  // link's own click handling, regardless of where in the tree that
  // handler is attached.
  useEffect(() => {
    function handleClickCapture(event: MouseEvent) {
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
      // Same pathname - no real page transition happens for these (a hash
      // link, a query-only change), so nothing to capture or block.
      if (url.pathname === window.location.pathname) return;

      // A transition is already running - block this click outright so a
      // second navigation can never start mid-animation. See the
      // concurrency doc comment above.
      if (transitioningRef.current) {
        event.preventDefault();
        return;
      }

      captureSnapshot();
    }

    document.addEventListener("click", handleClickCapture, true);
    return () => document.removeEventListener("click", handleClickCapture, true);
  }, [captureSnapshot]);

  // Eager capture for browser back/forward, the same idea as the click
  // listener above: popstate fires synchronously the instant the user
  // presses back/forward, before Next's router has re-rendered anything, so
  // contentRef.current still shows the outgoing page's real, intact DOM at
  // that point. Without this, back/forward only reached captureSnapshot via
  // the unmount-cleanup fallback below - which, by the time it actually
  // fires, could already be looking at a stale contentRef.current (the
  // snapshot came out blank, not the real outgoing page - confirmed by
  // screenshotting a real back navigation frame by frame).
  useEffect(() => {
    window.addEventListener("popstate", captureSnapshot);
    return () => window.removeEventListener("popstate", captureSnapshot);
  }, [captureSnapshot]);

  // Last-resort fallback for navigations that are neither a tracked click
  // nor popstate (e.g. a programmatic router.push elsewhere).
  useLayoutEffect(() => {
    const thisPathname = pathname;
    capturedForTransitionRef.current = false;
    return () => {
      // React Strict Mode synchronously invokes setup/cleanup/setup once on
      // mount to test cleanup safety, for the exact same pathname - Next's
      // router updates window.location.pathname synchronously as part of a
      // real navigation, before this cleanup ever runs, so a genuine
      // cleanup always sees a *different* live pathname than the one this
      // effect instance was set up for. Strict Mode's synthetic call fires
      // before any navigation happened at all, so the live URL still
      // matches - that's the signal to bail out and touch nothing.
      if (window.location.pathname === thisPathname) return;
      captureSnapshot();
    };
  }, [pathname, captureSnapshot]);

  useGSAP(
    () => {
      if (!ready || !contentRef.current) return;
      const el = contentRef.current;

      // Kill whichever previous transition's timeline might still be
      // running before building a new one - the concurrency guard that
      // makes browser back/forward safe (see the doc comment above).
      tlRef.current?.kill();

      const release = () => {
        gsap.set(el, { height: "auto", overflow: "visible", y: 0, scale: 1 });
        gsap.set(darkenRef.current, { opacity: 0 });
        snapshotRef.current?.replaceChildren();
        // RevealOnScroll-style children mount and register their own
        // ScrollTriggers while this wrapper is still staged (scaled/
        // translated/height-capped), so those triggers calculate against
        // the wrong geometry. Force everything to recompute now that the
        // real, settled layout is in place.
        ScrollTrigger.refresh();
        // Delayed, not immediate - the intro overlay's own display:none (a
        // separate timeline in IntroSequence.tsx) can land a frame or two
        // after this pane's animation completes; dropping the elevated
        // z-index too early re-exposes it on top for that gap.
        gsap.delayedCall(0.6, () => gsap.set(el, { zIndex: "auto" }));
        transitioningRef.current = false;
      };

      const isInitialLoad = !hasPlayedInitialRef.current;
      hasPlayedInitialRef.current = true;

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReducedMotion) {
        release();
        return;
      }

      if (!isInitialLoad) {
        // Not a raw window.scrollTo - see the stop() doc comment above for
        // why. force:true scrolls even though stop() just paused Lenis;
        // immediate:true skips Lenis's own eased animation, an instant jump
        // like the plain scrollTo this replaces. Falls back to a plain
        // window.scrollTo when Lenis doesn't exist (prefers-reduced-motion
        // already returned above; Lenis also never gets created on touch
        // devices - see SmoothScroll.tsx - so lenis can still legitimately
        // be null here for that reason).
        const lenis = lenisRef?.current;
        if (lenis) {
          lenis.scrollTo(0, { immediate: true, force: true });
          lenis.start();
        } else {
          window.scrollTo(0, 0);
        }
      }

      // Timing here matches Northfield's own PageTransition exactly - not
      // re-derived from fluid.glass. A previous pass here retimed this
      // faster based on screenshot/video captures of fluid.glass that
      // *looked* like its transition completed in under a second; directly
      // polling computed opacity on Northfield's own darken overlay during a
      // real navigation (the reliable method - screenshot/video capture in
      // headless Chromium doesn't reliably correlate with real paint timing
      // for sub-second changes) showed it climbing smoothly from 0 to
      // exactly 0.5 over ~600ms, matching these exact constants - meaning
      // the earlier retune was based on a measurement artifact, not a real
      // difference, and made this transition too fast/subtle compared to
      // the actual reference.
      const fromScale = isInitialLoad ? 0.88 : 0.8;
      // Durations/offset live in src/lib/motion.ts, not as local constants
      // here - Hero.tsx's own text-entrance delay is computed from these
      // same numbers (via pageTransitionSettleTime), so the two can't drift
      // out of sync the way separately-hand-tuned constants eventually do.
      const { yDuration, scaleDuration, scaleOffset } = isInitialLoad
        ? pageTransition.initial
        : pageTransition.subsequent;
      // Peak darken amount, not full black - settles at ~0.5 opacity over
      // the dark base, roughly a 50/50 blend, not an opaque cover.
      const DARKEN_OPACITY = 0.5;
      const DARKEN_DURATION = 0.5;

      gsap.set(el, {
        height: "100svh",
        overflow: "hidden",
        transformOrigin: "center",
        y: window.innerHeight,
        scale: fromScale,
        // Needs to clear both the darken overlay (z-[5]) and, on the
        // initial load only, the intro overlay too (z-[100]).
        zIndex: isInitialLoad ? 101 : 10,
      });
      gsap.set(darkenRef.current, { opacity: 0 });

      const tl = gsap.timeline({ onComplete: release });
      tlRef.current = tl;
      tl.to(el, { y: 0, duration: yDuration, ease: ease.inOutQuart }, 0)
        .to(
          el,
          { scale: 1, duration: scaleDuration, ease: ease.inOutQuart },
          scaleOffset,
        )
        .to(
          darkenRef.current,
          { opacity: DARKEN_OPACITY, duration: DARKEN_DURATION, ease: "power2.out" },
          0,
        );
    },
    { dependencies: [pathname, ready], revertOnUpdate: true },
  );

  return (
    <>
      {/* z-[2]: a frozen visual stand-in for the outgoing route, above the
          plain page background, below the darken overlay and the incoming
          pane. Empty outside a transition. */}
      <div
        ref={snapshotRef}
        aria-hidden
        className="fixed inset-0 z-[2] overflow-hidden pointer-events-none"
      />
      {/* z-[5]: below the content pane's own transient z-index (10, or 101
          on the initial load) but above the plain page background it's
          meant to darken. Not keyed on pathname, so it persists as one
          stable element across navigations instead of remounting. */}
      <div
        ref={darkenRef}
        aria-hidden
        className="fixed inset-0 z-[5] bg-black opacity-0 pointer-events-none"
      />
      {/* bg-background: a real, confirmed bug, found by comparing actual
          rendered pixels against Northfield's (not just timing/transform
          values, which already matched almost exactly). This div has no
          background of its own, and neither does a bare <main>/<PageHero> -
          the only paint color came from <body>'s own background, which by
          the CSS spec always paints beneath every positioned element on the
          page, including this div's own z-10. So during the transition this
          "pane" was fully transparent, letting the darkened snapshot behind
          it (z-5/z-2) show straight through - confirmed by comparing
          getBoundingClientRect() at matched timestamps against Northfield
          (nearly identical positions/sizes) next to the actual screenshots
          (Northfield: a solid, sharp-edged pane; ours: nothing visible but
          the darkening old page). Northfield's own pages avoid this by
          giving their *content* sections explicit backgrounds (e.g.
          `bg-linen` on their Projects page's section) - fixed here instead,
          once, so every current and future page gets a solid pane without
          having to remember to background every section. */}
      <div ref={contentRef} key={pathname} className="relative bg-background">
        {children}
      </div>
    </>
  );
}
