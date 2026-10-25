"use client";

import { createContext, useContext, useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { BrandMark } from "@/components/ui/BrandMark";
import { BrandCube } from "@/components/ui/BrandCube";
import {
  COLUMN_COUNT,
  COLUMN_STAGGER,
  REVEAL_DURATION,
  REVEAL_EASE,
} from "@/components/PageTransitionColumns";
import { site } from "@/lib/data/site";
import { ease, staggerReveal } from "@/lib/motion";

// BrandMark's hexagon measures 33 wide x 36 tall (viewBox units), not a
// perfectly regular hexagon's sqrt(3)/2 height-to-width ratio - this stretch
// corrects the cube's pre-rotation scale so its projected silhouette lands
// exactly on BrandMark's own outline (see the cubeScaleRef comment below).
const HEX_STRETCH = 33 / 36 / (Math.sqrt(3) / 2);

const IntroReadyContext = createContext(false);

export function useIntroReady() {
  return useContext(IntroReadyContext);
}

export function IntroSequence({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  return (
    <IntroReadyContext.Provider value={ready}>
      {children}
      <IntroLoader onReady={() => setReady(true)} />
    </IntroReadyContext.Provider>
  );
}

function IntroLoader({ onReady }: { onReady: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const cubeScaleRef = useRef<HTMLDivElement>(null);
  const cubeShapeRef = useRef<HTMLDivElement>(null);
  const flatIconRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);
  // This loader's own set of columns, matching PageTransitionColumns.tsx's
  // look/timing exactly but a separate DOM instance - that component's
  // columns have to sit above everything including SiteNav (z-[110]),
  // while these only ever need to sit above this overlay's own cube/
  // wordmark content, nested inside the overlay's own z-[100] stacking
  // context. Sharing the literal DOM nodes across both would mean picking
  // one z-index that satisfies both relationships, which these two don't.
  const columnsRef = useRef<HTMLDivElement[]>([]);

  useGSAP(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      gsap.set(overlayRef.current, { display: "none" });
      onReady();
      return;
    }

    // Rest orientation: rotationX=45, rotationY=-35.264 - the standard
    // "isometric cube" corner-on view (looking straight down the cube's own
    // body diagonal projects its 6 faces into a perfectly regular hexagon;
    // 35.264deg = arctan(1/sqrt(2))), so the cube's silhouette exactly
    // matches BrandMark's hexagon outline at rest - that's what makes the
    // hard-cut swap to the flat icon below read as seamless instead of a pop.
    //
    // These are GSAP property values, not the plain rotateX/rotateY angles
    // the math above gives directly - GSAP composes rotationX/rotationY as
    // if rotationX applies first and rotationY second (matching CSS
    // `rotateY(rotationY) rotateX(rotationX)` text order, not the order
    // you'd naively write them). Rotation isn't commutative, so the two
    // angles are solved for GSAP's actual application order, not just
    // plugged in from the isometric-angle math directly.
    const tl = gsap.timeline();

    tl.set(groupRef.current, { opacity: 0, x: 36 })
      // HEX_STRETCH squeezes the cube's Y axis pre-rotation (GSAP applies
      // scale before rotation, same order-dependence as above) - a
      // pre-rotation Y stretch is what ends up widening the *post-rotation*
      // horizontal axis, which is the one that needs to grow to match
      // BrandMark's slightly-non-regular hexagon.
      .set(cubeScaleRef.current, {
        scaleX: 0.25,
        scaleY: 0.25 * HEX_STRETCH,
        rotation: 90,
      })
      .set(cubeShapeRef.current, { rotationX: 1120, rotationY: 790 })
      .set(flatIconRef.current, { opacity: 0 });

    // Each wordmark letter is its own overflow-clip box (see the JSX below)
    // so they can reveal on a staggered start rather than as one block mask.
    const letters = wordmarkRef.current?.querySelectorAll("[data-letter]") ?? [];
    tl.set(letters, { yPercent: 100 });

    // CUBE_TUMBLE_DURATION: how long the cube's rotation/scale tweens run -
    // also when the hard-cut icon swap fires, since the swap has to land
    // exactly on the hexagon-matching rest orientation.
    const CUBE_TUMBLE_DURATION = 1.85;
    const SWAP_TIME = CUBE_TUMBLE_DURATION;
    const SWAP_DURATION = 0.2;
    // The reveal starts slightly before the rotation tween's own end label,
    // while power2.out still carries a little visible velocity - gluing it
    // to the exact end of an eased-out tween reads as a beat of dead air
    // before the next thing starts, since the eye perceives the tween as
    // "stopped" well before its timeline progress actually reaches 1.
    const REVEAL_START = CUBE_TUMBLE_DURATION - 0.15;
    const SLIDE_DURATION = 0.95;
    const WORD_LENGTH = site.shortName.length;

    tl.to(groupRef.current, { opacity: 1, duration: 0.12, ease: ease.outQuart }, 0)
      .to(
        cubeScaleRef.current,
        { scaleX: 1, scaleY: HEX_STRETCH, duration: CUBE_TUMBLE_DURATION, ease: "power2.out" },
        0,
      )
      .to(
        cubeShapeRef.current,
        {
          rotationX: 45,
          rotationY: -35.264,
          duration: CUBE_TUMBLE_DURATION,
          ease: "power2.out",
        },
        0,
      )
      // A hard cut, not a crossfade - the cube's rest silhouette already
      // matches the flat icon's hexagon exactly (see the rest-orientation
      // comment above), so nothing about the shape's boundary changes at
      // the swap; only the fill detail inside it does.
      .to(flatIconRef.current, { opacity: 1, duration: SWAP_DURATION, ease: "power1.out" }, SWAP_TIME)
      .to(cubeScaleRef.current, { opacity: 0, duration: SWAP_DURATION, ease: "power1.out" }, SWAP_TIME)
      // The lockup sliding left is what visibly makes room for the wordmark.
      .to(
        groupRef.current,
        { x: 0, duration: SLIDE_DURATION, ease: "power2.out" },
        REVEAL_START,
      )
      // Left-to-right via a staggered *start*, not a staggered duration -
      // every letter runs the same tween, they just kick off a beat apart
      // down the word.
      .to(
        letters,
        {
          yPercent: 0,
          duration: staggerReveal.duration,
          ease: staggerReveal.ease,
          stagger: staggerReveal.stagger,
        },
        REVEAL_START,
      )
      // Liftoff waits for whichever finishes last - the slide or the
      // staggered letter cascade - plus a short settle beat.
      .addLabel(
        "liftoff",
        Math.max(
          REVEAL_START + SLIDE_DURATION,
          REVEAL_START +
            staggerReveal.duration +
            staggerReveal.stagger * (WORD_LENGTH - 1),
        ) + 0.2,
      )
      .call(onReady, [], "liftoff")
      .set(overlayRef.current, { pointerEvents: "none" }, "liftoff")
      .to(
        groupRef.current,
        { y: -70, opacity: 0, duration: 1.0, ease: "power2.in" },
        "liftoff",
      )
      // The color shift still happens first, same as always - this briefly
      // reads as the loader settling into black before the page shows
      // through. What changed: the handoff to the real page now uses the
      // exact same vertical-columns reveal every other page-to-page
      // navigation uses (see PageTransitionColumns.tsx), not a fade -
      // columns snap straight to their fully-covering state (instant, no
      // animation) while still completely hidden behind this still-opaque
      // black overlay, which then disappears in the same tick. Both are
      // solid black at that exact instant, so the swap from "overlay" to
      // "columns, already covering" has no visible seam - the columns
      // then retract exactly as they would after any other navigation.
      .to(
        overlayRef.current,
        { backgroundColor: "#000000", duration: 1.0, ease: ease.outQuart },
        "liftoff",
      )
      .set(columnsRef.current, { scaleY: 1 }, "liftoff+=1.0")
      .set(overlayRef.current, { display: "none" }, "liftoff+=1.0")
      .to(
        columnsRef.current,
        {
          yPercent: -100,
          duration: REVEAL_DURATION,
          ease: REVEAL_EASE,
          stagger: COLUMN_STAGGER,
        },
        "liftoff+=1.0",
      );
  }, []);

  return (
    <div
      ref={overlayRef}
      aria-hidden
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background opacity-100"
    >
      <div ref={groupRef} className="flex items-center gap-4 opacity-0">
        <div className="relative h-14 w-14" style={{ perspective: 600 }}>
          <div
            ref={cubeScaleRef}
            className="absolute inset-0 flex items-center justify-center"
          >
            {/* BrandMark's hexagon renders at 56 * (36/42) =~ 48px tall
                inside this same 56px box (viewBox is 42 units, hexagon spans
                36 of them) - dividing by the ~1.633 height-per-edge ratio of
                the isometric projection above gives the cube edge length
                that lands the two exactly on top of each other. */}
            <BrandCube ref={cubeShapeRef} size={48 / 1.633} />
          </div>
          <div
            ref={flatIconRef}
            className="absolute inset-0 flex items-center justify-center opacity-0"
          >
            <div className="relative text-black">
              <BrandMark className="h-14 w-14" />
            </div>
          </div>
        </div>
        <div ref={wordmarkRef} className="flex font-sans text-4xl font-semibold text-black">
          {site.shortName.split("").map((char, i) => (
            <span key={i} className="inline-block overflow-clip">
              <span data-letter className="inline-block">
                {char === " " ? " " : char}
              </span>
            </span>
          ))}
        </div>
      </div>
      {/* z-10, not explicit stacking order against groupRef - a sibling
          without one would stack by DOM order by default anyway (this is
          already last), but spelling it out means a future reorder of
          this JSX can't silently break which one paints on top. Starts at
          scale-y-0 (hidden) and only ever becomes visible via the
          timeline's instant liftoff+1.0 set, never an animated entrance -
          unlike PageTransitionColumns.tsx's own columns, these never need
          to animate *in*, only snap to covering then animate back out. */}
      <div className="pointer-events-none absolute inset-0 z-10 flex">
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
    </div>
  );
}
