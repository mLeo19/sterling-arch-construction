"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { useIntroReady } from "@/components/motion/IntroSequence";
import { pageTransitionSettleTime, pageTransitionState } from "@/lib/motion";

/**
 * Wraps a child in a scroll-scrubbed vertical drift - the "columns of
 * images moving at different rates" effect on fluid.glass's homepage bento
 * grid (their product-collection section: Doors/Structural/Windows/
 * Additional, each at its own fixed Y offset, each also drifting slightly
 * as you scroll past). `amount` is total relative travel over the
 * element's full transit through the viewport, as a percentage of its own
 * height, split evenly above/below its resting position - keep it small
 * (single digits to low teens); a value like 50 reads as broken, not
 * stylish.
 *
 * A positive `amount` makes the element arrive "late" relative to scroll
 * (drifts down against the motion, reads as sitting further back);
 * negative makes it arrive "early" (reads as closer/foreground).
 *
 * Deliberately its own wrapper div, not a prop on RevealOnScroll - a
 * one-time entrance `y` (px) and a continuous scroll-scrubbed `yPercent`
 * are independently-tracked GSAP properties that *can* coexist on one
 * element, but two separate elements with two separate GSAP contexts is
 * simpler to reason about. Compose by nesting, outer Parallax around inner
 * RevealOnScroll.
 *
 * `topOfPage` is for an element that sits at the very top of the page (a
 * hero backdrop), not one scrolling up into view from below.
 *
 * Why this needs special handling at all: PageTransition's entrance effect
 * (gated on `ready`) synchronously scales+fixes+off-screens the whole page
 * - including this element's own ancestor - then calls
 * ScrollTrigger.refresh() while still in that distorted state, and again
 * once settled in release(). A live ScrollTrigger on a top-of-page element
 * gets visibly corrupted by this: its own internal refresh (GSAP's
 * `_refreshAll`) unconditionally force-reverts *every* trigger's tween to
 * progress 0 first (`_revertAll`, which runs regardless of whether the
 * trigger is enabled/disabled - confirmed by reading GSAP's own source;
 * disabling a trigger only skips its own re-*measurement* pass, not this
 * forced revert), then the normal per-trigger refresh pass re-measures and
 * reapplies - except a disabled trigger's own pass is skipped too, so it's
 * left sitting at the reverted (wrong) value until something re-enables
 * it. Different trigger strings, or disable()/enable() around the live
 * trigger, both still produce a visible jump somewhere in that sequence.
 *
 * The only way to produce zero visible jump is to not have a live,
 * refresh()-reachable ScrollTrigger at all during PageTransition's window
 * on this element. (A hand-derived constant - "top top" progress at
 * scrollY 0 ought to always be exactly 0 - looked promising but turned out
 * measurably wrong in practice, off by a few percent for reasons not worth
 * chasing further; only a real measurement is trustworthy.) So topOfPage
 * instead: (1) creates a real ScrollTrigger immediately, same as always -
 * this mounts and measures correctly well before PageTransition's own
 * entrance effect (gated on `ready`) has touched anything - then
 * immediately reads back the resulting value and kills that trigger
 * outright, reapplying the captured value via a plain `gsap.set`. Killing
 * (not just disabling) is what matters: a disabled trigger is still
 * visited by ScrollTrigger.refresh()'s own internal `_revertAll()` sweep
 * regardless of its enabled state (confirmed in GSAP's own source), so
 * only full removal from its trigger list makes it immune to
 * PageTransition's mid-transition refresh calls. (2) only creates the
 * real, live, scroll-responsive ScrollTrigger again once PageTransition
 * has fully settled - at which point it re-measures against the
 * by-then-identical settled layout and lands on the same captured value,
 * so there's nothing left to visibly change. Below-the-fold uses
 * (duo/gallery tiles, ServicesCollection's bento cards) don't need any of
 * this: nothing scrolls that far until long after the transition has
 * settled, so they never observe the mid-transition refresh.
 */
export function Parallax({
  children,
  amount = 8,
  className = "",
  topOfPage = false,
}: {
  children: React.ReactNode;
  amount?: number;
  className?: string;
  topOfPage?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ready = useIntroReady();

  const create = () => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current,
      { yPercent: -amount / 2 },
      {
        yPercent: amount / 2,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current,
          start: topOfPage ? "top top" : "top bottom",
          end: "bottom top",
          scrub: true,
        },
      }
    );
  };

  const { contextSafe } = useGSAP(
    () => {
      if (!ref.current || amount === 0) return;
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReducedMotion) return;

      create();
      if (!topOfPage) return;

      // Measure-then-kill-then-reapply - see this component's own doc
      // comment above for why a live trigger can't just be left disabled
      // here.
      const resting = gsap.getProperty(ref.current, "yPercent") as number;
      gsap.getTweensOf(ref.current).forEach((t) => {
        t.scrollTrigger?.kill(false);
        t.kill();
      });
      gsap.set(ref.current, { yPercent: resting });
    },
    { scope: ref, dependencies: [amount, topOfPage] }
  );

  // Deliberately `useGSAP` here too, not a plain `useEffect`: PageTransition
  // reads/writes `pageTransitionState.hasPlayedInitial` from its own
  // `useGSAP` (a layout effect), and layout effects across the whole tree
  // run - as one phase - before any passive `useEffect` does, regardless of
  // which component is the deeper descendant. A plain `useEffect` here
  // would always read this *after* PageTransition's own entrance effect
  // already flipped it, silently always computing the shorter "subsequent
  // navigation" delay even on an initial load.
  useGSAP(
    () => {
      if (!topOfPage || !ready || amount === 0) return;
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReducedMotion) return;

      const isInitialLoad = !pageTransitionState.hasPlayedInitial;
      // contextSafe, not a bare closure: gsap.context only auto-tracks
      // animations created *synchronously* during a useGSAP callback's own
      // execution. create() here runs later, inside delayedCall's own
      // async callback, well outside that window - contextSafe re-opens
      // this component's context for that one call so the resulting
      // ScrollTrigger still gets reverted on unmount/navigation like
      // everything else.
      const call = gsap.delayedCall(
        pageTransitionSettleTime(isInitialLoad) + 0.05,
        contextSafe(create)
      );
      return () => {
        call.kill();
      };
    },
    { dependencies: [topOfPage, ready, amount] }
  );

  return (
    // No SSR-rendered transform here, deliberately: `className` also
    // carries this element's own static Tailwind translate-y-* positioning
    // in some callers, and an inline style transform would win over that
    // class outright. Separately, GSAP decomposes an existing raw CSS
    // transform into its own `y` (pixel) cache on first touch, and
    // yPercent is a different, *additive* bucket - a later `yPercent` set
    // would add to that cache instead of overwriting it (see Hero.tsx's
    // per-word reveal for the full mechanism). If this ever needs an
    // SSR-safe starting pose, animate `y` in pixels instead of `yPercent`,
    // and scope any inline style to a wrapper that doesn't also carry
    // positioning classes.
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
