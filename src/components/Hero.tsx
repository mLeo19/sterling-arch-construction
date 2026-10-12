"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { site } from "@/lib/data/site";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { useIntroReady } from "@/components/motion/IntroSequence";
import { ease, heroTextBudget, pageTransitionSettleTime, staggerReveal } from "@/lib/motion";

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

      // The image wrapper is 130% of the hero's height and centered on it
      // (top: -15%), so it overhangs by 15% above and below. Keeping the
      // swing within -10/+10 yPercent means both edges of the image always
      // stay past the hero's clipped bounds, which is what prevents gaps
      // from appearing above or below it while it drifts.
      gsap.fromTo(
        imageWrapperRef.current,
        { yPercent: -10 },
        { yPercent: 10, ease: "none", scrollTrigger: parallaxTrigger }
      );

      // No manual cleanup needed: useGSAP's scope automatically reverts every
      // tween and ScrollTrigger created above when the component unmounts.
    },
    { scope: sectionRef }
  );

  // Text entrance, gated on the intro loader's liftoff (`ready`) so it plays
  // once the incoming page is actually visible, not hidden behind the intro
  // overlay. Modeled on the equivalent reveal already built for Northfield's
  // own Hero - NOT fluid.glass's: directly polling fluid.glass's own <h1>
  // frame by frame (computed opacity/transform, through its entire page-pane
  // rise) showed the headline has no independent animation of its own at
  // all - it's static text that simply becomes visible as PageTransition's
  // pane rises over it (already built). Northfield's own code comment
  // claiming "matches fluid.glass" for this specific per-line mask reveal
  // doesn't hold up against that measurement. Built anyway, as a deliberate
  // enhancement in the same spirit/technique (translateY out of a clipped
  // box, not a fade) rather than fluid.glass's own literal behavior.
  useGSAP(
    () => {
      if (!ready || !headlineRef.current) return;
      const words = headlineRef.current.querySelectorAll("[data-word]");
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReducedMotion) {
        gsap.set([topBarRef.current, ctaRef.current], { opacity: 1 });
        gsap.set(words, { yPercent: 0 });
        gsap.set(specialtyRef.current, { opacity: 1, y: 0 });
        return;
      }

      // This whole section is rendered inside PageTransition's contentRef -
      // the exact element that component translates/scales as its incoming
      // pane (see PageTransition.tsx). That means the headline's own mask
      // reveal was, until this fix, playing *while the surrounding pane was
      // still rising and scaling into place* - two nested motions running
      // at once (the pane's own rise/grow, plus the headline's local slide),
      // reading as the text animating the instant the page itself starts
      // revealing rather than once it's actually settled.
      //
      // pageTransitionSettleTime always uses the *initial*-load figures
      // (~1.7s - the slower of the two cases) rather than branching on
      // which case this particular mount is: Hero has no way to know that
      // without new plumbing from PageTransition, and starting ~0.5s later
      // than strictly necessary on a subsequent navigation (~1.18s) is a
      // harmless, simple default - not a visible problem - next to the
      // complexity of threading that flag through.
      const pageRevealDelay = pageTransitionSettleTime(true);
      const topBarDelay = pageRevealDelay;
      const headlineDelay = pageRevealDelay + 0.1;

      // On fluid.glass, the hero text finishes clearly *before* the nav
      // does, not after - heroTextBudget derives the *ceiling* each element
      // here gets, from the nav's own actual settle time
      // (navEntranceSettleTime, see lib/motion.ts), so that stays true even
      // if either side's timing changes later. These are ceilings, not
      // targets, though: each element below uses its own natural duration
      // (the same 0.9s as the top bar always has, the same staggerReveal
      // values the loader's wordmark uses) and only compresses below that
      // if the budget genuinely can't fit it - rather than always scaling
      // to exactly fill whatever room is available, which is what made the
      // headline reveal feel noticeably rushed right after this budget
      // mechanism was first introduced (back when the nav's own settle time
      // was shorter, leaving a much tighter ceiling to compress into).
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

      // Each word is its own mask reveal, pushed down (yPercent: 100) inside
      // its own overflow-clip box in the JSX below, then slides up into
      // view - the same technique, duration, and stagger as the intro
      // loader's wordmark letters (see IntroSequence.tsx and staggerReveal
      // in lib/motion.ts), just at word granularity instead of letter
      // granularity - scaled down from those values only if headlineBudget
      // can't fit them at full size, keeping the same duration:stagger
      // ratio throughout so a compressed cascade still reads the same way,
      // just faster. That starting pose is set here, immediately and
      // outside the delayed timeline below - not as a queued .set() step
      // inside it. A queued .set() only executes once the timeline's
      // playhead reaches it, i.e. after the delay elapses, which left the
      // headline sitting fully visible in its resting position for that
      // whole window, then suddenly snapping down and re-animating up right
      // as the delay ran out - a flash-then-reveal glitch rather than a
      // clean reveal.
      gsap.set(words, { yPercent: 100 });
      const naturalWordsTotal =
        staggerReveal.duration + staggerReveal.stagger * (words.length - 1);
      const wordScale = Math.min(1, headlineBudget / naturalWordsTotal);
      const wordDuration = staggerReveal.duration * wordScale;
      const wordStagger = staggerReveal.stagger * wordScale;

      // The specialty block starts at the same moment as the headline (not
      // after), fading and sliding up together with it. A short 0.1s stagger
      // after the top bar, same layered feel as before this fix.
      const tl = gsap.timeline({ delay: headlineDelay });
      tl.to(words, {
        yPercent: 0,
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
        className="absolute inset-x-0 top-[-15%] h-[130%] w-full"
      >
        <Image
          src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2400&auto=format&fit=crop"
          alt="Low-angle view of modern glass skyscrapers against a dramatic sky"
          fill
          priority
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
                box, the word inside it (set to yPercent: 100 by the
                entrance effect above) slides up from behind it. Word
                granularity, not per-line like Northfield's two-line
                headline - this tagline has no fixed, hand-authored line
                breaks, so it reflows at different widths; staggering by
                line would mean guessing fixed break points that drift out
                of sync with how the text actually wraps on any given
                screen. Not per-letter either, despite that being what the
                intro loader's own wordmark does (see staggerReveal in
                lib/motion.ts, shared by both) - letter-by-letter reads fine
                for a two-word brand name but far too busy/slow across a
                full sentence. The space between words is a plain text
                node, outside any clip box, so normal line-wrapping at word
                boundaries is untouched. */}
            {site.tagline.split(" ").map((word, i) => (
              <Fragment key={i}>
                <span className="inline-block overflow-clip">
                  <span data-word className="inline-block">
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
