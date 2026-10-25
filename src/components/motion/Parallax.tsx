"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";

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
 * hero backdrop), not one scrolling up into view from below - it only
 * changes the ScrollTrigger's own `start` ("top top" vs "top bottom").
 *
 * This component used to carry a much larger workaround here: an older
 * PageTransition synchronously scaled+fixed+off-screened the whole page on
 * every navigation, then called `ScrollTrigger.refresh()` while still in
 * that distorted state (and again once settled) - which visibly corrupted
 * a live top-of-page trigger, since GSAP's own refresh unconditionally
 * force-reverts every trigger's tween first regardless of enabled state.
 * The fix at the time was to measure once, kill the trigger outright, and
 * only recreate a live one after a hardcoded delay matched to that old
 * transition's settle time.
 *
 * That whole premise is gone: PageTransition is now a solid, opaque
 * column-wipe overlay (see PageTransitionColumns.tsx) that deliberately
 * never touches, measures, or scales the actual page content, and calls
 * `ScrollTrigger.refresh()` nowhere at all (grep confirms zero call sites
 * left in this codebase). Keeping the measure-kill-reapply dance after
 * that mechanism was removed didn't just become unnecessary - it became
 * the bug: the initial measurement still ran as a layout effect, which
 * fires before PageTransition's own *passive* effect resets scroll to 0
 * on navigation, so it baked in a `yPercent` computed against the
 * *previous* page's leftover scroll position. The delayed recreate then
 * snapped from that stale value to the correct one on a fixed timer tied
 * to constants from the transition system that no longer exists - a
 * visible jump in the hero image right after the page transition reveals,
 * confirmed live via Playwright (translateY jumping from a stale
 * mid-20s-px value to its correct resting one about 1.3s after
 * navigating). A single live ScrollTrigger, created once and never killed,
 * naturally tracks the real scroll position as PageTransition resets it -
 * same as any other scroll-driven element on the page - so there's nothing
 * left to bake in or snap away from.
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

  useGSAP(
    () => {
      if (!ref.current || amount === 0) return;
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReducedMotion) return;

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
    },
    { scope: ref, dependencies: [amount, topOfPage] }
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
