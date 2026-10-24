"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useGSAP } from "@gsap/react";
import { useIntroReady } from "@/components/motion/IntroSequence";
import { duration, ease, pageTransitionRiseTime, pageTransitionState } from "@/lib/motion";

export function RevealOnScroll({
  children,
  className = "",
  delay = 0,
  y = 18,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ready = useIntroReady();

  useGSAP(
    () => {
      if (!ready || !ref.current) return;
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      if (prefersReducedMotion) {
        gsap.set(ref.current, { opacity: 1, y: 0 });
        return;
      }

      // Gating on `ready` (above) stops this from finishing behind the
      // intro loader's own opaque overlay, but an above-the-fold instance's
      // ScrollTrigger is already satisfied the instant `ready` flips, so
      // its fade can still finish before PageTransition's pane has risen
      // far enough to show it. Delaying the start by the pane's own rise
      // time (pageTransitionRiseTime) closes that gap - same fix, same
      // reasoning as Hero.tsx's own text reveal.
      //
      // Scoped to only the instances that actually need it: elements
      // already inside the "top 85%" trigger zone at this exact moment
      // (mirroring the scrollTrigger start below), checked via a live
      // getBoundingClientRect read since scrollY is still 0 here (`ready`
      // flips before the user can have scrolled). A below-the-fold section
      // doesn't fire until real, later user scrolling reaches it - however
      // long after mount that happens to be - so it never needed this delay
      // at all. Applying it unconditionally to every instance (the previous
      // version) meant *every* section on the page, not just the one or two
      // above the fold, carried a fixed ~0.9s tax on top of its own
      // duration the instant its real trigger fired, which is what made
      // scrolling through the page read as sluggish.
      //
      // Also only on the initial load. On every subsequent navigation, an
      // above-the-fold trigger's first real fire already lands after
      // PageTransition's (much shorter) settle time on its own, via
      // ScrollTrigger's own refresh cycle - a just-created trigger's first
      // evaluation happens on the *next* refresh pass, not the synchronous
      // one PageTransition fires moments after creating it. Adding this
      // same delay to every navigation would just make an already-correct
      // case more sluggish for no reason.
      const isInitialLoad = !pageTransitionState.hasPlayedInitial;
      const startsAboveTheFold = ref.current.getBoundingClientRect().top <= window.innerHeight * 0.85;
      const pageRevealDelay =
        isInitialLoad && startsAboveTheFold ? pageTransitionRiseTime(true) : 0;
      // Quick, not a long settle - but outSoft (true power2/cubic), not the
      // steeper outCubic/outQuart tokens: those are quartic/quintic-strength
      // curves that front-load almost all of the motion into the opening
      // few frames at a duration this short, reading as a near-instant pop
      // rather than a smooth fade. outSoft keeps the same quick duration but
      // spreads the deceleration out enough to still read as motion.
      gsap.fromTo(
        ref.current,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: duration.fast,
          delay: pageRevealDelay + delay,
          ease: ease.outSoft,
          scrollTrigger: {
            trigger: ref.current,
            start: "top 85%",
            // Play once, never reverse - not just a UX call (an already-
            // revealed section shouldn't hide itself again just because the
            // user scrolled back up past it), but a correctness one: this
            // whole tree lives inside PageTransition's contentRef, which
            // calls ScrollTrigger.refresh() of its own accord mid-entrance
            // (both when it pins itself to position:fixed and again in
            // release(), see that file's own doc comments). Each refresh
            // recalculates this trigger's start/end against whatever
            // (possibly pinned/scaled) layout its ancestor has *right now*,
            // which can land this element on the wrong side of "start" for
            // a moment even though nothing the user did changed - with
            // "reverse" here, that moment is enough to hide an already-
            // played reveal and then replay it once the layout settles.
            // onLeaveBack set to "none" means there's nothing left to
            // reverse regardless of which side of "start" it transiently
            // lands on.
            toggleActions: "play none none none",
          },
        }
      );
    },
    // Gated on `ready` (IntroSequence's one-time intro-loader flag), not
    // just mount - without this, on a hard page load an above-the-fold
    // instance (its own ScrollTrigger "top 85%" already satisfied at
    // mount, scrollY still 0) fires and finishes its whole fade-in behind
    // the intro loader's opaque overlay, where the user never sees it.
    // Harmless no-op for every subsequent client-side navigation, where
    // `ready` is already true at mount.
    { scope: ref, dependencies: [ready] }
  );

  return (
    // Hidden pose rendered directly here, not only applied later by
    // gsap.fromTo's own "from" values inside the effect above - on a hard
    // page load the server-rendered HTML paints before hydration/GSAP ever
    // runs, so without this the content would flash in at rest, snap to
    // hidden, then fade in again instead of one clean reveal. Matching
    // gsap.fromTo's own from-state exactly means GSAP's effect taking over
    // later is a continuation, not a jump.
    <div ref={ref} className={className} style={{ opacity: 0, transform: `translateY(${y}px)` }}>
      {children}
    </div>
  );
}
