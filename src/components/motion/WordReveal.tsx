"use client";

import { Fragment, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { useIntroReady } from "@/components/motion/IntroSequence";
import {
  heroTextBudget,
  pageTransitionRiseTime,
  pageTransitionState,
  staggerReveal,
} from "@/lib/motion";

/**
 * Per-word mask reveal for a page's own heading - each word gets its own
 * overflow-clip box and slides up from behind it, gated on the intro
 * loader's liftoff and timed off PageTransition's rise (see Hero.tsx, which
 * this was extracted from - that file's doc comments cover the full
 * reasoning for this exact technique and are not repeated here).
 */
export function WordReveal({
  as: Tag = "h1",
  text,
  className = "",
}: {
  as?: "h1" | "h2";
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);
  const ready = useIntroReady();

  useGSAP(
    () => {
      if (!ready || !ref.current) return;
      const words = ref.current.querySelectorAll("[data-word]");
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReducedMotion) {
        gsap.set(words, { y: 0 });
        return;
      }

      const isInitialLoad = !pageTransitionState.hasPlayedInitial;
      const wordsDelay = pageTransitionRiseTime(isInitialLoad) + 0.1;
      const wordsBudget = heroTextBudget(wordsDelay);

      // Same duration:stagger ratio as staggerReveal always, only scaled
      // down together if the budget can't fit it at full size - see
      // Hero.tsx's own doc comment on this exact calculation.
      const naturalWordsTotal =
        staggerReveal.duration + staggerReveal.stagger * (words.length - 1);
      const wordScale = Math.min(1, wordsBudget / naturalWordsTotal);

      // y, not yPercent - the SSR-rendered translateY(100%) below is parsed
      // by GSAP into its `y` (pixel) cache the first time it touches this
      // element, and yPercent is a separate, additive bucket. See Hero.tsx's
      // doc comment for the full mechanism.
      gsap.to(words, {
        y: 0,
        duration: staggerReveal.duration * wordScale,
        ease: staggerReveal.ease,
        stagger: staggerReveal.stagger * wordScale,
        delay: wordsDelay,
      });
    },
    { scope: ref, dependencies: [ready] }
  );

  return (
    <Tag ref={ref} className={className}>
      {text.split(" ").map((word, i) => (
        <Fragment key={i}>
          <span className="inline-block overflow-clip">
            <span
              data-word
              className="inline-block"
              style={{ transform: "translateY(100%)" }}
            >
              {word}
            </span>
          </span>{" "}
        </Fragment>
      ))}
    </Tag>
  );
}
