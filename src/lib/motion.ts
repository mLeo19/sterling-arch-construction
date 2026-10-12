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
// time their own entrance relative to when that pane actually settles,
// instead of guessing at a disconnected delay. See the settle-time doc
// comment below and the one on the PageTransition call site in Hero.tsx.
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
