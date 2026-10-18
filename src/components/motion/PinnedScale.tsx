"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";

export function PinnedScale({
  src,
  alt,
  children,
}: {
  src: string;
  alt: string;
  children?: React.ReactNode;
}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current || !frameRef.current) return;
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReducedMotion) {
        gsap.set(frameRef.current, { scale: 1, borderRadius: 0 });
        return;
      }

      gsap.fromTo(
        frameRef.current,
        { scale: 0.6, borderRadius: 32 },
        {
          scale: 1,
          borderRadius: 0,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom bottom",
            scrub: true,
          },
        }
      );
    },
    { scope: sectionRef }
  );

  return (
    <div ref={sectionRef} className="relative h-[200svh] bg-black">
      <div className="sticky top-0 flex h-svh items-center justify-center overflow-hidden">
        {/* scale/borderRadius rendered directly here, not only applied
            later by gsap.fromTo's own "from" values above - this section is
            below the fold at scroll 0 (progress 0, i.e. this exact pose),
            so without this the server-rendered HTML paints at its natural
            scale(1)/no-radius state first, then snaps down once hydration
            catches up. */}
        <div
          ref={frameRef}
          className="absolute inset-0 h-full w-full overflow-hidden will-change-transform"
          style={{ transform: "scale(0.6)", borderRadius: 32 }}
        >
          <Image src={src} alt={alt} fill sizes="100vw" className="object-cover" />
          <div className="absolute inset-0 bg-black/50" />
        </div>
        {children}
      </div>
    </div>
  );
}
