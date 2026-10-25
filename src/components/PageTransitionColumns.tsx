"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";

// Shared by this component and IntroSequence.tsx's own matching columns
// (see that file - it builds its own identical set rather than reusing
// this component's actual DOM nodes, since the two need different
// z-index/stacking relationships: this one has to sit above everything
// including SiteNav, while the intro loader's needs to sit inside its own
// overlay, above its cube/wordmark but below nothing else exists yet to
// worry about at that point in the session).
export const COLUMN_COUNT = 6;
export const COLUMN_STAGGER = 0.06;
export const COVER_DURATION = 0.5;
export const REVEAL_DURATION = 0.55;
export const COVER_EASE = "back.out(1.4)";
export const REVEAL_EASE = "power3.inOut";

type ColumnsApi = {
  cover: () => Promise<void>;
  reveal: () => Promise<void>;
};

// Populated once this component mounts - it's rendered exactly once, at
// the root layout, and never unmounts, so PageTransition.tsx can call into
// it imperatively without owning any of the columns' own DOM/animation
// state itself. Default no-op implementations so a call before mount
// (shouldn't happen in practice - this mounts before any link can be
// clicked - but costs nothing to guard) doesn't throw.
export const pageColumnsApi: ColumnsApi = {
  cover: () => Promise.resolve(),
  reveal: () => Promise.resolve(),
};

/**
 * The vertical-columns wipe every page-to-page navigation uses: each
 * column springs up from the bottom (transform-origin: bottom, scaleY
 * 0->1) to cover the screen, staggered left to right: once covered, the
 * actual route swap happens completely hidden underneath. To reveal the
 * new page, each column slides straight up and off-screen, in the same
 * left-to-right order it arrived in ("first in, first out").
 *
 * A plain fixed overlay with a handful of div children, animated purely
 * via transform/opacity - deliberately not touching, cloning, or
 * measuring the actual page content at all (see PageTransition.tsx's own
 * doc comment for why that distinction matters: that's what made the
 * previous hand-rolled transition system fragile). This can't corrupt a
 * ScrollTrigger, race an image decode, or need z-index tricks against the
 * live page's own stacking - it's a solid, opaque box sitting above
 * everything while the real page quietly updates behind it.
 */
export function PageTransitionColumns() {
  const columnsRef = useRef<HTMLDivElement[]>([]);

  useGSAP(() => {
    const columns = columnsRef.current;
    if (!columns.length) return;

    pageColumnsApi.cover = () =>
      new Promise<void>((resolve) => {
        gsap.fromTo(
          columns,
          { scaleY: 0 },
          {
            scaleY: 1,
            duration: COVER_DURATION,
            ease: COVER_EASE,
            stagger: COLUMN_STAGGER,
            overwrite: true,
            onComplete: resolve,
          },
        );
      });

    pageColumnsApi.reveal = () =>
      new Promise<void>((resolve) => {
        gsap.to(columns, {
          yPercent: -100,
          duration: REVEAL_DURATION,
          ease: REVEAL_EASE,
          stagger: COLUMN_STAGGER,
          overwrite: true,
          onComplete: resolve,
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
