"use client";

import { createContext, useContext, useEffect, useRef, type RefObject } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap, ScrollTrigger } from "@/lib/gsap";

// Exposed so anything that needs to programmatically move scroll (route
// changes, the mobile menu's scroll lock) can go through Lenis's own API
// instead of a raw `window.scrollTo` - Lenis drives scroll position itself
// every tick via gsap.ticker, so a raw scrollTo changes the DOM's scrollTop
// without telling Lenis its internal target moved, and Lenis reasserts its
// own stale target on the very next tick.
//
// A RefObject, not useState - consumers only ever need the *current*
// instance at the moment they act (inside an effect/event handler), never a
// reactive re-render when it's created/destroyed. `.current` is null outside
// the browser and whenever prefers-reduced-motion or a touch device skips
// creating Lenis entirely - consumers must handle that and fall back to a
// plain window.scrollTo/body overflow toggle.
const LenisContext = createContext<RefObject<Lenis | null> | null>(null);

export function useLenis() {
  return useContext(LenisContext);
}

export default function SmoothScroll({
  children,
}: {
  children: React.ReactNode;
}) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    // Coarse pointer = touch device. Native scrolling feels better than Lenis
    // on phones, so we skip smooth scrolling entirely for touch input.
    const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

    if (prefersReducedMotion || isTouchDevice) {
      return;
    }

    const lenis = new Lenis({
      autoRaf: false, // we drive Lenis ourselves below so it shares gsap's ticker
      // Zeroes Lenis's own velocity/target the instant a same-origin,
      // different-pathname link is clicked - without this, clicking a nav
      // link mid-flick (trackpad momentum still easing out) leaves Lenis
      // gliding toward its pre-navigation target, which PageTransition's own
      // resetScroll() has to keep fighting via its scroll guard. Doesn't by
      // itself stop *new* wheel events the OS keeps synthesizing after the
      // click (real trackpad momentum), which is what PageTransition's own
      // guard still exists to catch - this only kills the momentum Lenis
      // itself was already carrying forward from before the click.
      stopInertiaOnNavigate: true,
    });
    lenisRef.current = lenis;

    // Every time Lenis moves the page, tell ScrollTrigger to recompute so its
    // triggers line up with the smoothed scroll position instead of the raw one.
    lenis.on("scroll", ScrollTrigger.update);

    // gsap.ticker already runs one requestAnimationFrame loop for all GSAP
    // animations. Feeding Lenis from it (instead of Lenis's own rAF) keeps
    // Lenis and ScrollTrigger perfectly in sync on a single frame loop.
    const onTick = (time: number) => {
      lenis.raf(time * 1000); // gsap.ticker reports seconds, Lenis expects milliseconds
    };
    gsap.ticker.add(onTick);

    // GSAP's ticker tries to smooth over long frames (e.g. tab switches) by
    // skipping time. That fights Lenis's own easing, so we turn it off.
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return (
    <LenisContext.Provider value={lenisRef}>{children}</LenisContext.Provider>
  );
}
