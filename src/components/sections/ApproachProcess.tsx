"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { processSteps } from "@/lib/data/approach";

const COUNT = processSteps.length;

/**
 * Studied from fluid.glass's own /approach "Our Process" section: a pinned
 * dark track that pans horizontally through numbered steps as the user
 * scrolls vertically, with a progress line filling in above it. Pinned via
 * the same sticky-wrapper technique PinnedScale.tsx already uses elsewhere
 * in this project (a tall relative wrapper + a `sticky top-0 h-svh` inner
 * viewport) rather than ScrollTrigger's own `pin: true` - no spacer-element
 * bookkeeping to keep in sync with Lenis, and it's already proven working
 * here via CraftShowcase.
 *
 * Desktop-only: a hijacked-scroll horizontal pan reads as broken on a touch
 * device (long pinned drag with no native momentum), so under 640px this
 * renders a plain stacked list instead, no GSAP involved at all.
 */
export function ApproachProcess() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!wrapRef.current || !trackRef.current || !progressRef.current) return;
      const isDesktop = window.matchMedia("(min-width: 640px)").matches;
      if (!isDesktop) return;

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReducedMotion) {
        // Matches PinnedScale.tsx's own reduced-motion precedent: freeze at
        // the resting pose rather than trying to also collapse the tall
        // sticky wrapper's height.
        gsap.set(trackRef.current, { xPercent: 0 });
        gsap.set(progressRef.current, { scaleX: 0 });
        return;
      }

      // xPercent is relative to the track's OWN width (400%, since it holds
      // COUNT panels at 100% each) - not a single panel - so shifting by
      // "one panel" is (100 / COUNT)% of the track's own box, not 100%.
      gsap.to(trackRef.current, {
        xPercent: -(100 / COUNT) * (COUNT - 1),
        ease: "none",
        scrollTrigger: {
          trigger: wrapRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          onUpdate: (self) => {
            gsap.set(progressRef.current, { scaleX: self.progress });
          },
        },
      });
    },
    { scope: wrapRef }
  );

  return (
    <>
      <div ref={wrapRef} className="relative hidden h-[500svh] bg-black sm:block">
        <div className="sticky top-0 h-svh w-full overflow-hidden">
          <div className="absolute inset-x-0 top-0 z-10 px-6 pt-10 sm:px-10 sm:pt-12">
            <Eyebrow tone="light">How we work</Eyebrow>
            <div className="mt-6 h-px w-full bg-white/15">
              <div
                ref={progressRef}
                className="h-full w-full origin-left scale-x-0 bg-white"
              />
            </div>
          </div>

          <div
            ref={trackRef}
            className="flex h-full"
            style={{ width: `${COUNT * 100}%` }}
          >
            {processSteps.map((step, index) => (
              <div
                key={step.label}
                className="flex h-full shrink-0 items-center px-6 sm:px-10"
                style={{ width: `${100 / COUNT}%` }}
              >
                <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 sm:grid-cols-2 sm:gap-16">
                  <div className={index % 2 === 1 ? "sm:order-2" : ""}>
                    <p className="font-mono text-[0.7rem] tracking-[0.14em] text-white/50 uppercase">
                      {step.label}
                    </p>
                    <h3 className="mt-4 text-3xl font-medium text-white sm:text-4xl">
                      {step.heading}
                    </h3>
                    <p className="mt-5 max-w-md leading-relaxed text-white/70">
                      {step.description}
                    </p>
                  </div>
                  <div
                    className={`relative aspect-[4/5] overflow-hidden rounded-sm ${
                      index % 2 === 1 ? "sm:order-1" : ""
                    }`}
                  >
                    <Image
                      src={step.image.src}
                      alt={step.image.alt}
                      fill
                      sizes="(min-width: 640px) 50vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-black px-6 py-20 sm:hidden">
        <Eyebrow tone="light" className="mb-10">
          How we work
        </Eyebrow>
        <div className="flex flex-col gap-14">
          {processSteps.map((step) => (
            <div key={step.label}>
              <div className="relative mb-6 aspect-[4/3] overflow-hidden rounded-sm">
                <Image
                  src={step.image.src}
                  alt={step.image.alt}
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
              </div>
              <p className="font-mono text-[0.7rem] tracking-[0.14em] text-white/50 uppercase">
                {step.label}
              </p>
              <h3 className="mt-4 text-2xl font-medium text-white">{step.heading}</h3>
              <p className="mt-3 leading-relaxed text-white/70">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
