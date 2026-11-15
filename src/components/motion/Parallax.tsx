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
 * That specific premise (refresh() running while the page is still
 * distorted) is gone, even though PageTransition has since gone back to a
 * real sliding pane: this element's own wrapper is made position:fixed
 * synchronously, via an inline style applied at render time, before this
 * component's own ScrollTrigger is ever created - see TransitionPane's own
 * doc comment in PageTransition.tsx.
 *
 * Known remaining limitation: a live ScrollTrigger measured while its
 * trigger element sits inside a position:fixed ancestor (as it does for
 * the duration of PageTransition's own rise) can still read a slightly
 * different value than its final, settled-into-normal-flow measurement -
 * confirmed live via Playwright on this project's own hero image, a real
 * but brief (single-frame) pop in the backdrop's drift position the
 * instant the pane finishes rising and scroll resets. A fix gating
 * live-trigger creation behind the ancestor pane's own settled state was
 * attempted and reverted: the natural "fix" (render a hand-derived
 * -amount/2 resting value in the meantime) turned out to depend on this
 * wrapper's own height being final at that early point, which it isn't
 * reliably - the static value and the eventual live-measured one didn't
 * actually agree once tested properly (-33.6px vs the real -24.6px for
 * this hero), making the attempted fix not meaningfully better than the
 * jump it was meant to prevent, while adding real complexity (a new
 * cross-component context). Left as a known, minor follow-up rather than
 * risking a fix that isn't actually solid - see PaneSettledContext's own
 * history in PageTransition.tsx's git log if revisiting this.
 *
 * Separate historical bug, same underlying lesson (don't trust a
 * ScrollTrigger measurement taken against a transitional layout state):
 * the one-time measurement from the old (now fully removed) measure-kill-
 * reapply workaround ran as a layout effect, firing before the scroll-reset
 * that would have made it correct, baking in a `yPercent` computed against
 * the previous page's leftover scroll position, then snapping to the right
 * value on an unrelated timer over a second later. A single live
 * ScrollTrigger, created once and never killed, naturally tracks real
 * scroll position - same as any other scroll-driven element on the page.
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
