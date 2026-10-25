"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";

export const COLUMN_COUNT = 6;
export const COLUMN_STAGGER = 0.08;
export const COVER_DURATION = 0.65;
export const REVEAL_DURATION = 0.7;
export const COVER_EASE = "back.out(1.4)";
export const REVEAL_EASE = "power3.inOut";

type ColumnsApi = {
  cover: () => Promise<void>;
  reveal: () => Promise<void>;
};

// Populated once this component mounts - it's rendered exactly once, at
// the root layout, and never unmounts, so PageTransition.tsx and
// IntroSequence.tsx can both call into it imperatively without either one
// owning the columns' own DOM/animation state. Default no-op
// implementations so a call before mount (shouldn't happen in practice -
// this mounts before any link can be clicked - but costs nothing to
// guard) doesn't throw.
export const pageColumnsApi: ColumnsApi = {
  cover: () => Promise.resolve(),
  reveal: () => Promise.resolve(),
};

/**
 * The vertical-columns wipe every page-to-page navigation uses, including
 * the intro loader's own liftoff handoff (see IntroSequence.tsx - it calls
 * this same cover()/reveal() pair rather than building its own separate
 * set, since these columns start at scale-y-0 and are invisible regardless
 * of z-index until cover() actually runs - there was never a real reason
 * for the loader to need its own copy). Each column springs up from the
 * bottom (transform-origin: bottom, scaleY 0->1) to cover the screen,
 * staggered left to right; once covered, the actual route swap (or, for
 * the intro loader, the real page simply becoming ready) happens
 * completely hidden underneath. To reveal, each column slides straight up
 * and off-screen, in the same left-to-right order it arrived in
 * ("first in, first out").
 *
 * cover()/reveal() are each built as a gsap.timeline() specifically so
 * their resolve() fires once, when the *whole* staggered group finishes -
 * onComplete passed directly into a staggered array tween fires once per
 * individual target instead (confirmed in GSAP's own source), which would
 * resolve on the first column's completion while the rest (delayed by
 * their own stagger offset) are still mid-animation - exactly the "new
 * page visible before covering finishes" bug this was built to prevent.
 *
 * A plain fixed overlay with a handful of div children, animated purely
 * via transform - deliberately not touching, cloning, or measuring the
 * actual page content at all (see PageTransition.tsx's own doc comment
 * for why that distinction matters: that's what made the previous hand-
 * rolled transition system fragile). This can't corrupt a ScrollTrigger,
 * race an image decode, or need z-index tricks against the live page's
 * own stacking - it's a solid, opaque box sitting above everything while
 * the real page quietly updates behind it.
 */
export function PageTransitionColumns() {
  const columnsRef = useRef<HTMLDivElement[]>([]);

  useGSAP(() => {
    const columns = columnsRef.current;
    if (!columns.length) return;

    pageColumnsApi.cover = () =>
      new Promise<void>((resolve) => {
        const tl = gsap.timeline({ onComplete: resolve });
        // yPercent reset folded into this same fromTo, not a separate
        // sibling .set() - reveal() leaves columns translated off the top
        // of the screen (yPercent: -100) once it finishes, and this tween
        // has to force that back to 0 before growing scaleY, or every
        // cover() after the first grows the columns to full scale while
        // they sit permanently off-screen - "fully covering" by scale
        // alone, invisible in practice. A separate `tl.set(columns,
        // {yPercent:0})` placed right before this call looks like it
        // should do that, but this tween's own `overwrite: true` kills
        // *every* existing tween on the target the instant it's created
        // (not just the ones touching scaleY) - including that sibling
        // .set(), which is already a constructed tween on this same
        // timeline by the time this one is built. It gets killed before
        // the timeline ever renders frame 0, so the reset silently never
        // happens. Setting both scaleY and yPercent as this one tween's
        // own "from" values sidesteps that: there's no sibling tween left
        // for overwrite to kill.
        tl.fromTo(
          columns,
          { scaleY: 0, yPercent: 0 },
          {
            scaleY: 1,
            duration: COVER_DURATION,
            ease: COVER_EASE,
            stagger: COLUMN_STAGGER,
            overwrite: true,
          },
        );
      });

    pageColumnsApi.reveal = () =>
      new Promise<void>((resolve) => {
        const tl = gsap.timeline({ onComplete: resolve });
        tl.to(columns, {
          yPercent: -100,
          duration: REVEAL_DURATION,
          ease: REVEAL_EASE,
          stagger: COLUMN_STAGGER,
          overwrite: true,
        });
      });
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[200] flex"
    >
      {Array.from({ length: COLUMN_COUNT }).map((_, i) => (
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
