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
 */
export function Parallax({
  children,
  amount = 8,
  className = "",
}: {
  children: React.ReactNode;
  amount?: number;
  className?: string;
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
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    },
    { scope: ref, dependencies: [amount] }
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
