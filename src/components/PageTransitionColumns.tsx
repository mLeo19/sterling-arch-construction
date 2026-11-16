"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import {
  pageColumnCount,
  pageColumnCoverDuration,
  pageColumnCoverEase,
  pageColumnRevealDuration,
  pageColumnRevealEase,
  pageColumnStagger,
} from "@/lib/motion";

type ColumnsApi = {
  cover: () => Promise<void>;
  // Synchronous, not animated - see PageTransition.tsx's own popstate
  // handler for why browser back/forward needs this instead of cover().
  // A click controls exactly when its own router.push() fires (only after
  // cover()'s animation has actually finished), so there's no way for new
  // content to paint before the columns finish growing. A popstate fires
  // *after* the browser has already changed the URL - Next's own router
  // can re-render to match it on its own timing, which this component has
  // no way to delay the way a click's own router.push() call can be
  // delayed. An animated cover() here would leave a real window where the
  // new route's content could paint before the columns have grown in
  // enough to hide it. Snapping straight to the fully-covered end state
  // removes that window entirely - nothing left to race.
  coverInstant: () => void;
  reveal: () => Promise<void>;
};

// Populated once this component mounts - it's rendered exactly once, at
// the root layout, and never unmounts, so PageTransition.tsx can call
// into it imperatively without this component needing to own any of
// PageTransition's own navigation/routing state. Default no-op
// implementations so a call before mount (shouldn't happen in practice -
// this mounts before any link can be clicked - but costs nothing to
// guard) doesn't throw.
export const pageColumnsApi: ColumnsApi = {
  cover: () => Promise.resolve(),
  coverInstant: () => {},
  reveal: () => Promise.resolve(),
};

/**
 * The vertical-columns wipe every real navigation uses - see
 * pageColumnCount's own doc comment in lib/motion.ts for the full
 * reasoning behind this mechanism (and why it replaced two earlier
 * attempts, both of which chased visual fidelity to fluid.glass via a
 * browser snapshot API or a transform-based rising pane, and both of
 * which were the direct source of every real-device-only bug this
 * project ever chased).
 *
 * Each column springs up from the bottom (transform-origin: bottom,
 * scaleY 0->1) to cover the screen, staggered left to right; once
 * covered, the actual route swap happens completely hidden underneath. To
 * reveal, each column slides straight up and off-screen, in the same
 * left-to-right order it arrived in ("first in, first out").
 *
 * cover()/reveal() are each built as a gsap.timeline() specifically so
 * their resolve() fires once, when the *whole* staggered group finishes -
 * onComplete passed directly into a staggered array tween fires once per
 * individual target instead (confirmed in GSAP's own source), which would
 * resolve on the first column's completion while the rest (delayed by
 * their own stagger offset) are still mid-animation - exactly the "new
 * page visible before covering finishes" bug this was built to prevent,
 * confirmed live via Playwright the first time this mechanism was built.
 *
 * cover()'s scaleY/yPercent fromTo folds both properties into one tween
 * rather than a separate yPercent `.set()` beforehand - a previous version
 * of this exact mechanism had that as a sibling call, and the scaleY
 * tween's own `overwrite: true` killed it the instant it was constructed
 * (overwrite kills every existing tween on a target, not just ones
 * touching the same property), so the yPercent reset silently never ran
 * and every cover() after the first grew the columns to full scale while
 * they sat permanently translated off the top of the screen - "fully
 * covering" by scale alone, invisible in practice. Folding both into one
 * fromTo removes the sibling tween there is to kill.
 *
 * A plain fixed overlay with a handful of div children, animated purely
 * via transform - deliberately not touching, cloning, or measuring the
 * actual page content at all. This can't corrupt a ScrollTrigger, race an
 * image decode, or need z-index tricks against the live page's own
 * stacking - it's a solid, opaque box sitting above everything while the
 * real page quietly updates behind it.
 */
export function PageTransitionColumns() {
  const columnsRef = useRef<HTMLDivElement[]>([]);

  useGSAP(() => {
    const columns = columnsRef.current;
    if (!columns.length) return;

    pageColumnsApi.cover = () =>
      new Promise<void>((resolve) => {
        const tl = gsap.timeline({ onComplete: resolve });
        tl.fromTo(
          columns,
          { scaleY: 0, yPercent: 0 },
          {
            scaleY: 1,
            duration: pageColumnCoverDuration,
            ease: pageColumnCoverEase,
            stagger: pageColumnStagger,
            overwrite: true,
          },
        );
      });

    pageColumnsApi.coverInstant = () => {
      gsap.killTweensOf(columns);
      gsap.set(columns, { scaleY: 1, yPercent: 0 });
    };

    pageColumnsApi.reveal = () =>
      new Promise<void>((resolve) => {
        const tl = gsap.timeline({ onComplete: resolve });
        tl.to(columns, {
          yPercent: -100,
          duration: pageColumnRevealDuration,
          ease: pageColumnRevealEase,
          stagger: pageColumnStagger,
          overwrite: true,
        });
      });
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[200] flex"
    >
      {Array.from({ length: pageColumnCount }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) columnsRef.current[i] = el;
          }}
          className="h-full flex-1 origin-bottom scale-y-0 bg-black"
        />
      ))}
    </div>
  );
}
