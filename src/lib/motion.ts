// Shared GSAP easing tokens, reused across every hand-tuned timeline in this
// project (intro loader, nav, page transition) so a curve change only needs
// to happen in one place.
export const ease = {
  outQuart: "power4.out",
  outCubic: "power3.out",
  inOutCubic: "power3.inOut",
  inOutQuart: "power4.inOut",
  transition: "power4.inOut",
} as const;

export const duration = {
  fast: 0.4,
  base: 0.7,
  slow: 1.1,
} as const;

// PageTransition's incoming-pane rise/scale, shared so other components can
// time their own entrance relative to when that pane actually settles.
export const pageTransition = {
  initial: { yDuration: 0.9, scaleDuration: 1.3, scaleOffset: 0.4 },
  subsequent: { yDuration: 0.65, scaleDuration: 0.9, scaleOffset: 0.28 },
} as const;

// The pane's y-rise and scale-grow run concurrently (scale starting
// scaleOffset seconds in, see PageTransition.tsx), so the pane is fully
// settled once whichever of the two finishes last - not simply their sum.
export function pageTransitionSettleTime(isInitialLoad: boolean) {
  const cfg = isInitialLoad ? pageTransition.initial : pageTransition.subsequent;
  return Math.max(cfg.yDuration, cfg.scaleOffset + cfg.scaleDuration);
}

// When the pane's rise (not its scale-grow tail) finishes - the moment it
// reads as "arrived," even though scale keeps subtly growing a bit after.
// Content riding inside the pane (Hero's headline, RevealOnScroll items)
// times its own entrance off this rather than the full settle, so it's
// already underway while the pane is still finishing its final grow
// instead of queued entirely behind it.
export function pageTransitionRiseTime(isInitialLoad: boolean) {
  return (isInitialLoad ? pageTransition.initial : pageTransition.subsequent).yDuration;
}

// Whether the app's one-time initial-load PageTransition has already played
// in this session. A plain mutable object, not React state/context - a
// freshly-remounted page component (Hero's text reveal, RevealOnScroll)
// reads it synchronously in its own entrance effect to pick initial- vs
// subsequent-load timing.
//
// Safe to read without any real data flow: React runs a descendant's
// effects before an ancestor's for the same commit, so on the one
// navigation where this actually matters (the very first, where
// PageTransition and a freshly-readied child both react to the same
// `ready` flip), the child's read happens first and still sees the correct
// answer - the untouched `false` default *is* "this is the initial load".
export const pageTransitionState = { hasPlayedInitial: false };

// The clip-mask reveal used for the intro loader's wordmark letters (each
// letter in its own overflow-clip box, sliding up from yPercent: 100,
// staggered left to right) and reused as-is for the hero headline's own
// reveal, just at word granularity instead of letter granularity - sharing
// these values is what makes the two actually read as "the same animation"
// rather than two similar-looking but independently-tuned ones.
export const staggerReveal = {
  duration: 0.85,
  stagger: 0.04,
  ease: "power2.out",
} as const;

// SiteNav's own entrance timing (rise, width-grow, icon slide, label
// reveal, burger-line reveal), hoisted here so Hero's text-reveal timing
// can be derived from the nav's *actual* settle time (see
// navEntranceSettleTime/heroTextBudget below) instead of two independently
// hand-tuned numbers that have to be kept in sync by hand.
export const navEntrance = {
  delay: 0.5,
  riseDuration: 1.0,
  growDuration: 1.3,
  growStartRatio: 0.6, // growStart = riseDuration * growStartRatio
  growEase: "power3.out",
  iconDuration: 1.1,
  labelDuration: 1.1,
  burgerDuration: 0.6,
  burgerStagger: 0.05,
  burgerLineCount: 3,
  sharedStart: 1.6,
} as const;

export function navEntranceSettleTime() {
  const n = navEntrance;
  const growStart = n.riseDuration * n.growStartRatio;
  return (
    n.delay +
    Math.max(
      n.riseDuration,
      growStart + n.growDuration,
      n.sharedStart + n.iconDuration,
      n.sharedStart + n.labelDuration,
      n.sharedStart + n.burgerDuration + n.burgerStagger * (n.burgerLineCount - 1)
    )
  );
}

// How much time a hero text element gets to run, starting at `startDelay`,
// so it still finishes marginBeforeNavSettle seconds before the nav's own
// entrance settles - computed from the nav's actual settle time so
// retiming either side later can't silently reopen this gap the way it did
// once already (see the doc comment on navEntrance above).
export function heroTextBudget(startDelay: number, marginBeforeNavSettle = 0.2) {
  return Math.max(0.15, navEntranceSettleTime() - startDelay - marginBeforeNavSettle);
}
