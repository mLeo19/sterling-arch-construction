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

// PageTransition's incoming-pane rise, used both for a real client-side
// navigation and (gated behind the intro loader's own `ready` flip) for the
// very first page - translateY *and* scale together (an earlier version of
// this comment claimed translateY-only "confirmed by direct frame-by-frame
// observation," which was wrong: re-verified live against fluid.glass's
// actual current site with an rAF/computed-style poll on their own pane
// element, its transform is matrix(0.8, 0, 0, 0.8, 0, <viewportHeight>) the
// instant it appears, animating to matrix(1,0,0,1,0,0) at rest - scale
// 0.8 -> 1 and translateY 100% -> 0 together, not a pure slide). See
// pageSlideScaleFrom below for the matching scale constant. No backdrop
// behind the margin that scale leaves while below 1 - fluid.glass has one
// (a permanently-dark element sitting behind their own single shared
// pane), but this project's two-slot design keeps the *real* outgoing page
// visible underneath instead of unmounting it, so that margin already
// shows real content on its own; a backdrop on top of that read as the
// whole screen blacking out before the new page slides over it, not as a
// pane. The outgoing page itself *does* darken during the transition now
// though (see pageOutgoingDarkenOpacity below) - a different thing from
// that rejected backdrop: it dims the old page in place, in whatever
// margin is showing around the incoming pane, rather than covering the
// screen with a separate dark layer - added because two pages sharing the
// same light background (e.g. About -> Contact, both cream) made the
// incoming pane's own rise unreadable as a pane at all, reading instead as
// the new page's text just appearing on its own.
//
// Duration itself is also slower than this project's first attempt - 0.65s
// read as noticeably snappier than fluid.glass's own ~1s rise, and even
// after matching that measured ~1s rise (plus its own further ~0.3s hold,
// below) directly, live user feedback on the actual running site was still
// "too quick" - bumped again past the originally-measured fluid.glass
// benchmark itself on the strength of that direct feedback, which takes
// priority over an earlier automated measurement.
export const pageSlideDuration = 1.25;

// How long PageTransition's incoming pane sits fully offscreen before its
// rise tween actually starts, racing the new page's own priority-image
// decode against this timeout (see PageTransition.tsx) - loosely anchored
// to fluid.glass's own observed ~0.3s hold at full offscreen scale, then
// (like pageSlideDuration above) nudged past that measured number on
// direct live feedback that the whole transition still read as too fast.
export const pageSlideHoldDuration = 0.35;

// Total worst-case time from navigation (or, for the very first page, the
// intro loader's `ready` flip) to the incoming pane actually settling -
// hold plus the rise itself. Anything outside PageTransition that needs to
// stay hidden/un-revealed until the pane has actually covered the screen
// should delay by this, not guess its own number - see Footer.tsx's own
// crossfade, which does exactly that.
export const pageTransitionSettleDuration =
  pageSlideHoldDuration + pageSlideDuration;

// Starting scale of PageTransition's incoming pane (animates to 1 as it
// rises) - fluid.glass's own literal value, see pageSlideDuration's doc
// comment above for how this was confirmed.
export const pageSlideScaleFrom = 0.8;

// How dark PageTransition's outgoing-page snapshot gets tinted (a plain
// black overlay faded in on top of it, see PageTransition.tsx) over the
// course of the transition - not full black, just enough contrast that
// the old page visibly recedes even against an incoming page sharing the
// same light background, without reading as the screen blacking out the
// way a full-opacity cover would.
export const pageOutgoingDarkenOpacity = 0.55;

// How long the intro loader's own overlay (the cream BrandMark/wordmark
// screen, see IntroSequence.tsx) takes to fade itself out of the way once
// liftoff fires. Purely about that overlay's own dismissal speed now - it
// used to also stand in for "how long until the first page's content is
// actually visible" (back when the first page had no pane rise of its own
// and just sat there, statically revealed as this fade cleared), but the
// first page now rises as the exact same pane every other navigation uses
// (gated on the same `ready` flip this overlay's own fade starts from), so
// anything timing itself off "when is the page visible" should use
// pageSlideDuration instead, same as a real navigation - see Hero.tsx and
// WordReveal.tsx.
export const introFadeOutDuration = 0.5;

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
