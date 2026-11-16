// Shared GSAP easing tokens, reused across every hand-tuned timeline in this
// project (intro loader, nav, page transition) so a curve change only needs
// to happen in one place.
export const ease = {
  outQuart: "power4.out",
  outCubic: "power3.out",
  // A genuinely gentler out-curve than outCubic above despite the name
  // similarity - GSAP's "power3" is quartic-strength, not cubic, so
  // outCubic's actual deceleration is steeper/shorter-tailed than its name
  // implies. outSoft is true cubic (power2), which is what a short (~0.4s)
  // fade+rise needs to read as smooth motion rather than a near-instant pop
  // followed by a barely-visible tail - see RevealOnScroll.tsx.
  outSoft: "power2.out",
  inOutCubic: "power3.inOut",
  inOutQuart: "power4.inOut",
  transition: "power4.inOut",
  // GSAP's closest token to plain CSS "ease-in-out" - used for the menu's
  // page-dimming backdrop (see MenuOverlay.tsx), matching fluid.glass's own
  // `transition: opacity 1s ease-in-out` on that element exactly.
  inOutSoft: "power1.inOut",
} as const;

export const duration = {
  fast: 0.45,
  base: 0.7,
  slow: 1.1,
} as const;

// The vertical-columns page-transition wipe (PageTransitionColumns.tsx):
// pageColumnCount columns span the viewport, each springing up from the
// bottom (scaleY 0 -> 1, staggered left to right) to fully cover the
// screen; the real route swap happens underneath while completely hidden;
// then every column slides straight up and off-screen (yPercent 0 -> -100,
// same left-to-right stagger order) to reveal the new page. Deliberately
// not a browser-API-driven crossfade/snapshot and not a transform-based
// rising pane (both tried earlier in this project's history, both the
// source of every real-device-only bug this project ever chased - wrong-
// content flashes, scroll corruption, a white flash from a browser-engine
// timing gap, a mask shape distorting on a phone's aspect ratio). Columns
// are a solid, opaque, purely decorative overlay that never touches,
// clones, or measures the actual page content - structurally, none of
// that entire bug class is possible here, since nothing about the real
// page's own DOM or scroll state is ever read or depended on.
//
// Values tuned by direct feedback on the live site, not derived from any
// external reference - this isn't chasing fluid.glass's own look anymore.
export const pageColumnCount = 12;
// A fixed TOTAL stagger spread (0.4s - the original, separately-tuned
// value from this project's first version of this exact mechanism, which
// used 6 columns at a flat 0.08s stagger each: 0.08*5=0.4), divided across
// however many columns there are - not a flat per-column stagger. Bumping
// pageColumnCount alone (6 -> 12, user's explicit request) while leaving a
// flat per-column stagger fixed would silently double the group's own
// total spread on every cover()/reveal() call, stacking with the fixed
// cover/reveal durations below to push a single full cycle from ~2.15s to
// ~3.5s worst-case. That's long enough for a real, not-even-rare user
// interaction - clicking a second link before the first settles - to slip
// past this file's own re-entrancy guard (see queuedHrefRef's doc comment
// in PageTransition.tsx for the bug that surfaced from exactly this).
// Keeping the group's own total spread constant regardless of column
// count means a future column-count change can't silently reopen that
// same timing problem.
export const pageColumnStagger = 0.4 / (pageColumnCount - 1);
export const pageColumnCoverDuration = 0.65;
export const pageColumnRevealDuration = 0.7;
export const pageColumnCoverEase = "back.out(1.4)";
export const pageColumnRevealEase = "power3.inOut";

// How long PageTransition waits, once the new route has committed (still
// fully hidden behind the still-covering columns), for that page's own
// non-lazy images to decode before calling pageColumnsApi.reveal() - races
// the decode against this timeout so one slow image can't hold the
// columns closed indefinitely either.
export const pageRevealHoldDuration = 0.35;

// Total worst-case time from a freshly-mounted page's own entrance effects
// starting (right as the route commits, still hidden behind the columns)
// to the LAST column fully clearing the screen - the decode-race hold
// above, plus the reveal animation's own duration, plus its staggered
// tail. Anything that needs to stay hidden/un-revealed until the columns
// have actually cleared should delay by this, not guess its own number -
// see Hero.tsx, WordReveal.tsx, RevealOnScroll.tsx. Kept under the name
// pageSlideDuration (not renamed to something column-specific) since
// every one of those call sites already imports it under this name and
// the columns *do* slide - reveal() is a literal yPercent translate, not
// just a figure of speech.
export const pageSlideDuration =
  pageRevealHoldDuration +
  pageColumnRevealDuration +
  pageColumnStagger * (pageColumnCount - 1);

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
//
// onNavigate: an optional callback SiteNav registers itself into (and
// PageTransition calls, right as it intercepts a real internal link click -
// see handleClick) so the mobile menu can close itself *immediately*,
// un-animated, the instant any navigation starts - not just ones triggered
// by clicking a link inside the open MenuOverlay panel itself. That used to
// be the only path (an onNavigate prop threaded through to each of
// MenuOverlay's own links), which missed every other way a navigation can
// start while the menu happens to be open: the home logo (never inside
// MenuOverlay - it's SiteNav's own pill) and Footer's own separate set of
// links are the two confirmed-live cases. Both are clicks PageTransition's
// own document-level capture-phase listener sees regardless of where they
// live in the tree, making its handleClick the one universal place this
// actually needs to be announced from. A plain nullable callback here
// rather than a new pub/sub system - there's only ever one SiteNav mounted,
// so one slot is all this needs.
export const pageTransitionState: {
  hasPlayedInitial: boolean;
  onNavigate: (() => void) | null;
} = { hasPlayedInitial: false, onNavigate: null };

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
