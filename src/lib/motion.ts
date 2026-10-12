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

// SiteNav's own entrance timing (rise, width-grow, icon slide, label
// reveal, burger-line reveal), hoisted here so Hero's text-reveal timing
// can be derived from the nav's *actual* settle time (see
// navEntranceSettleTime/heroTextBudget below) instead of two independently
// hand-tuned numbers that happen to line up today. That's what drifted out
// of sync the first time: Hero's text was retimed to wait for
// PageTransition's pane without rechecking it against the nav's own
// (separately-tuned) finish time, and ended up finishing *after* the nav
// instead of before it - backwards from fluid.glass, where the hero text
// finishes clearly before the nav does.
// growStartRatio raised from 0.33 and growDuration/growEase both slowed -
// at the old values the pill's short, collapsed state was barely visible
// before the width-grow took over, and expo.out's extremely front-loaded
// curve meant most of that grow's visual distance happened in its first
// ~30%, reading as "pops straight to full width" rather than a perceptible
// elongation. Direct comparison against the live fluid.glass site called
// this out specifically: its short pill visibly rises into place *first*,
// and only *then** elongates, as two distinct beats - power3.out keeps the
// deceleration but far less extreme than expo.out, so the growth itself
// reads as a continuous, visible motion rather than an instant snap.
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
