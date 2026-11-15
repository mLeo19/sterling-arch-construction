"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useIntroReady } from "@/components/motion/IntroSequence";
import { useLenis } from "@/components/SmoothScroll";
import {
  ease,
  pageOutgoingDarkenOpacity,
  pageSlideDuration,
  pageSlideHoldDuration,
  pageSlideScaleFrom,
  pageTransitionState,
} from "@/lib/motion";

/**
 * A link click leaves the outgoing page exactly where it is - still real,
 * still mounted, still fully live, no backdrop or overlay added behind it -
 * and slides the incoming page up from fully below the viewport, growing
 * from pageSlideScaleFrom to its full size as it rises to cover it,
 * fluid.glass's own effect (verified live, frame-by-frame, against their
 * actual current site - not the native View Transitions API, which an
 * earlier note in this project's history claimed but which no longer
 * matches what they actually ship). The still-visible outgoing page is
 * what shows through the margin the scale leaves around the incoming pane
 * while it's below 100% - an earlier version of this added a solid dark
 * backdrop there too (matching fluid.glass's own permanently-dark element
 * behind their single shared pane), but with a *real second page* already
 * sitting right there instead of fluid.glass's empty stage, that backdrop
 * just painted over it - the whole screen reading as blacking out first
 * and the new page sliding on top of that, not as a pane covering the old
 * one directly.
 *
 * The very first page (on a hard load, no prior page to leave in place) is
 * no exception to any of this - it rises as this exact same pane too, just
 * gated behind the intro loader's own `ready` flip instead of a real
 * navigation (see TransitionPane's own `ready` check below) so it stays
 * parked fully offscreen, unanimated, for as long as the intro loader's
 * opaque overlay is covering it anyway.
 *
 * This project already built and abandoned exactly this kind of pane once,
 * then replaced it with a vertical-columns wipe (PageTransitionColumns.tsx,
 * now itself removed in favor of this file) - git history around those
 * commits has the full story. Every bug
 * chased there traced back to one specific piece: the *outgoing* page had
 * to be DOM-cloned into a snapshot, because Next's App Router unmounts the
 * outgoing route immediately on navigation, leaving nothing real to show
 * underneath the rising pane otherwise. Cloning introduced an entire bug
 * class on iOS - compositor-layer promotion timing, cloned-<img> decode
 * races, a decode-wait that itself exposed a worse gap, position:sticky
 * freezing hacks. The *incoming* pane mechanic itself (real content,
 * position:fixed, translateY rise, image-decode-before-reveal) was never
 * the source of any of those bugs.
 *
 * This version eliminates the clone by never letting the outgoing page
 * disappear in the first place: `slotA`/`slotB` below hold the two pages
 * that can ever coexist during a transition as real, live React subtrees,
 * each in its own permanent, stable slot for its entire lifetime - a slot
 * is only ever created once (on its page's first commit) and removed once
 * (when a later navigation supersedes it), never "moved" from one slot to
 * another. That stability is what lets the outgoing page's own GSAP
 * contexts, ScrollTriggers, and scroll position stay untouched while it's
 * still visible underneath, and what lets the incoming page go from
 * "animating in" to "settled" without ever remounting (and thus without
 * replaying its own entrance reveals, which a snapshot-based or
 * re-render-based approach would have caused).
 */

type Entry = {
  id: number;
  children: React.ReactNode;
  // Always true now, including the very first entry (the page already
  // active when this component mounts) - it rises as the same pane every
  // other navigation uses too, just gated behind the intro loader's own
  // `ready` flip instead of starting immediately (see TransitionPane's own
  // `ready` check).
  animate: boolean;
};

// Measured once (via a throwaway, invisible scroll container - the
// standard technique) and cached at module scope for the rest of the
// session - a browser's own scrollbar width never changes mid-session, so
// there's nothing to gain re-measuring it on every navigation. Used by
// handleClick's own scrollContainer (see its doc comment) to size a
// scrollable clone wrapper wide enough to push its scrollbar outside the
// visible, clipped area. 0 on iOS/macOS's own overlay scrollbars - this
// still runs there, it just always returns 0.
let cachedScrollbarWidth: number | null = null;
function getScrollbarWidth(): number {
  if (cachedScrollbarWidth !== null) return cachedScrollbarWidth;
  const outer = document.createElement("div");
  outer.style.cssText =
    "visibility:hidden;overflow:scroll;position:absolute;top:-9999px;width:100px;height:100px;";
  const inner = document.createElement("div");
  inner.style.width = "100%";
  outer.appendChild(inner);
  document.body.appendChild(outer);
  cachedScrollbarWidth = outer.offsetWidth - inner.offsetWidth;
  document.body.removeChild(outer);
  return cachedScrollbarWidth;
}

