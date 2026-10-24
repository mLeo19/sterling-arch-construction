"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Studied from fluid.glass's own /approach hero via its exact scroll choreography
 * (stepped through their live site frame by frame, reading computed transform/
 * clip-path values, not guessed from video): the image block is inset from the
 * viewport edges on all sides (their own `.assets` measured at ~95% viewport
 * width, padded top/bottom too), and it's sticky-pinned - scrolls normally
 * with the page (non-parallax) right up until it reaches the top of the
 * viewport, at which point it STOPS moving vertically entirely. Only once
 * stuck does it zoom in slightly while a line-drawing layer wipes away to
 * reveal the real photo beneath - both driven by the same scroll-linked
 * progress, so they finish together. Once released, the SAME photo keeps
 * drifting with a parallax drag as the page scrolls into the next section,
 * rather than snapping straight to the page's own scroll rate.
 *
 * Pinned via the sticky-wrapper technique PinnedScale.tsx and
 * ApproachProcess.tsx already use elsewhere in this project - a tall
 * wrapper plus a `sticky top-0 h-svh` inner viewport - NOT ScrollTrigger's
 * own `pin: true`. That was tried first and genuinely breaks on this site:
 * PageTransition.tsx's `release()` leaves the page's root content wrapper
 * with an explicit (if visually neutral) `y:0 / scale:1` transform applied
 * via gsap.set rather than cleared - and any ancestor with a live CSS
 * `transform`, even an identity one, creates a new containing block for
 * `position: fixed` descendants. `pin: true` relies on genuine fixed
 * positioning to track the real viewport; under that transformed ancestor
 * it was instead pinning relative to the page wrapper's own box, which is
 * exactly what produced the "jumps, only partially reveals, shows a second
 * copy" breakage - not a scroll-math bug, a CSS containing-block one. Sticky
 * doesn't have this failure mode (it never needs genuine viewport-relative
 * fixed positioning), which is almost certainly the real reason those two
 * existing components already used it instead of pin:true.
 *
 * The trailing parallax doesn't need the pin to release early to work: a
 * sticky child exactly 1 viewport tall inside a wrapper exactly 2 viewports
 * tall unsticks at the precise moment it's still fully filling the
 * viewport (that's what makes the handoff seamless), and from there it
 * takes exactly one more viewport-height of ordinary scroll for it to fully
 * exit - scoping the drift tween to that same wrapper's own
 * "bottom bottom" -> "bottom top" range (immediately after the reveal
 * timeline's own "top top" -> "bottom bottom") lands it exactly in that
 * natural post-unstick exit window, no extra wrapper height required.
 *
 * An even earlier version of the drift used a second, separate image block
 * instead - visually two independent full crops of the same photo stacked
 * back to back, which read as the photo repeating rather than continuing.
 * Animating the same element's own transform for both phases removes that
 * seam entirely: there is only ever one <Image>.
 *
 * Their drawing is a custom-commissioned illustration matching their photo's
 * exact composition - we don't have an equivalent asset, so the "drawing" here
 * is generated from our own photo offline (scripts/bake-approach-sketch.mjs -
 * rerun it if the hero photo ever changes) using the standard "color dodge"
 * pencil-sketch technique, not live-rendered: a scroll-scrubbed clip-path on a
 * live-filtered layer forces the browser to recompute the filter every frame,
 * which measurably janked this exact page. The baked PNG has a real alpha
 * channel - flat regions (sky, smooth wall faces) are fully transparent, only
 * edges are opaque ink - so it sits directly over the page's own background
 * with no color-matching step, and the sky stays blank rather than filling
 * with faint contour noise the way a fully-opaque render would.
 */
export function ApproachHero({
  eyebrow,
  heading,
  intro,
  image,
  sketchSrc,
}: {
  eyebrow: string;
  heading: string;
  intro?: string;
  image: { src: string; alt: string };
  sketchSrc: string;
}) {
  const pinWrapRef = useRef<HTMLDivElement>(null);
  const maskRef = useRef<HTMLDivElement>(null);
  const imageLayerRef = useRef<HTMLDivElement>(null);
  const sketchRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (
        !pinWrapRef.current ||
        !maskRef.current ||
        !imageLayerRef.current ||
        !sketchRef.current
      )
        return;
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReducedMotion) {
        gsap.set(imageLayerRef.current, { scale: 1, yPercent: 0 });
        gsap.set(sketchRef.current, { clipPath: "inset(0% 0% 100% 0%)" });
        return;
      }

      // Zoom and reveal share one timeline, both starting at position 0 with
      // no explicit duration - GSAP's own default duration is identical for
      // both, so the timeline's total length (and therefore what "scrub"
      // maps the whole stuck scroll range onto) is the same for each, and
      // they finish together. Scoped to exactly the sticky child's own
      // stuck duration via the "top top / bottom bottom" convention already
      // used by PinnedScale.tsx and ApproachProcess.tsx - a 2x-viewport-tall
      // wrapper around a 1x-viewport-tall sticky child is always stuck for
      // precisely that range.
      //
      // The zoom targets imageLayerRef (the inner content), not maskRef
      // (the outer padded/rounded frame) - maskRef's own box, and therefore
      // the cream inset around it, must never change size. Scaling maskRef
      // itself instead was tried first: overflow-hidden there still clips
      // at its border edge, not its padding edge, so the growing image
      // visibly ate into the padding as it zoomed, reading as the inset
      // shrinking over the course of the scroll rather than staying put.
      // Scaling the already-oversized imageLayerRef just crops tighter
      // within maskRef's fixed window instead.
      gsap
        .timeline({
          scrollTrigger: {
            trigger: pinWrapRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
          },
        })
        .to(imageLayerRef.current, { scale: 1.06, ease: "none" }, 0)
        // Wipes the sketch layer's own bottom edge upward (the inset's
        // third value is the bottom cut), so the photo beneath is revealed
        // starting at the bottom of the frame first and finishing at the
        // top - matching fluid.glass's own wipe direction exactly.
        .to(sketchRef.current, { clipPath: "inset(0% 0% 100% 0%)", ease: "none" }, 0);

      // imageLayerRef is deliberately oversized relative to its
      // overflow-hidden parent (maskRef) - the same "overhang" technique
      // Footer.tsx uses for its own backdrop parallax - so there's real
      // image content above/below to reveal as it drifts, rather than
      // exposing empty space. Starts at yPercent 0 (exactly how the reveal
      // phase above leaves it) so there's no jump at the handoff, then
      // drifts as the page scrolls into the next section. See the doc
      // comment above for why "bottom bottom -> bottom top" on this same
      // wrapper is exactly the natural post-unstick exit window.
      //
      // Positive, not negative: once released, pinWrapRef itself is back in
      // normal flow and already scrolls up at the page's own 1:1 rate on
      // its own - a negative yPercent here would shift the image content up
      // too, stacking on top of that and making the photo exit faster than
      // the rest of the page. A positive yPercent shifts the content down
      // inside the still-scrolling-up box, partially counteracting its own
      // motion - that's what makes it lag behind (move slower than the
      // page) instead of racing ahead of it, matching fluid.glass's own
      // drag direction.
      //
      // How much it can lag is capped by the overhang built into
      // imageLayerRef's own sizing below (top-[-40%] h-[180%]) - shifting
      // the content down further than its own overhang exposes empty space
      // above it, so 22 here is close to that layer's actual safe maximum,
      // not an arbitrary number. Measured against page scroll afterward:
      // the image's own screen position now moves at roughly 60% of the
      // page's rate during this drift (vs. ~87% before), which is what
      // actually reads as "stuck" rather than merely lagging a little.
      gsap.fromTo(
        imageLayerRef.current,
        { yPercent: 0 },
        {
          yPercent: 22,
          ease: "none",
          scrollTrigger: {
            trigger: pinWrapRef.current,
            start: "bottom bottom",
            end: "bottom top",
            scrub: true,
          },
        }
      );
    },
    { scope: pinWrapRef }
  );

  return (
    <>
      <section className="bg-background px-6 pt-40 pb-16 sm:px-10 sm:pt-48 sm:pb-20">
        <div className="mx-auto max-w-4xl">
          <Eyebrow className="mb-6">{eyebrow}</Eyebrow>
          <SectionHeading>{heading}</SectionHeading>
          {intro ? (
            <p className="mt-6 max-w-xl text-base leading-relaxed text-black/70">
              {intro}
            </p>
          ) : null}
        </div>
      </section>

      <div ref={pinWrapRef} className="relative h-[200svh] w-full bg-background">
        <div className="sticky top-0 h-svh w-full overflow-hidden px-6 py-6 sm:px-10 sm:py-10">
          <div
            ref={maskRef}
            className="relative h-full w-full overflow-hidden rounded-sm"
          >
            <div
              ref={imageLayerRef}
              className="absolute inset-x-0 top-[-40%] h-[180%] w-full will-change-transform"
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                // Larger than the viewport on purpose, and more so on
                // narrow screens - `sizes` only ever communicates this
                // element's own CSS width, it has no way to know
                // object-cover is stretching a landscape photo to cover a
                // much taller box (imageLayerRef's own 180%-height
                // overhang, above). That crop factor is worse on mobile,
                // where viewports are both narrower (so the same stretch
                // ratio is needed from more height per unit width) and
                // the DPI is typically higher - this was the real source
                // of the blur reported there, not the image itself.
                sizes="(max-width: 640px) 320vw, 100vw"
                className="object-cover"
              />
              <div
                ref={sketchRef}
                aria-hidden
                className="absolute inset-0"
                style={{ clipPath: "inset(0% 0% 0% 0%)" }}
              >
                {/* The sketch PNG's sky is genuinely transparent (see its
                    own doc comment above), and without this, that
                    transparency would show the real photo sitting directly
                    underneath - sky "revealed" from the very first frame,
                    before any scroll. This cream backing sits behind the
                    sketch but inside this same clipped wrapper, so it wipes
                    away in lockstep with the sketch's own ink: before the
                    reveal, the whole frame (including sky) reads as paper;
                    the sky only ever shows real photo once the reveal
                    actually uncovers it, same as every other part of the
                    frame. */}
                <div className="absolute inset-0 bg-background" />
                <Image
                  src={sketchSrc}
                  alt=""
                  fill
                  sizes="100vw"
                  className="object-cover"
                  // Next's image optimizer re-encodes this to lossy WebP by
                  // default, which was corrupting this asset's color/alpha
                  // fidelity (confirmed: flattened its transparent sky to
                  // solid white). The source PNG is already a single,
                  // appropriately-sized, pre-baked static asset - there's
                  // nothing left for the optimizer to usefully do to it,
                  // only fidelity to lose.
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
