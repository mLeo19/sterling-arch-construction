"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { site } from "@/lib/data/site";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useIntroReady } from "@/components/motion/IntroSequence";
import {
  ease,
  heroTextBudget,
  pageTransitionRiseTime,
  pageTransitionState,
  staggerReveal,
} from "@/lib/motion";

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const specialtyRef = useRef<HTMLDivElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const ready = useIntroReady();

  useGSAP(
    () => {
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReducedMotion) return;

      // Spans the whole section (now taller than one viewport, since the
      // specialty/description block below adds its own natural height on
      // top of the pinned-100svh hero content) - the backdrop should keep
      // drifting for as long as any of it is on screen.
      const parallaxTrigger = {
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom top",
        scrub: true,
      };

      // The image wrapper is 150% of the hero's height and centered on it
      // (top: -25%), so it overhangs by 25% above and below. A yPercent
      // swing of Y moves the wrapper by Y% of its *own* height (150%), so
      // the actual pixel travel is Y*1.5 - that has to stay under the 25%
      // overhang or the image's edge pulls into view. At Y=15 that's 22.5%,
      // leaving a small safety margin. (The previous ±10 swing used a
      // smaller 130%/-15% wrapper sized the same way - overhang had to grow
      // together with the swing here, not just the swing alone, or this
      // stronger parallax would expose gaps at the top/bottom edges.)
      gsap.fromTo(
        imageWrapperRef.current,
        { yPercent: -15 },
        { yPercent: 15, ease: "none", scrollTrigger: parallaxTrigger }
      );

      // No manual cleanup needed: useGSAP's scope automatically reverts every
      // tween and ScrollTrigger created above when the component unmounts.
    },
    { scope: sectionRef }
  );

  // Text entrance, gated on the intro loader's liftoff (`ready`) so it plays
  // once the incoming page is actually visible, not hidden behind the intro
  // overlay. A deliberate enhancement beyond fluid.glass's own hero, whose
  // heading has no independent animation at all - it's static text that
  // simply becomes visible as its own page-pane rises over it.
  useGSAP(
    () => {
      if (!ready || !headlineRef.current) return;
      const words = headlineRef.current.querySelectorAll("[data-word]");
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReducedMotion) {
        gsap.set([topBarRef.current, ctaRef.current], { opacity: 1 });
        // y, not yPercent - see the main entrance effect's own doc comment
        // below on why mixing yPercent with this element's SSR-rendered raw
        // transform (also translateY, also parsed by GSAP into its `y`
        // bucket) would add to it instead of clearing it.
        gsap.set(words, { y: 0 });
        gsap.set(specialtyRef.current, { opacity: 1, y: 0 });
        return;
      }

      // This whole section is rendered inside PageTransition's contentRef -
      // the exact element that component translates/scales as its incoming
      // pane (see PageTransition.tsx). Times off pageTransitionRiseTime (the
      // pane's Y-rise only), not its full settle (rise AND scale-grow) - see
      // that function's own doc comment in lib/motion.ts for why.
      //
      // Branches on whether THIS mount is the initial load or a later
      // client-side navigation, via pageTransitionState (lib/motion.ts) -
      // the pane's own rise is faster on a subsequent navigation (~0.65s)
      // than the initial load (~0.9s, slower there because it's also racing
      // the intro loader's liftoff).
      const isInitialLoad = !pageTransitionState.hasPlayedInitial;
      const pageRevealDelay = pageTransitionRiseTime(isInitialLoad);
      const topBarDelay = pageRevealDelay;
      const headlineDelay = pageRevealDelay + 0.1;

      // heroTextBudget derives a *ceiling* for each element here from the
      // nav's own actual settle time (navEntranceSettleTime, see
      // lib/motion.ts), so the hero text keeps finishing before the nav
      // does even if either side's timing changes later. These are
      // ceilings, not targets: each element uses its own natural duration
      // (the same 0.9s as the top bar always has, the same staggerReveal
      // values the loader's wordmark uses) and only compresses below that
      // if the budget genuinely can't fit it.
      const NATURAL_DURATION = 0.9;
      const topBarBudget = heroTextBudget(topBarDelay);
      const headlineBudget = heroTextBudget(headlineDelay);
      const topBarDuration = Math.min(NATURAL_DURATION, topBarBudget);
      const specialtyDuration = Math.min(NATURAL_DURATION, headlineBudget);

      // Top bar (title + "Get a Quote") fades in on its own, independent of
      // the headline timeline below - it's hidden behind the intro overlay
      // the whole time anyway, so there's nothing to see until that lifts
      // regardless of exactly when this finishes.
      gsap.fromTo(
        [topBarRef.current, ctaRef.current],
        { opacity: 0 },
        { opacity: 1, duration: topBarDuration, ease: ease.outQuart, delay: topBarDelay }
      );

      // Each word is its own mask reveal, pushed down inside its own
      // overflow-clip box in the JSX below (translateY(100%), rendered
      // there directly so it's already the SSR-painted pose - see that
      // JSX's own doc comment), then slides up into view - the same
      // technique, duration, and stagger as the intro loader's wordmark
      // letters (see IntroSequence.tsx and staggerReveal in lib/motion.ts),
      // just at word granularity instead of letter granularity - scaled
      // down from those values only if headlineBudget can't fit them at
      // full size, keeping the same duration:stagger ratio throughout so a
      // compressed cascade still reads the same way, just faster.
      //
      // No gsap.set(words, {yPercent: 100}) here, and the tween below
      // animates `y`, not `yPercent` - both deliberately. GSAP treats
      // x/xPercent and y/yPercent as independently tracked and *additive*
      // (intentional, documented - e.g. xPercent:-50 plus an extra x for a
      // pixel nudge). The JSX's raw CSS transform is the only thing ever
      // setting this element's pose before this tween runs, so GSAP caches
      // it as a `y` (pixel) value the first time it touches the element - a
      // `yPercent` set on top would add to that instead of overwriting it,
      // landing at double the intended offset. Animating `y` instead
      // targets the same bucket GSAP already cached the SSR pose into, so
      // it cleanly overwrites down to 0.
      const naturalWordsTotal =
        staggerReveal.duration + staggerReveal.stagger * (words.length - 1);
      const wordScale = Math.min(1, headlineBudget / naturalWordsTotal);
      const wordDuration = staggerReveal.duration * wordScale;
      const wordStagger = staggerReveal.stagger * wordScale;

      // The specialty block starts at the same moment as the headline (not
      // after), fading and sliding up together with it. A short 0.1s
      // stagger after the top bar gives a layered feel.
      const tl = gsap.timeline({ delay: headlineDelay });
      tl.to(words, {
        y: 0,
        duration: wordDuration,
        ease: staggerReveal.ease,
        stagger: wordStagger,
      }).fromTo(
          specialtyRef.current,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: specialtyDuration, ease: ease.outQuart },
          0
        );
    },
    { scope: sectionRef, dependencies: [ready] }
  );

  return (
    // No fixed height on the section itself - it's exactly as tall as its
    // content (the pinned-100svh hero block below, plus the specialty/
    // description block's own natural height), so the backdrop photo and
    // parallax cover however tall that ends up being.
    <section ref={sectionRef} className="relative overflow-hidden">
      <div
        ref={imageWrapperRef}
        className="absolute inset-x-0 top-[-25%] h-[150%] w-full"
      >
        <Image
          src="https://images.unsplash.com/photo-1758846946188-12316e71c680?q=90&w=3840&auto=format&fit=crop"
          alt="Detail view of a glass and steel building facade with an exposed staircase structure, next to a textured concrete block building"
          fill
          priority
          quality={90}
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {/* Gradient overlay keeps the white text readable over any part of the photo */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />

      <div ref={contentRef} className="relative h-[100svh]">
        {/* Top bar: company title + a quote link, mirroring fluid.glass's
            own site-wide header row - scoped to the hero only for now, not
            a persistent layout element. */}
        <div
          ref={topBarRef}
          className="absolute inset-x-0 top-0 flex justify-center px-6 pt-6 opacity-0 sm:pt-8"
        >
          <span className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {site.shortName}
          </span>
        </div>
        <Link
          ref={ctaRef}
          href="/contact"
          className="absolute top-6 right-6 hidden items-center gap-2 font-mono text-xs tracking-[0.12em] text-white/80 uppercase opacity-0 transition-colors duration-300 hover:text-white sm:inline-flex sm:top-8"
        >
          <span aria-hidden>↳</span>
          Get a Quote
        </Link>

        {/* The headline IS the tagline (not the company name repeated - the
            top bar above already carries the name), set in a lighter weight
            and anchored toward the bottom third of the viewport rather than
            dead-centered - matching fluid.glass's own proportions, not just
            borrowing its individual pieces. No button here: fluid.glass's
            hero body has no CTA either - its only "Get a Quote" lives in the
            top bar (desktop) and the menu panel, both already wired up. */}
        <div className="flex h-full flex-col items-center justify-end px-6 pb-40 text-center sm:pb-48">
          <h1
            ref={headlineRef}
            className="max-w-3xl text-3xl leading-tight font-medium text-white sm:text-5xl md:text-6xl"
          >
            {/* Per-word mask reveal: each word gets its own overflow-clip
                box and slides up from behind it. Word granularity, not
                per-line - this tagline has no fixed line breaks, so it
                reflows at different widths and staggering by line would
                mean guessing break points that drift out of sync. Not
                per-letter either (despite the intro loader's wordmark
                using that, see staggerReveal in lib/motion.ts) - too busy
                across a full sentence. The space between words is a plain
                text node outside any clip box, so line-wrapping at word
                boundaries is untouched.

                translateY(100%) rendered here directly rather than only
                via the entrance effect's gsap.set - the server-rendered
                HTML would otherwise paint fully visible before GSAP ever
                runs, so every word would flash in at rest before snapping
                to its hidden pose and sliding back up. */}
            {site.tagline.split(" ").map((word, i) => (
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
          </h1>
        </div>

        {/* Mobile-only scroll cue, matching fluid.glass (hidden at sm: and
            above there too - desktop relies on the visible parallax instead). */}
        <span className="absolute inset-x-0 bottom-28 text-center font-mono text-[11px] tracking-[0.2em] text-white/50 uppercase sm:hidden">
          Scroll to explore
        </span>
      </div>

      {/* Specialty/description block, still over the hero photo rather than
          a separate section with its own background - matches fluid.glass,
          where this same divider-eyebrow-paragraph pattern sits in the
          extra height below their pinned headline, before a true new
          section (their own "About" block) begins. */}
      <div
        ref={specialtyRef}
        className="relative px-6 pt-16 pb-24 opacity-0 sm:px-10 sm:pt-20 sm:pb-32"
      >
        <div className="mx-auto max-w-2xl border-t border-white/15 pt-10 sm:pt-14">
          <Eyebrow tone="light">Construction Specialists</Eyebrow>
          <p className="mt-6 text-lg text-white/80 sm:text-xl">
            We design and build architectural structures for ambitious
            commercial and residential projects. Every build reflects our
            commitment to precision, durability, and craft.
          </p>
        </div>
      </div>
    </section>
  );
}