// Replaces every <img> inside clonedRoot with a <canvas> painted from the
// *corresponding* (same document-order index - cloneNode(true) preserves
// structure 1:1, so liveRoot and clonedRoot's own img lists line up
// exactly) already-on-screen <img> in liveRoot - confirmed live, on an
// actual iPhone (never reproduced on desktop/headless Chromium or
// WebKit, including Playwright's own iPhone device profile): every image
// on the frozen snapshot (Footer's own backdrop photo, ApproachHero's two
// reveal layers, a services-grid thumbnail) was observed going fully
// blank for a beat and then popping back in, inconsistently - sometimes
// on one navigation, not the next, same code path. That's the signature
// of a genuine decode race, not a structural bug: cloneNode(true) copies
// an <img>'s attributes, but the *clone* is a brand-new DOM node with no
// decoded raster data of its own - it has to decode its own independent
// copy before painting anything, regardless of whether the exact same
// resource is already decoded and on-screen for the original <img> right
// next to it, and that decode is inherently async and device/cache-load
// dependent (explaining "sometimes, not always"). Drawing the live,
// already-decoded <img> directly onto a canvas sidesteps decoding
// entirely - canvas painting from an already-loaded image element is
// synchronous, nothing left to race. Every image on this site is
// self-hosted (same-origin), so none of these canvases are tainted.
//
// Only handles object-fit: cover/contain explicitly (replicating the
// crop/letterbox math CSS would have applied) since that's this site's
// dominant pattern (Next's Image + `fill` + `object-cover`, used for
// every photo this bug was ever observed on) - anything else falls back
// to a plain stretch-to-fill, which won't look identical but won't throw
// either.
function freezeClonedImages(liveRoot: HTMLElement, clonedRoot: HTMLElement) {
  const liveImgs = liveRoot.querySelectorAll("img");
  const clonedImgs = clonedRoot.querySelectorAll("img");
  const dpr = window.devicePixelRatio || 1;
  liveImgs.forEach((liveImg, i) => {
    const clonedImg = clonedImgs[i];
    if (!clonedImg || !liveImg.complete || liveImg.naturalWidth === 0) return;
    const rect = liveImg.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const canvas = document.createElement("canvas");
    // width/height *attributes* (the drawing buffer's own resolution,
    // scaled by dpr for crispness) - deliberately separate from the
    // element's *CSS* size, which comes entirely from cssText below
    // (Next's own `fill` prop inlines explicit `width:100%;height:100%`,
    // confirmed live - a bare <canvas> would otherwise render at its
    // width/height attributes verbatim in CSS px, not device px, which
    // without this would make a dpr > 1 canvas twice as large on screen
    // as intended).
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.className = clonedImg.className;
    canvas.style.cssText = clonedImg.style.cssText;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const fit = getComputedStyle(liveImg).objectFit;
    const srcW = liveImg.naturalWidth;
    const srcH = liveImg.naturalHeight;
    try {
      if (fit === "cover" || fit === "contain") {
        // Scale-to-fit then center, not a manually cropped source rect -
        // simpler and harder to get backwards than computing sx/sy/
        // sWidth/sHeight by hand (an earlier version did exactly that and
        // had the width/height cases swapped, confirmed live: painted a
        // single zoomed-in, nearly solid-color patch of the source image
        // instead of the correctly cropped photo). Letting
        // drawImage draw the *entire* source image at this scale, offset
        // to center it, relies on the canvas's own drawing surface
        // (exactly w*h, set above) clipping whatever falls outside it -
        // standard canvas behavior, not something this code has to
        // reimplement.
        const scale =
          fit === "cover"
            ? Math.max(w / srcW, h / srcH)
            : Math.min(w / srcW, h / srcH);
        const drawW = srcW * scale;
        const drawH = srcH * scale;
        ctx.drawImage(
          liveImg,
          (w - drawW) / 2,
          (h - drawH) / 2,
          drawW,
          drawH,
        );
      } else {
        ctx.drawImage(liveImg, 0, 0, w, h);
      }
    } catch {
      // Same-origin by construction (see doc comment above), but fail
      // safe rather than leave handleClick mid-navigation broken if that
      // assumption is ever wrong for some future image - the cloned <img>
      // just stays as a regular <img>, back to whatever decode timing it
      // would have had on its own.
      return;
    }
    clonedImg.replaceWith(canvas);
  });
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lenisRef = useLenis();

  // Starts at 1, not 0 - the first entry below is hardcoded to id 0 (a
  // lazy useState initializer counts as render, where refs can't safely be
  // read - see react-hooks/refs), so every id this ref ever hands out from
  // here on (inside effects, never during render) is naturally distinct
  // from it.
  const idRef = useRef(1);
  const [slotA, setSlotA] = useState<Entry | null>(() => ({
    id: 0,
    children,
    animate: true,
  }));
  const [slotB, setSlotB] = useState<Entry | null>(null);
  const [activeSlot, setActiveSlot] = useState<"A" | "B">("A");
  // Whether the spacer below needs to be reserving a full viewport of space
  // right now - true for as long as *some* entry (whichever slot it's in)
  // is still position:fixed/mid-rise, including the very first one (hence
  // starting true, not false). See the spacer's own doc comment for why
  // this has to be synchronous render-time state, not a layout effect.
  const [paneReserved, setPaneReserved] = useState(true);

  // Every currently-mounted TransitionPane's own root DOM node, keyed by
  // entry.id - registered/unregistered by TransitionPane itself below (see
  // its own registerNode prop). Exists purely so handleClick can grab the
  // *currently active* (outgoing) pane's real, already-rendered DOM right
  // before navigating away from it - see snapshotHostRef's own doc comment
  // for why.
  const paneNodesRef = useRef(new Map<number, HTMLDivElement>());
  // Mirrors "whichever entry.id activeSlot currently points to" for
  // handleClick below, the same reason routerRef exists above - that
  // effect attaches its listener exactly once (empty deps), so closing
  // over activeSlot/slotA/slotB directly would read whatever they were on
  // the very first render forever, never the current values.
  const activeIdRef = useRef<number | undefined>(0);
  useEffect(() => {
    activeIdRef.current = activeSlot === "A" ? slotA?.id : slotB?.id;
  }, [activeSlot, slotA, slotB]);

  // The outgoing slot's own locked height (see handleClick, where this is
  // set alongside the height lock itself) - also the document position the
  // spacer below gets inserted at, needed by the scroll-compensation layout
  // effect further down to know whether the user's current scroll position
  // is past that point.
  const lockedOutgoingHeightRef = useRef(0);

  // A plain, React-uncontrolled DOM container - rendered once, empty, and
  // never given React children afterward (nothing here is ever part of
  // JSX reconciliation; every node inside it is inserted/removed directly
  // via the DOM API in handleClick/handleSettled below). Holds a
  // cloneNode(true) snapshot of the outgoing page for the duration of a
  // transition - a *static* copy, not a live React subtree, which is the
  // whole point: entry.children, despite being "frozen" at the React
  // level (same element reference, entry objects never mutated), is NOT
  // actually immune to the route change. Next.js App Router's own routing
  // components live somewhere inside that tree and read the *current*
  // route from context, not from any prop this component controls -
  // context updates reach every consumer regardless of whether its own
  // parent element reference changed, so the "frozen" outgoing slot's
  // children silently re-render to match the *new* route the instant
  // pathname changes, well before the incoming pane has risen far enough
  // to cover it. Confirmed live via Playwright: tagging the outgoing
  // slot's own DOM node before a click and watching it in place (not a
  // new node - the same one) showed it switch from the old page's content
  // to the new page's, in full, with zero animation, ~150ms after the
  // click - while still sitting in plain position:relative normal flow,
  // never touched by the pane's own position:fixed/scale treatment at
  // all. That's what reads as "the next page appears instantly, then the
  // real transition starts" - not a timing race in the pane's own
  // animation (which was already starting from the correct hidden state
  // every time this was checked), but the *outgoing* page quietly turning
  // into the incoming one underneath it. A static clone, cloned before
  // the navigation that would trigger this even starts, can't do that -
  // it has no React component tree inside it at all, so there's nothing
  // left to re-render out from under it.
  const snapshotHostRef = useRef<HTMLDivElement>(null);

  // The trailing spacer's own DOM node (see its JSX further down) - read by
  // the scroll-compensation layout effect below to measure exactly how much
  // it actually grew by, rather than assuming any one viewport unit. Safe
  // to read in a *parent* layout effect despite this spacer's own doc
  // comment about ref-timing races in a *child's* layout effect on the very
  // first mount - this ref is only ever read on a paneReserved
  // false->true transition, which by definition can't be the very first
  // mount (paneReserved starts true), so the spacer element has already
  // existed since that first commit by the time this is ever read.
  const spacerRef = useRef<HTMLDivElement>(null);

  const transitioningRef = useRef(false);
  // See routerRef's equivalent in the click-listener effect below - reading
  // router through a ref it stays current with, rather than closing over
  // `router` directly, means that effect can stay attached exactly once
  // for this component's entire lifetime regardless of whether useRouter()
  // ever returns a new object identity across a navigation.
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  // Browser back/forward restores scroll position natively, synchronously,
  // as part of the browser's own history traversal - before any JS on this
  // page (including the popstate handler below, which needs the *outgoing*
  // page's own scrollY, not the destination's) ever runs. Left at its
  // default ("auto"), that native restoration would corrupt the popstate
  // handler's own scroll-alignment math with whatever scroll position the
  // destination route happened to have cached, read before this app's own
  // code gets a chance to see the real, current (outgoing) scrollY at all.
  // "manual" disables only the browser's own native auto-restore - it
  // doesn't stop this app's own settle-time scroll reset (see the
  // settleTick layout effect below), which already resets scroll to 0 on
  // every navigation regardless of how it started, keeping back/forward
  // consistent with every other nav in this app rather than introducing a
  // separate "restore where you were" behavior nothing else here has.
  //
  // This mount-time assignment only covers the window before the first
  // settle, not the rest of the session - see the settleTick layout
  // effect's own doc comment below for why this gets re-asserted there
  // too, every settle, not just once here.
  useEffect(() => {
    if (typeof history !== "undefined" && "scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  // Fires once React has actually committed a real navigation (pathname
  // genuinely changed), mounting the new route's children into whichever
  // slot isn't currently active. Scroll itself is already locked by the
  // time this runs (see snapshotOutgoingPage's own lock, below) - this
  // effect only ever reserves the spacer's own room, timed synchronously
  // with the incoming pane actually going position:fixed.
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (pathname === prevPathnameRef.current) return;
    prevPathnameRef.current = pathname;

    const nextSlot = activeSlot === "A" ? "B" : "A";
    const entry: Entry = { id: idRef.current++, children, animate: true };
    if (nextSlot === "A") setSlotA(entry);
    else setSlotB(entry);
    setPaneReserved(true);
    // children deliberately not a dependency - this effect has to run
    // exactly once per real pathname change and read whatever `children`
    // this render already carries (always the new route's content by the
    // time pathname has changed in the same commit), not on every
    // unrelated re-render a `children` dependency would also fire on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Compensates for the spacer below growing from 0 to one viewport tall
  // (paneReserved flipping true, same commit as the pathname-change effect
  // above) - without this, a user scrolled far enough down that Footer/
  // SiteNav were already in view sees them shoved a full viewport further
  // down the instant this spacer is inserted, while scroll stays frozen at
  // its old position: the viewport ends up looking at the newly-inserted,
  // empty spacer instead of either the (correctly still-frozen) outgoing
  // page or Footer - a flat, contentless hold screen for the whole rise.
  // Confirmed live via Playwright, worst case (scrolled all the way to a
  // page's own Footer, any link then clicked): completely blank.
  //
  // useLayoutEffect, not useEffect - needs to land in the same pre-paint
  // pass as the commit that actually grows the spacer, for the same reason
  // every other scroll adjustment in this file does.
  //
  // Only compensates when scrollY is already at or past
  // lockedOutgoingHeightRef.current - the document position the spacer is
  // inserted at (see that ref's own doc comment) - deliberately not
  // unconditionally: content positioned *before* that point never moves
  // when the spacer grows (it's inserted after it), so blindly shifting
  // scroll by a full viewport for every navigation would wrongly yank the
  // view for the overwhelmingly common case (scrolled somewhere in the
  // middle of a page, nowhere near its own Footer).
  const prevPaneReservedRef = useRef(paneReserved);
  useLayoutEffect(() => {
    const wasReserved = prevPaneReservedRef.current;
    prevPaneReservedRef.current = paneReserved;
    if (!paneReserved || wasReserved) return;

    // 2px tolerance, not a strict "<" - boundary comes from
    // getBoundingClientRect() (fractional) while window.scrollY is always a
    // whole pixel; a scroll position sitting fractionally below a
    // non-integer boundary (confirmed live: scrollY 2501 vs. boundary
    // 2501.203125) is still "at the bottom" for every practical purpose and
    // needs this compensation same as an exact or past match would.
    const boundary = lockedOutgoingHeightRef.current;
    if (window.scrollY < boundary - 2) return;

    // Measures the spacer's own real rendered height rather than assuming
    // window.innerHeight (what this used before) or any one CSS viewport
    // unit - confirmed live, on an actual iPhone, these can genuinely
    // disagree: Safari's dynamic toolbar collapsing/expanding right around
    // this exact moment (triggered by the same body overflow:hidden lock
    // that starts here) changes window.innerHeight and dvh independently of
    // each other for a frame or two, and even a few-pixel gap between the
    // delta applied here and the spacer's real height was visible on
    // device as a sliver of the page above Footer that shouldn't have been
    // there. Reading the spacer's own getBoundingClientRect() instead is
    // exactly correct by construction - it's not an estimate of how much
    // the document grew by, it IS how much the document grew by.
    const delta = spacerRef.current?.getBoundingClientRect().height ?? window.innerHeight;
    const lenis = lenisRef?.current;
    if (lenis) {
      // resize() first, always - Lenis tracks its own scroll limit
      // internally (recomputed off a ResizeObserver, async by nature) and
      // clamps every scrollTo() target to it, including forced/immediate
      // ones. The spacer just grew the real document in this exact commit;
      // without this, scrollTo() below clamps our target back down to
      // Lenis's own stale pre-growth limit and silently no-ops (confirmed
      // live - target ended up equal to Lenis's current target, which
      // scrollTo() treats as "already there"). resize() forces that limit
      // current synchronously, before the clamp runs.
      lenis.resize();
      lenis.scrollTo(window.scrollY + delta, { immediate: true, force: true });
    } else {
      window.scrollTo(0, window.scrollY + delta);
    }
  }, [paneReserved, lenisRef]);

  // Called by a slot's own TransitionPane once its rise animation (or its
  // instant reduced-motion equivalent) finishes - promotes it to active
  // and drops whatever the other slot was holding. Only sets state here;
  // the actual cleanup (ScrollTrigger.refresh, scroll reset, resuming
  // Lenis) happens in the layout effect below, *after* React has committed
  // that drop - calling ScrollTrigger.refresh() in this same synchronous
  // callback would still see the about-to-be-removed slot's own triggers,
  // since the unmount (and the context-revert that kills them) hasn't
  // actually happened yet at this point.
  //
  // settleTick, not activeSlot, is that layout effect's own dependency -
  // the one case setActiveSlot(slot) doesn't actually change activeSlot's
  // *value* is the very first entry (already slot "A" from its initial
  // state above) settling itself on a hard load, where slot is "A" and
  // activeSlot already was "A". React bails out of re-running an effect
  // whose dependencies didn't change value, so that one case would
  // silently skip the cleanup entirely (no ScrollTrigger.refresh() for a
  // page whose own Parallax, if any, was just measured while still
  // position:fixed) without a dependency guaranteed to change on *every*
  // call, settled or not.
  // Holds the settling pane's own DOM node (not just which slot it was in) -
  // see the layout effect below for why clearProps itself now happens here
  // instead of synchronously inside TransitionPane's own release().
  const pendingReleaseRef = useRef<HTMLDivElement | null>(null);
  const [settleTick, setSettleTick] = useState(0);
  function handleSettled(slot: "A" | "B") {
    // Idempotent after the first call (every later settle just reassigns
    // the same true) - this specifically marks the moment the very first
    // page's own pane has actually returned to normal flow, not just the
    // moment the intro loader's `ready` flip fired (a good ~1.25s earlier,
    // while that pane was still mid-rise and document.documentElement.
    // scrollHeight was still just a one-viewport placeholder - see
    // SiteNav.tsx's own "reached the bottom of the page" check, the thing
    // this exact distinction fixed a real bug in).
    pageTransitionState.hasPlayedInitial = true;
    const settledId = slot === "A" ? slotA?.id : slotB?.id;
    pendingReleaseRef.current =
      settledId !== undefined ? (paneNodesRef.current.get(settledId) ?? null) : null;
    setActiveSlot(slot);
    setSettleTick((t) => t + 1);
    setPaneReserved(false);
    if (slot === "A") setSlotB(null);
    else setSlotA(null);
    // The outgoing page's own static snapshot (see snapshotHostRef's doc
    // comment) has served its purpose the instant the incoming pane has
    // fully settled - the real, live page underneath is now exactly what
    // the snapshot was standing in for, so there's nothing left to hide.
    snapshotHostRef.current?.replaceChildren();
  }

  // useLayoutEffect, not useEffect - runs in the same pre-paint pass as the
  // React commit that unmounted the outgoing slot above, which is the whole
  // point: clearProps (returning the settled pane to normal flow), the
  // scroll-position reset, and that unmount all need to land in the same
  // frame, atomically, or whichever of them is left exposed for even one
  // frame shows through as a flash.
  //
  // clearProps itself used to run synchronously inside TransitionPane's own
  // release(), immediately on GSAP's onComplete - a direct DOM mutation
  // completely outside React's own render cycle, so it could (and,
  // confirmed live via Playwright, did) get painted on its own before the
  // scroll-reset/unmount below had actually committed and run. That one
  // frame showed the newly-unfixed pane in normal flow, in full, real
  // content - but with window.scrollY still wherever the *previous* page's
  // scroll lock had left it (e.g. scrolled to a tall About page's own
  // bottom), so whatever the new page's content happened to sit at that
  // same Y position flashed on screen for a frame (observed: a services
  // grid section) before this effect's own scroll reset snapped the view
  // back to the top. Doing clearProps here instead, in the same pass as
  // the reset, closes that gap - there's no longer a moment where the pane
  // is unfixed but the scroll position hasn't caught up yet.
  //
  // ScrollTrigger.refresh() has its own, separate reason to live here
  // specifically rather than inside release() too: a child with its own
  // topOfPage ScrollTrigger (Parallax.tsx) measures correctly from the
  // moment it's created, but only against this wrapper being
  // position:fixed - returning to normal flow makes that same measurement
  // stale until refresh() re-measures it, and a passive effect runs *after*
  // the browser has already painted that newly-unfixed, not-yet-refreshed
  // frame (confirmed live via Playwright: a Parallax hero's own position
  // jumping between two 8ms-apart samples) - a layout effect runs before
  // paint, so refresh() corrects it in the same frame instead.
  useLayoutEffect(() => {
    const el = pendingReleaseRef.current;
    if (!el) return;
    pendingReleaseRef.current = null;

    gsap.set(el, {
      clearProps:
        "position,top,left,right,height,overflow,y,scale,zIndex,willChange",
    });

    ScrollTrigger.refresh();

    const lenis = lenisRef?.current;
    if (lenis) {
      // force: true - Lenis's own scrollTo() silently no-ops while
      // isStopped (set by lenis.stop() during the lock above) unless
      // forced; start() isn't called until right after, so without this
      // the reset here would do nothing at all.
      lenis.scrollTo(0, { immediate: true, force: true });
      lenis.start();
    } else {
      window.scrollTo(0, 0);
    }
    document.body.style.overflow = "";
    transitioningRef.current = false;

    // Re-asserted here, every settle, not just once on mount (see that
    // effect's own doc comment above) - confirmed live: the mount-time
    // assignment alone measurably reverts to "auto" on its own, exactly in
    // step with this app's own router settling (visible as the moment
    // document.documentElement.scrollHeight jumps from its placeholder
    // height to the real page height) - almost certainly Next's own router
    // calling history.replaceState() to attach its segment-cache state to
    // the entry, which per spec resets that entry's own scroll restoration
    // mode back to "auto" regardless of what this app set it to earlier.
    // Confirmed this is what actually broke browser back: navigating away
    // and back after that reset let the browser's native scroll-restore
    // silently reassert the *previous* visit's scrollY on top of this
    // app's own lock mid-transition (overflow:hidden alone, per
    // snapshotOutgoingPage's own doc comment, never stops a programmatic
    // scroll change like this one, only user-gesture-driven scrolling) -
    // reproducible in plain Chromium, not a real-device-only bug. Setting
    // it again here, every settle (i.e. for every entry, right after
    // whatever Next just did to it), closes that window back up for the
    // *next* back/forward off this entry.
    if (typeof history !== "undefined" && "scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, [settleTick, lenisRef]);

  // Snapshots the current outgoing page - the clone/freeze/darken/height-
  // lock sequence that used to live directly inside handleClick below,
  // extracted so the popstate listener further down can give browser
  // back/forward navigations the exact same treatment. A plain function,
  // not useCallback - it only ever reads refs and globals (activeIdRef,
  // paneNodesRef, snapshotHostRef, lockedOutgoingHeightRef, window.*), never
  // props or state captured by value, so a fresh instance every render
  // behaves identically to every other - safe to call from either of the
  // two empty-deps effects below regardless of which render's instance they
  // actually closed over.
  //
  // Extracted after a real bug: browser back/forward bypasses handleClick
  // entirely (popstate fires without ever routing through a click), so
  // before this was pulled out, that one navigation path never got the
  // outgoing page cloned, frozen, or darkened at all - reproducing, every
  // time, exactly the "next page appears instantly, before the real
  // transition" bug this whole mechanism was built to prevent in the first
  // place (see snapshotHostRef's own doc comment), plus knock-on scroll/
  // layout symptoms (Footer momentarily disappearing) from the outgoing
  // page's height never getting locked either. Confirmed live: reproducible
  // on *every* back-button press, not intermittently - a structural gap in
  // coverage, not a timing race.
  function snapshotOutgoingPage() {
    // Locked here, synchronously, as the very first thing this function
    // does - not deferred to the pathname-change effect further down,
    // which used to be the only place this ran. That effect only fires
    // once React has actually committed the new route, which on a real
    // device can be several frames (or, unprefetched, much longer) after
    // this click/popstate - every one of those frames was a frame real
    // device scroll (trackpad glide, or specifically an iOS rubber-band
    // bounce-back still animating from an overscroll past the real
    // bottom of the page) was free to keep moving window.scrollY out from
    // under the clip-region measurement just below, which only ever reads
    // it once and bakes the result into a static height. Confirmed live,
    // on an actual iPhone, scrolled to the very bottom of a page (the one
    // case that measurement intentionally covers nothing at all, trusting
    // the real page underneath to stay put - see visibleCloneHeight's own
    // doc comment): tapping a menu link while that bounce-back was still
    // settling let scrollY drift back up after this point, exposing a
    // strip of the real outgoing page's own DOM the clip was never sized
    // to cover - and by the time that strip was exposed, it had already
    // silently re-rendered to the *new* route's content (see
    // snapshotHostRef's own doc comment on why that re-render happens at
    // all), reading as the new page's content flashing in before the
    // transition itself had even started.
    //
    // Both, not either/or: lenis.stop() alone only gates the gesture-
    // driven input paths it actually listens for (wheel/touch) - keyboard
    // scroll, a dragged scrollbar thumb, and middle-click autoscroll all
    // move window.scrollY natively, outside Lenis entirely, regardless of
    // whether it exists or is stopped. overflow:hidden is the only lock
    // that exists at all on a touch device - Lenis is never created there
    // (see SmoothScroll.tsx) - and still isn't a hard guarantee against
    // momentum already in flight at this exact instant on iOS, but moving
    // it this early removes by far the largest part of the window that
    // bug actually needed to reproduce.
    lenisRef?.current?.stop();
    document.body.style.overflow = "hidden";

    // Snapshot the currently-active (about-to-be-outgoing) pane's real DOM
    // *before* the route actually changes - see snapshotHostRef's own doc
    // comment for why this has to be a static clone, not a live React
    // subtree, and why it has to happen before navigating rather than after
    // (once pathname has already changed, the live version this clones from
    // may have already re-rendered to show the new route).
    const activeId = activeIdRef.current;
    const activeNode =
      activeId !== undefined ? paneNodesRef.current.get(activeId) : null;
    const host = snapshotHostRef.current;
    if (!activeNode || !host) return;

    // Measured once, up front - reused below both to size scrollContainer's
    // own padding (so its scrollable range covers the real scrollY even
    // past the clone's own content) and to lock activeNode's own
    // contribution to document flow (see that line's own doc comment
    // further down) - a single source of truth rather than measuring the
    // same box twice.
    const activeHeight = activeNode.getBoundingClientRect().height;

    // The snapshot mechanism went through several designs chasing bugs
    // in this same family - scrolled-down-page repros showing the
    // wrong content, or nothing, instead of what was actually on
    // screen - each confirmed live via Playwright or, for three of
    // them, only reproducible on an actual iPhone (desktop/headless
    // engines, including Playwright's own iPhone device profile,
    // missed all three - see [[feedback_real_device_testing_gap]] if
    // that memory still exists). The abbreviated history, oldest
    // first, in case a future bug traces back to one of these same
    // trade-offs:
    //   - position:fixed+inset:0 directly on the clone (not a separate
    //     wrapper) collapsed its own height to one viewport, clipping
    //     it to the wrong slice of its own content.
    //   - activeNode itself (the live, still-mounted outgoing slot)
    //     staying in normal flow let it silently re-render to the new
    //     route's content (the same context-propagation issue this
    //     whole clone mechanism exists to route around) and change its
    //     own real layout height, which shifted document scroll height
    //     and let the browser auto-clamp window.scrollY out from under
    //     a transform that assumed it wouldn't move. display:none was
    //     tried and made it worse (drops flow contribution to zero
    //     *before* the incoming-pane spacer grows to compensate).
    //     Fixed by locking activeNode's own height explicitly the
    //     instant it's cloned, below.
    //   - The incoming-pane spacer (PageTransition's own trailing
    //     return value) growing by a viewport to reserve its own room
    //     pushes Footer/SiteNav down by that same amount without
    //     scroll moving to compensate - fixed by a dedicated
    //     scroll-compensation layout effect elsewhere in this file.
    //   - A single blanket transform: translateY(-scrollY) on the
    //     whole clone (the original alignment mechanism here) is the
    //     wrong model for position:sticky content specifically - a
    //     *stuck* sticky element doesn't move 1:1 with scroll, so
    //     translating the entire clone by -scrollY yanked it away from
    //     its correct frozen position (ApproachHero's sketch-to-photo
    //     reveal - see that component's own doc comment on why it's
    //     sticky, not ScrollTrigger's pin:true). Replaced with a real
    //     scrollable container (scrollContainer below) whose actual
    //     scrollTop is set to the original scrollY - the exact state
    //     sticky is designed to resolve against, so the browser's own
    //     sticky logic gets it right for free, for any sticky
    //     descendant, with no manual math here at all. (overflow:hidden
    //     directly on activeNode, from the height-lock fix above, had
    //     the same disruptive effect on the *live* page's own sticky
    //     sections - removed; the height lock alone is sufficient.)
    //   - That real scrollTop then clamps to the clone's own content
    //     height same as any scrollable element would - a user
    //     scrolled far enough that Footer was already in view had
    //     their scrollTop silently clamped back up. A transparent
    //     padding element inside scrollContainer, sized to cover the
    //     shortfall so the real Footer showed through its own
    //     transparency, fixed this on desktop - but didn't hold up on
    //     an actual iPhone (Footer disappeared behind a blank, opaque-
    //     looking area instead, and separately, sticky content was
    //     observed flashing between unstuck and stuck right as the
    //     scrollTop below actually took effect) - both symptoms
    //     consistent with iOS Safari's own scroll-compositing
    //     behavior not reliably treating a freshly-scrolled container's
    //     "beyond its content" region as transparent, nor applying a
    //     scrollTop assignment on a freshly-inserted element
    //     synchronously the way desktop engines do.
    //
    // Current design, replacing the padding-spacer approach: rather
    // than ever asking any scrollable region to render transparently
    // past its own content, clipWrapper's own height is capped to
    // exactly how much of the *current* viewport the clone can
    // actually cover (visibleCloneHeight below) - for the rest of the
    // viewport, this mechanism doesn't paint anything at all, so the
    // real Footer shows through by simple absence, the same way any
    // element not covered by an overlay does, with no reliance on any
    // browser's particular scroll-compositing/transparency behavior.
    const visibleCloneHeight = Math.max(
      0,
      Math.min(window.innerHeight, activeHeight - window.scrollY),
    );
    const clipWrapper = document.createElement("div");
    clipWrapper.style.position = "fixed";
    clipWrapper.style.top = "0";
    clipWrapper.style.left = "0";
    clipWrapper.style.right = "0";
    clipWrapper.style.height = `${visibleCloneHeight}px`;
    // Clips scrollContainer's own scrollbar (deliberately made wider
    // than this wrapper below) back down to the viewport's real width -
    // this element's own overflow:hidden is purely a visual clip, not
    // what scroll-related calculations below resolve against (that's
    // scrollContainer, a separate, inner element).
    clipWrapper.style.overflow = "hidden";
    clipWrapper.style.zIndex = "5";
    clipWrapper.style.pointerEvents = "none";

    // getScrollbarWidth() (module scope, computed once and cached) -
    // widening this by exactly the scrollbar's own width and letting
    // clipWrapper's overflow:hidden above clip the excess is the
    // standard technique for a scrollable container with no visible
    // scrollbar, needed here since position:fixed+inset:0 alone
    // (clipWrapper) doesn't scroll - it just defines the viewport-sized
    // *visible* box. Zero-width on iOS/macOS's own overlay scrollbars,
    // where this doesn't matter at all; real elsewhere.
    const scrollContainer = document.createElement("div");
    scrollContainer.style.width = `calc(100% + ${getScrollbarWidth()}px)`;
    scrollContainer.style.height = "100%";
    scrollContainer.style.overflowY = "scroll";
    scrollContainer.style.overflowX = "hidden";
    scrollContainer.style.pointerEvents = "none";
    // Not load-bearing on modern engines (scrollTop assignment doesn't
    // need it) but harmless and a standing iOS Safari recommendation
    // for any genuinely scrollable element - kept as a defensive
    // nudge toward whatever scroll-compositing path it considers most
    // correct, given this exact element is where the "flash"
    // behavior above was observed.
    scrollContainer.style.setProperty(
      "-webkit-overflow-scrolling",
      "touch",
    );

    const clone = activeNode.cloneNode(true) as HTMLDivElement;
    // Explicit, absolute width - scrollContainer's own box (immediately
    // above) is deliberately wider than the real viewport to make room
    // for its scrollbar, and a plain block child with no width of its
    // own would inherit that same extra width via normal flow,
    // stretching the cloned page's own content slightly wider than it
    // actually rendered at. Pinning it to the real viewport width
    // directly avoids that distortion regardless of scrollContainer's
    // own padding-for-scrollbar width.
    clone.style.margin = "0";
    clone.style.width = `${window.innerWidth}px`;
    // See freezeClonedImages's own doc comment (module scope, above)
    // for why every image gets swapped for an already-painted canvas
    // here rather than staying a cloned <img> left to decode on its
    // own.
    freezeClonedImages(activeNode, clone);
    scrollContainer.appendChild(clone);
    clipWrapper.appendChild(scrollContainer);

    // See this block's own doc comment above (point 2) for why -
    // activeNode's real content is already safely captured in clone
    // above, so whatever it silently re-renders to from here no longer
    // needs to be seen. display:none was the first thing tried here
    // and made this specific repro worse, not better: it drops
    // activeNode's contribution to document flow to zero *immediately*,
    // before the spacer below has grown to compensate - and that
    // spacer only ever reserves room for the *incoming* pane's own
    // position:fixed (a flat one viewport), never for whatever
    // activeNode itself used to occupy (2501px in this repro) - so
    // display:none produced the exact same class of bug, just worse:
    // document height collapsing to one viewport flat, clamping
    // scrollY to 0 outright. Locking the height explicitly instead
    // keeps activeNode's own contribution to document flow exactly
    // what it already was at the moment of this click, permanently,
    // regardless of whatever its content silently re-renders to later
    // - nothing left to clamp scroll over. It doesn't need
    // visibility:hidden on top - clone above is a same-position
    // structural copy taken at this exact instant, already covering
    // precisely this box for as long as both exist.
    //
    // No overflow:hidden alongside the height, deliberately - an
    // earlier version of this added it too, to clip any visual bleed
    // if contaminated content later rendered taller than this locked
    // box. Confirmed live, on an actual iPhone: that broke every
    // position:sticky section on the frozen outgoing page (e.g.
    // ApproachHero's own sketch-to-photo reveal, see its own doc
    // comment on why it's sticky rather than ScrollTrigger's pin:true
    // in the first place) - sticky positioning resolves against the
    // nearest ancestor that establishes a scroll container, which
    // overflow:hidden does regardless of whether anything inside it
    // can actually scroll. Turning activeNode itself into that
    // ancestor, frozen with no real scroll happening inside it, read
    // as the sticky section either snapping out of its stuck position
    // or being clipped away entirely the instant a navigation started.
    // The height lock alone is already sufficient for the actual bug
    // this exists to fix (scroll auto-clamping off a changing document
    // height) - overflow was only ever a defensive extra for a visual
    // bleed scenario already covered by the clone sitting on top in
    // every case checked live, not worth this regression to keep.
    activeNode.style.height = `${activeHeight}px`;
    // Read by the spacer-growth scroll-compensation layout effect
    // below (see its own doc comment) - this is also, not
    // coincidentally, exactly the document position the spacer is
    // about to be inserted at, since the incoming pane contributes
    // nothing to flow.
    lockedOutgoingHeightRef.current = activeHeight;

    // A CHILD of clipWrapper, not a sibling with its own independent
    // inset:0 (an earlier version of this did exactly that) - position:
    // absolute inside clipWrapper (which, being position:fixed, is a
    // containing block for it) means this can only ever cover exactly
    // clipWrapper's own clipped region, inheriting visibleCloneHeight for
    // free with no separate calculation to keep in sync. The earlier
    // sibling version, with its own unconditional inset:0, darkened the
    // ENTIRE viewport regardless of how much (if any) of the outgoing
    // page the clone actually covered - confirmed live: scrolled fully
    // into Footer (clone correctly showing nothing, visibleCloneHeight
    // 0), this still slammed a 55%-opacity black rectangle across the
    // real, live Footer sitting right there, the instant a navigation
    // started, well before the incoming pane had risen at all. Darkening
    // content that was never part of the outgoing page's own area (not
    // "the thing being covered," just whatever happened to already be a
    // viewport scroll away) was never the intent - the whole point was
    // contrast between the outgoing and incoming PAGE, not a blanket
    // screen-wide dim independent of what's actually transitioning.
    //
    // Faded in via GSAP rather than set once at full strength - an
    // instant hard cut here read as exactly the "whole screen blacking
    // out" effect this project's own history already rejected once (see
    // pageOutgoingDarkenOpacity's doc comment in lib/motion.ts).
    //
    // Deliberately its own short duration/ease, not a match for the
    // incoming pane's own pageSlideHoldDuration+pageSlideDuration
    // timeline - the pane's own inOutQuart ramps up slowly by design
    // (that's what reads as a deliberate, weighted rise rather than a
    // twitch), but reusing that same slow-starting curve here left the
    // darken sitting at an imperceptible ~0.3% opacity a third of the
    // way into the transition, confirmed live via Playwright - exactly
    // backwards from the point of it, which is to give the viewer
    // *early* contrast that the outgoing page is the one leaving.
    // outQuart (fast start, settles quickly) over a flat, short
    // duration gets it to full strength while the incoming pane is
    // still mostly offscreen, then just holds there for the remainder
    // of the rise - the outgoing page doesn't need to keep darkening
    // once it's already unambiguous which page is which.
    const darken = document.createElement("div");
    darken.style.position = "absolute";
    darken.style.inset = "0";
    darken.style.pointerEvents = "none";
    darken.style.background = "#000";
    darken.style.opacity = "0";
    clipWrapper.appendChild(darken);
    host.replaceChildren(clipWrapper);
    // Forces layout before the scrollTop assignment below - a browser
    // doesn't necessarily know scrollContainer's own scrollable range
    // yet at the instant it's inserted (that requires having laid out
    // clone's real content height first), and a scrollTop assigned
    // before that's settled can silently clamp to whatever the browser
    // still thinks the range is (effectively 0) rather than erroring
    // or deferring - this read forces that layout pass to happen
    // synchronously, right here, before the assignment that depends on
    // its result. Confirmed live only on an actual iPhone (not any
    // desktop/headless engine, including Playwright's iPhone device
    // profile): without this, a sticky section's own on-screen
    // position flashed between its unstuck and correctly-stuck states
    // for a frame - stuck briefly resolving against scrollTop still 0,
    // then snapping once the real assignment actually took effect.
    void scrollContainer.offsetHeight;
    // This is what actually aligns scrollContainer's view with what
    // was on screen (see its own doc comment above) - scroll is about
    // to be locked for the rest of this transition anyway (both
    // document.body's own overflow:hidden below and Lenis.stop() in
    // the pathname effect), so this single assignment stays correctly
    // aligned for as long as it's needed, with no scroll listener
    // required.
    scrollContainer.scrollTop = window.scrollY;
    gsap.to(darken, {
      opacity: pageOutgoingDarkenOpacity,
      duration: pageSlideHoldDuration,
      ease: ease.outQuart,
    });
  }

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      event.preventDefault();
      if (transitioningRef.current) return;

      transitioningRef.current = true;

      // See snapshotOutgoingPage's own doc comment (above, before this
      // effect) for what this does and why it's shared with the
      // popstate listener further down.
      snapshotOutgoingPage();

      // Lets SiteNav close its mobile menu immediately, un-animated, if it
      // happens to be open right now - see pageTransitionState.onNavigate's
      // own doc comment in lib/motion.ts for why this has to fire from
      // here (the one listener that sees every real internal link click,
      // regardless of where in the tree it lives) rather than from
      // individual links. Deliberately before push() below, same as the
      // snapshot above - both need to land before anything about this
      // navigation becomes visible.
      pageTransitionState.onNavigate?.();

      // scroll: false - Next's own default push() behavior scrolls the
      // window to the top immediately on commit, which would yank the
      // *outgoing* page (still real, still visible, sharing this same
      // window scroll position while it sits underneath the incoming
      // pane) up to its own top before the user ever gets to see it slide
      // away. Scroll is reset to 0 on this app's own terms instead, once
      // the incoming page actually takes over - see handleSettled/the
      // pendingReleaseRef effect above.
      routerRef.current.push(url.pathname + url.search + url.hash, {
        scroll: false,
      });
    }

    // Capture phase so this always runs before Link's own click handling
    // and can preventDefault it, regardless of where in the tree that
    // handler is attached. Empty deps - attached exactly once; see
    // routerRef's own doc comment above.
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
    // snapshotOutgoingPage omitted deliberately, same as routerRef above -
    // it's a fresh closure every render, but one that only ever reads refs
    // (including lenisRef, exactly as stable as a literal useRef() despite
    // coming from useLenis() instead - the eslint rule just can't tell) and
    // globals, never a value that actually changes across renders, so every
    // render's instance behaves identically to every other.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Gives browser back/forward the exact same treatment as a real link
  // click above - see snapshotOutgoingPage's own doc comment for the bug
  // this fixes. popstate fires on window, not document (unlike click,
  // which this project deliberately listens for on document to catch
  // every link regardless of where in the tree it lives) - it isn't a
  // delegatable DOM event the way click is, there's exactly one to listen
  // for per navigation, dispatched directly on window.
  //
  // No router.push here, deliberately - unlike handleClick, which is
  // intercepting a click *before* any navigation has happened and has to
  // trigger one itself, popstate fires *after* the browser has already
  // traversed history and changed the URL. Next's own router has its own
  // independent popstate handling (wired up elsewhere, outside this
  // component entirely) that picks up the new pathname on its own from
  // here - this listener's only job is making sure the outgoing page gets
  // cloned/frozen/darkened first, before that happens, same as a click
  // would have. Can't preventDefault or otherwise delay/cancel a popstate
  // the way handleClick can a click - the history traversal this reacts to
  // has already happened by the time this fires, synchronously, as part of
  // the same browser operation. Running snapshotOutgoingPage() synchronously
  // inside this handler is still enough to win the race, though: Next's own
  // route-change commit (the thing this whole mechanism exists to get
  // ahead of) happens via a React state update, which can only flush on a
  // later tick than this event handler - this is the exact same ordering
  // handleClick already relies on between taking the snapshot and
  // router.push() causing a commit, just with the navigation itself
  // already unavoidably underway rather than yet to be triggered.
  //
  // transitioningRef's own guard is skipped if a real link click (or
  // another popstate) already started a transition in flight - there's no
  // way to cancel the browser's own history traversal at this point
  // either way, so the best this can do is avoid stacking a second,
  // conflicting snapshot/darken sequence on top of one already running.
  useEffect(() => {
    function handlePopState() {
      if (transitioningRef.current) return;
      transitioningRef.current = true;
      snapshotOutgoingPage();
      pageTransitionState.onNavigate?.();
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
    // snapshotOutgoingPage omitted deliberately - see the matching comment
    // on the click-listener effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // useCallback, not a plain function - it's a dependency of TransitionPane's
  // own registration layout effect below; a fresh function identity every
  // render would make that effect re-run (unregister then immediately
  // re-register the same node) on every unrelated render of this
  // component, not just when an entry actually mounts or unmounts.
  const registerNode = useCallback((id: number, el: HTMLDivElement | null) => {
    if (el) paneNodesRef.current.set(id, el);
    else paneNodesRef.current.delete(id);
  }, []);

  return (
    <>
      {/* Rendered once, as the very first thing here - never given React
          children of its own afterward (see its own doc comment above);
          first so its z-5 stacking naturally sits below both the outgoing
          slot's own normal-flow content and the incoming pane's z-10,
          exactly like a sibling inserted at this same point would. */}
      <div ref={snapshotHostRef} aria-hidden />
      {slotA && (
        <TransitionPane
          key={slotA.id}
          entry={slotA}
          registerNode={registerNode}
          onSettled={() => handleSettled("A")}
        />
      )}
      {slotB && (
        <TransitionPane
          key={slotB.id}
          entry={slotB}
          registerNode={registerNode}
          onSettled={() => handleSettled("B")}
        />
      )}
      {/* After both slots, not before - the outgoing slot is still in
          normal flow (real content, real height) for as long as it's
          visible underneath the rising pane. A spacer positioned *before*
          it would push that still-visible page down the instant it grows,
          replacing it with blank spacer space at the viewport's current
          scroll position - invisible at a glance in a scrolled-down repro,
          but total at scrollY 0 (navigating from the top of a page, the
          overwhelmingly common case): the whole point of this spacer is to
          reserve room for the *incoming* pane once it's position:fixed and
          contributing nothing to flow - placed after both slots, it only
          ever affects what comes after them (Footer/SiteNav), never the
          still-visible outgoing page before it. Confirmed live: this exact
          ordering bug was why the pane's rise read as "the new page's text
          just fades in" with no visible old-page-still-there seam - the
          old page was there, just scrolled out of view by this spacer.

          height driven by paneReserved (React state), not a ref + an
          imperative gsap.set() the way this used to work - that version
          set the height inside a *child* TransitionPane's own layout
          effect, which needed spacerRef.current to already be attached by
          the time it ran. React commits sibling fibers in document order,
          running each one's entire subtree (including its own layout
          effects) before moving to the next - and this spacer, being a
          *later* sibling of TransitionPane in this same return, hadn't
          been committed yet the one time that mattered: the very first
          page's own first-ever render, where spacerRef.current was still
          null when that layout effect ran. Every later navigation masked
          the bug - by then the spacer element already existed from the
          first commit, so a child reading spacerRef.current always found
          it. Confirmed live via Playwright: the real spacer (identified by
          its position right before <footer>, not any of this codebase's
          many *other* aria-hidden decorative elements) measured 0px
          through the entire intro buildup and pane rise on a hard load -
          Footer, right after it in flow, sat at the very top of the
          viewport instead of a full viewport down, visible through the
          still-fading intro overlay and then underneath the incoming
          pane's own rise. Computing the height declaratively here instead
          sidesteps the ordering question entirely - it's part of the same
          parent render as the pane's own initialStyle below, not a
          separate effect racing to attach a ref to a sibling. */}
      <div
        ref={spacerRef}
        aria-hidden
        style={{ height: paneReserved ? "100dvh" : 0 }}
      />
    </>
  );
}

function TransitionPane({
  entry,
  registerNode,
  onSettled,
}: {
  entry: Entry;
  registerNode: (id: number, el: HTMLDivElement | null) => void;
  onSettled: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Only matters for the very first entry (see the component doc comment
  // above) - every other entry is created by a real navigation, which only
  // ever happens after the intro loader has already run once, so `ready`
  // is already permanently true by the time those mount.
  const ready = useIntroReady();

  // Reports this entry's own root DOM node up to the parent (see
  // paneNodesRef's own doc comment) - a plain layout effect, not folded
  // into the rise effect below, so it registers (and stays registered)
  // regardless of whether this entry ever animates at all.
  useLayoutEffect(() => {
    registerNode(entry.id, ref.current);
    return () => registerNode(entry.id, null);
  }, [entry.id, registerNode]);

  // Fixed/offscreen positioning is applied here, synchronously, as part of
  // this component's very first render - deliberately not via gsap.set()
  // inside the effect below. React runs a *child's* layout effects before
  // its own parent's, for the same commit - a descendant with its own
  // top-of-page ScrollTrigger would otherwise measure itself while this
  // wrapper was still sitting in normal document flow, a beat before this
  // effect ever got a chance to make it position:fixed. An inline style
  // applied at render time is already in place before any layout effect
  // anywhere in the tree runs, so that measurement is at least taken
  // against the right *kind* of layout from the start. transform (not
  // GSAP's y) is fine to seed this way - GSAP parses an element's existing
  // inline transform into its own y bucket the first time anything touches
  // it via .to()/.set(), the same established pattern already used for
  // MenuOverlay's own links.
  //
  // That alone isn't fully sufficient, though: a live ScrollTrigger
  // measured while this wrapper is actually position:fixed can still read
  // a slightly different value than its eventual settled-into-normal-flow
  // measurement - confirmed live via Playwright on Parallax.tsx's own
  // topOfPage mode, a real but brief (single-frame) pop the instant this
  // pane settles and scroll resets. A fix deferring live-trigger creation
  // until settled was attempted and reverted - see Parallax.tsx's own doc
  // comment for why. Left as a known, minor follow-up.
  //
  // height: 100dvh, not 100svh - svh is pinned to the smallest possible
  // viewport (mobile browser chrome fully expanded), which under-covers
  // the real, current viewport the moment that chrome is already hidden
  // (e.g. after the user had scrolled on the outgoing page) - the pane
  // would then render shorter than the actual screen, leaving a gap at
  // the bottom showing the real page through underneath. dvh tracks the
  // current viewport live regardless of toolbar state.
  // translateY listed before scale, deliberately in that order - CSS
  // resolves transform functions left-to-right, so the translate happens in
  // the element's own unscaled pixel space (full viewport height) and scale
  // then shrinks the already-offscreen box around its own center. Reversing
  // the order would scale first and translate in the now-shrunk coordinate
  // space, landing the pane only scaleFrom*viewportHeight off the bottom
  // edge instead of fully offscreen - confirmed with a throwaway Playwright
  // check against both orderings before writing this, not assumed.
  //
  // 100vh, not a window.innerHeight px value - the very first entry (see
  // the component doc comment above) renders this on the server, where
  // window doesn't exist; a px value would have to fall back to some
  // placeholder there (0, say) and then jump to the real value once the
  // client hydrates, a mismatch React would warn about even though it's
  // never actually visible (the intro loader's own opaque overlay covers
  // it the whole time). vh resolves identically on server and client - the
  // server doesn't need to know the real viewport size to emit the string
  // "100vh", only the browser does once it paints - so there's nothing to
  // reconcile.
  const initialStyle: React.CSSProperties | undefined = entry.animate
    ? {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "100dvh",
        overflow: "hidden",
        transform: `translateY(100vh) scale(${pageSlideScaleFrom})`,
        zIndex: 10,
        willChange: "transform",
      }
    : undefined;

  // dependencies: [ready] - for every entry except the very first, `ready`
  // is already true at mount (see its own doc comment above), so this
  // still only meaningfully runs once, same as a plain mount-only effect.
  // The very first entry mounts with `ready` still false though, and needs
  // this to actually *re-run* once it flips true - the guard below makes
  // that initial (ready: false) call a no-op, leaving the pane parked at
  // its synchronously-applied initial style (above) until the real call
  // fires.
  useGSAP(
    () => {
      if (!entry.animate || !ref.current || !ready) return;
      const el = ref.current;

      // FIXED (was an open known issue): a confirmed-live report described
      // a brief flash right as this pane finished settling, on the specific
      // scenario of clicking the home logo while scrolled down on another
      // page - the pane's own clearProps call used to happen right here,
      // synchronously, immediately on GSAP's onComplete, a direct DOM
      // mutation completely outside React's render cycle. Confirmed live
      // via Playwright: that let the browser paint one real frame where
      // this pane was already unfixed (normal flow, real content) but
      // window.scrollY hadn't been reset yet (still wherever the previous
      // page's scroll lock had left it), showing whatever the new page's
      // content happened to sit at that stale Y position - not an
      // iOS-specific compositor issue as first suspected, a plain same-tick
      // ordering race reproducible in plain Chromium. clearProps now lives
      // in the parent's own settleTick layout effect instead (PageTransition.
      // tsx, right alongside the scroll-position reset it used to race
      // against) - see that effect's own doc comment for the full fix.
      // release() here only has to report "done" upward.
      const release = () => {
        onSettled();
      };

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (prefersReducedMotion) {
        release();
        return;
      }

      // el itself is fully offscreen right now (y: window.innerHeight,
      // set above) - nothing it contains is visible yet, so briefly
      // delaying the start of the rise costs nothing visually. Spent here
      // decoding el's own non-lazy images (typically a full-bleed hero
      // photo, the first thing that becomes visible as el's top edge
      // rises into view) before that rise starts: these are brand-new DOM
      // nodes, not guaranteed to reuse any previously-decoded raster for
      // the same resource even when Next's own `priority` preload already
      // got the bytes on the wire early. Skipping this would let the rise
      // start while the photo is still blank, exposing whatever's stacked
      // behind it (usually a gradient overlay with no image to wait on)
      // for a frame or two. Raced against a timeout so one slow decode
      // can't hold up the whole transition; cancellable so a second
      // navigation interrupting before this resolves doesn't start a
      // stale rise for a page that's no longer current. The timeout itself
      // (pageSlideHoldDuration, lib/motion.ts - not a token one) deliberately
      // mirrors fluid.glass's own observed ~300ms hold at full offscreen
      // scale before any visible motion starts, for the same reason: it's
      // not just about images - it's slack for the rest of the new page
      // (layout, fonts, GSAP effects on it) to actually settle while
      // nothing is visible yet, rather than racing the rise against work
      // that's still in flight - a concern that matters most on exactly the
      // slower devices (older/lower-end phones) where that settling takes
      // longest.
      const priorityImgs = Array.from(
        el.querySelectorAll<HTMLImageElement>("img"),
      ).filter((img) => img.loading !== "lazy");
      const decodePromises = priorityImgs.map((img) =>
        img.decode ? img.decode().catch(() => {}) : Promise.resolve(),
      );
      const decodeTimeout = new Promise<void>((resolve) =>
        setTimeout(resolve, pageSlideHoldDuration * 1000),
      );

      let cancelled = false;
      Promise.race([Promise.allSettled(decodePromises), decodeTimeout]).then(
        () => {
          if (cancelled) return;
          gsap.to(el, {
            y: 0,
            scale: 1,
            duration: pageSlideDuration,
            ease: ease.inOutQuart,
            onComplete: release,
          });
        },
      );

      return () => {
        cancelled = true;
      };
    },
    { scope: ref, dependencies: [ready] },
  );

  return (
    <div ref={ref} className="relative bg-background" style={initialStyle}>
      {entry.children}
    </div>
  );
}
