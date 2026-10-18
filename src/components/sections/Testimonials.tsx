"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { testimonials } from "@/lib/data/testimonials";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ease } from "@/lib/motion";

export function Testimonials() {
  const [index, setIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const total = testimonials.length;
  const current = testimonials[index];

  useGSAP(
    () => {
      if (!contentRef.current) return;
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.5, ease: ease.outQuart }
      );
    },
    { dependencies: [index], scope: contentRef }
  );

  function go(delta: number) {
    setIndex((prev) => (prev + delta + total) % total);
  }

  return (
    <section className="bg-white px-6 py-20 sm:px-10 sm:py-24">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between border-b border-black/10 pb-6">
          <Eyebrow>Client Stories</Eyebrow>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs tracking-[0.1em] text-black/50">
              {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous testimonial"
                className="flex h-9 w-9 items-center justify-center border border-black/15 text-black/60 transition-colors duration-300 hover:border-black hover:text-black"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next testimonial"
                className="flex h-9 w-9 items-center justify-center border border-black/15 text-black/60 transition-colors duration-300 hover:border-black hover:text-black"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {/* Hidden pose rendered directly here, not only applied later by
            gsap.fromTo's own "from" values above - without this the
            server-rendered HTML paints fully visible before hydration,
            then snaps to hidden and animates back in. Only matters for the
            very first mount; gsap.fromTo overwrites this inline style on
            every later slide change regardless. */}
        <div
          ref={contentRef}
          className="grid grid-cols-1 gap-8 pt-14 sm:grid-cols-[auto_1fr] sm:gap-14"
          style={{ opacity: 0, transform: "translateY(12px)" }}
        >
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-sm grayscale">
            <Image
              src={current.portrait.src}
              alt={`Portrait of ${current.name}`}
              fill
              sizes="128px"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-3xl leading-snug font-medium text-black sm:text-4xl">
              <span aria-hidden className="mr-1 text-black/30">
                &ldquo;
              </span>
              {current.quote}
            </p>
            <p className="mt-6 text-black">{current.name}</p>
            <p className="font-mono text-xs tracking-[0.08em] text-black/50 uppercase">
              {current.role}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
