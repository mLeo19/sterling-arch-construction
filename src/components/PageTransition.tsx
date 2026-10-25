"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useIntroReady } from "@/components/motion/IntroSequence";
import { useLenis } from "@/components/SmoothScroll";
import { ease, pageTransition, pageTransitionState } from "@/lib/motion";

/**
 * The incoming page starts smaller and centered (transformOrigin: "center",
 * not "top center" - a top-anchored origin can only ever grow downward from
 * a fixed top edge, never symmetrically), translated a full viewport-height
 * below the screen, then slides up to y:0 while scaling to 1. The Y motion
 * settles first; the scale keeps growing a little after - deliberately not
 * simultaneous from the start, so it reads as "rises, then grows" instead
 * of one continuous blended move.
 *
 * The incoming pane (contentRef) is position:fixed for the duration of the
 * transition, not left in normal flow - its own rendering is then
 * completely independent of window.scrollY, the same reason darkenRef and
 * snapshotRef (both fixed inset-0 from the start) never need any scroll
 * bookkeeping. Pulling contentRef out of flow would ordinarily collapse
 * whatever comes after it (Footer) upward underneath it, since nothing
 * reserves its old space anymore - spacerRef, a plain normal-flow
 * placeholder right before it (see its own doc comment), reserves exactly
 * that space for as long as contentRef stays fixed, then collapses back to
 * 0 in release() below at the same moment contentRef returns to normal flow.
 *
 * This also plays on the initial hard load, not just client-side
 * navigations - timed to start at the exact instant IntroSequence's own
 * liftoff begins (`ready` flips true at that label), so the outgoing loader
 * and the incoming pane rise together instead of one waiting for the other.
 * On the initial load specifically, this pane must paint ABOVE the intro
 * overlay (z-[100] in IntroSequence.tsx) while it rises, or the whole rise
 * happens invisibly behind that opaque overlay. Elevated to z-[101] only
 * while that specific transition is running, released back to the resting
 * z-50 the nav itself uses once it settles.
 *
 * The backdrop darkens smoothly during every transition, not just the
 * initial load - a dedicated overlay sitting behind the incoming pane,
 * visible in whatever margin the pane hasn't grown to cover yet, released
 * back to transparent once the pane fully covers the screen.
 *
 * The outgoing page has to stay visible underneath while the incoming pane
 * rises over it, not disappear the instant navigation starts - the App
 * Router unmounts the outgoing route's content immediately on navigation,
 * so by the time this component re-renders for the new pathname there's no
 * old DOM left to show on its own. Solved with a DOM snapshot: clone the
 * outgoing page's still-attached, still-fully-rendered DOM - its content
 * plus the persistent Footer, a sibling of it rather than a descendant (see
 * captureSnapshot below for why both are cloned) - and park the clone in
 * snapshotRef, a stable container that (unlike contentRef) isn't keyed on
 * pathname and so survives the swap untouched. The clone is inert (no live
 * GSAP/ScrollTrigger bindings) but visually identical at the instant of
 * capture, which is all a few hundred ms of "old page still sitting there"
 * needs to be. translateY'd by the negative of window.scrollY at capture
 * time so a scrolled page still shows what was actually on screen.
 *
 * Captured eagerly - a capture-phase click listener on document for link
 * clicks, a popstate listener for browser back/forward - not in an unmount
 * effect cleanup. Both fire before Next's router has re-rendered anything,
 * so contentRef.current still shows the outgoing page's real, intact DOM.
 * By the time an unmount cleanup runs, that DOM may already be detached and
 * any inline styles GSAP had set on it already stripped back to their
 * default classes, so a clone taken there can capture a page that's
 * missing pieces (or, for back/forward specifically, nothing at all). The
 * unmount-cleanup path is kept only as a last-resort fallback, for
 * navigations that are neither a click nor popstate (a programmatic
 * router.push elsewhere) - capturedForTransitionRef makes all three paths
 * mutually idempotent so whichever one captures first wins.
 *
 * Concurrency: nothing in the mechanism above is safe against a second
 * navigation starting while the first transition's entrance timeline is
 * still running - contentRef re-keys on every pathname change, so a second
 * change mid-animation would leave a stale timeline running against DOM
 * React has already detached, while a new one starts on the real content;
 * both would still write to the same darkenRef/el refs and fight each
 * other. Two guards close that off: transitioningRef blocks (preventDefault)
 * any further tracked link click while a transition is in flight, covering
 * ordinary double-clicks at the source; and tlRef, killed at the top of
 * every run before a new timeline is built, covers browser back/forward
 * (which can't be preventDefault'd) by guaranteeing whichever transition
 * fires last always wins cleanly and still reaches release().
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ready = useIntroReady();
  const lenisRef = useLenis();
  const contentRef = useRef<HTMLDivElement>(null);
  const darkenRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<HTMLDivElement>(null);
  // Normal-flow placeholder that reserves contentRef's document space while
  // contentRef itself is position:fixed for the transition (see the entrance
  // effect below) - without this, Footer (contentRef's own next sibling)
  // would collapse straight up to the top of the document the instant
  // contentRef leaves the flow.
  const spacerRef = useRef<HTMLDivElement>(null);
  const hasPlayedInitialRef = useRef(false);
  const capturedForTransitionRef = useRef(false);
  // True from the moment a navigation is captured until its entrance
  // timeline fully releases - see the concurrency doc comment above.
  const transitioningRef = useRef(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  // Holds the active scroll-guard listener (see the doc comment in the main
  // entrance effect below) so it can be torn down both on normal completion
  // and if a second navigation interrupts this one before that happens.
  const scrollGuardRef = useRef<(() => void) | null>(null);

  // The scroll position to animate to once the entrance transition fully
  // settles on a hard reload - fluid.glass's own refresh behavior (intro
  // plays normally, pane rises, *then* it scrolls down to where you were)
  // rather than either landing at the top or skipping the entrance
  // animation entirely. Read synchronously here, during the component's
  // very first render, rather than in an effect - this has to win a race
  // against the entrance effect's own resetScroll() (below), which fires
  // from a useGSAP effect and would otherwise flush scrollY to 0 and emit a
  // real 'scroll' event before this component ever gets a chance to read
  // the pre-reload position for itself. Reading inline during render, not
  // lazily in a useState initializer, trips React's "don't read/write refs
  // during render" lint rule - a plain mutable ref assigned straight in the
  // function body like this is the one exception that's actually safe:
  // nothing here is derived from props/state in a way a re-render could
  // legitimately change, and the `=== undefined` guard makes the whole
  // block run exactly once, on mount, like a lazy ref initializer would.
  // undefined = "not checked yet" (checked exactly once, right here);
  // null = "checked, nothing worth restoring"; otherwise the {pathname, y}
  // this reload's hard-load capture was taken for - stamped with pathname
  // so a navigation that interrupts this same reload's own entrance
  // animation (before the hold loop below ever gets to consume it) can't
  // later misapply a stale position meant for this pathname to a different
  // one once that *next* transition's own hold loop completes instead.
  const restoreScrollRef = useRef<{ pathname: string; y: number } | null | undefined>(
    undefined,
  );
  if (restoreScrollRef.current === undefined) {
    restoreScrollRef.current = (() => {
      if (typeof window === "undefined") return null;
      const raw = window.sessionStorage.getItem(`scrollY:${pathname}`);
      const y = raw ? Number(raw) : NaN;
      return Number.isFinite(y) && y > 0 ? { pathname, y } : null;
    })();
  }

  // Keeps that same sessionStorage slot current while the user actually
  // scrolls, so whatever's there is always recent enough to restore from on
  // the next hard reload - not written just once on unload, which mobile
  // Safari in particular doesn't reliably fire before a reload discards the
  // page. rAF-coalesced, the same pattern as SiteNav's own atBottom scroll
  // listener, so a continuous scroll writes at most once per frame rather
  // than on every raw scroll event.
  useEffect(() => {
    const KEY = `scrollY:${pathname}`;
    let ticking = false;
    function save() {
      ticking = false;
      window.sessionStorage.setItem(KEY, String(window.scrollY));
    }
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(save);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  // Belt-and-suspenders alongside the resetScroll()/rAF re-assertion
  // further down: turns off the browser's *native* scroll restoration, in
  // case that's ever the one racing the reset on a given browser. The real
  // culprit for back/forward scroll races is Next's own separate App
  // Router scroll restoration, not this flag, but it's a correct, harmless
  // no-op on the mechanism it does control.
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  const captureSnapshot = useCallback(() => {
    const el = contentRef.current;
    const snapshotContainer = snapshotRef.current;
    if (!el || !snapshotContainer) return;
    if (capturedForTransitionRef.current) return;
    capturedForTransitionRef.current = true;
    transitioningRef.current = true;

    // Freeze Lenis's own scroll loop immediately - it drives scroll position
    // every tick independent of React, so if the user was still mid-flick
    // when navigation started, stop() halts that before it can keep moving
    // the page (or fighting the reset below) while the new route swaps in.
    // Resumed once the new page's own scroll position is explicitly set, in
    // the entrance effect below.
    lenisRef?.current?.stop();
    // Read fresh, right here at capture time - an earlier-captured value can
    // be stale (e.g. zero) by the time a click actually happens, which bakes
    // a wrong compensating offset into the clone.
    const scrollY = window.scrollY;

    // position:sticky's "stuck" offset is a live browser layout calculation
    // tied to actual scroll position within its real scrolling ancestor -
    // cloneNode copies the DOM/inline styles, but not that computed offset.
    // Once reattached inside this snapshot's own fixed + translateY wrapper
    // below (a completely different scroll context: nothing ever actually
    // scrolls it), the browser recomputes each cloned sticky element's
    // position fresh against that new context and it visibly snaps - the
    // "pinned component jumps the instant a page transition starts" bug
    // this fixes (PinnedScale.tsx, ApproachHero.tsx, ApproachProcess.tsx -
    // every sticky-pinned, scroll-scrubbed component in the project).
    // Every other (non-sticky) element in the clone doesn't need this: its
    // on-screen position already falls out correctly from the single
    // wrapper-level translateY(-scrollY) below, equivalent to "where it was
    // relative to the document, minus how far the page had scrolled."
    // Sticky elements don't follow that same document-relative math - their
    // own `top` offset is itself a function of scroll - so their current,
    // already-resolved on-screen rect is measured and baked in explicitly
    // instead, before cloning.
    function freezeStickyPositions(liveRoot: HTMLElement, cloneRoot: HTMLElement) {
      const liveStickyEls = liveRoot.querySelectorAll<HTMLElement>(".sticky");
      const cloneStickyEls = cloneRoot.querySelectorAll<HTMLElement>(".sticky");
      liveStickyEls.forEach((liveNode, i) => {
        const cloneNode = cloneStickyEls[i];
        if (!cloneNode) return;
        const rect = liveNode.getBoundingClientRect();
        // fixed, not absolute: this element's own normal-flow parent (the
        // tall pin wrapper, e.g. PinnedScale's own "relative h-[...]" div)
        // is itself position:relative, which - having no transform of its
        // own - doesn't qualify as a containing block for position:fixed,
        // but DOES for position:absolute (any non-static position counts
        // there). An absolute override was landing on that nearer wrapper
        // instead of contentClone below, resolving `top` against the wrong
        // origin entirely. Fixed positioning's containing-block search only
        // stops at a transformed ancestor - contentClone always carries one
        // here (even a visually neutral one; see this file's own top-level
        // doc comment on why that's permanent), so this lands exactly where
        // intended regardless of how deeply this element is nested.
        //
        // Document-relative top (rect.top + scrollY), not the
        // viewport-relative rect.top alone - the wrapper's own
        // translateY(-scrollY) below subtracts scrollY back out of every
        // descendant uniformly, so adding it back in here is what makes the
        // two cancel out to exactly the on-screen position being frozen.
        cloneNode.classList.remove("sticky", "top-0");
        cloneNode.style.position = "fixed";
        cloneNode.style.top = `${rect.top + scrollY}px`;
        cloneNode.style.left = `${rect.left}px`;
        cloneNode.style.width = `${rect.width}px`;
        cloneNode.style.height = `${rect.height}px`;
        cloneNode.style.margin = "0";
      });
    }

    // The real page is el's content immediately followed by the persistent
    // Footer - a sibling of el (see layout.tsx), not a descendant of it. A
    // clone of el alone has no content for the space Footer actually
    // occupies, so scrolling into the Footer would show nothing real there.
    // Cloning the Footer too and stacking it directly after the content
    // clone - the same order they already render in - gives the composite
    // clone real content for that whole range.
    const footerEl = document.querySelector<HTMLElement>("footer");
    const wrapper = document.createElement("div");
    const contentClone = el.cloneNode(true) as HTMLElement;
    freezeStickyPositions(el, contentClone);
    wrapper.appendChild(contentClone);
    if (footerEl) {
      const footerClone = footerEl.cloneNode(true) as HTMLElement;
      freezeStickyPositions(footerEl, footerClone);
      wrapper.appendChild(footerClone);
    }

    // Still clamped, defensively, against the *composite* height now rather
    // than el's own - this should rarely if ever actually reduce scrollY
    // going forward (the composite mirrors the real document), but stays as
    // a safety net against any future persistent element rendered outside
    // both el and Footer that this capture still wouldn't know about.
    const combinedHeight =
      el.getBoundingClientRect().height +
      (footerEl?.getBoundingClientRect().height ?? 0);
    const maxScroll = Math.max(0, combinedHeight - window.innerHeight);
    const clampedScrollY = Math.min(scrollY, maxScroll);

    wrapper.style.transform = `translateY(${-clampedScrollY}px)`;
    snapshotContainer.replaceChildren(wrapper);

    // Harmless when already loaded, and removes the one theoretical gap (a
    // still-pending lazy image frozen mid-load at the instant of capture).
    wrapper.querySelectorAll("img").forEach((img) => {
      img.loading = "eager";
    });
  }, [lenisRef]);

  // Primary capture path - capture-phase so this always runs before the
  // link's own click handling, regardless of where in the tree that
  // handler is attached.
  useEffect(() => {
    function handleClickCapture(event: MouseEvent) {
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
      // Same pathname - no real page transition happens for these (a hash
      // link, a query-only change), so nothing to capture or block.
      if (url.pathname === window.location.pathname) return;

      // A transition is already running - block this click outright so a
      // second navigation can never start mid-animation. See the
      // concurrency doc comment above.
      if (transitioningRef.current) {
        event.preventDefault();
        return;
      }

      captureSnapshot();
    }

    document.addEventListener("click", handleClickCapture, true);
    return () => document.removeEventListener("click", handleClickCapture, true);
  }, [captureSnapshot]);

  // Eager capture for browser back/forward, the same idea as the click
  // listener above: popstate fires synchronously the instant the user
  // presses back/forward, before Next's router has re-rendered anything, so
  // contentRef.current still shows the outgoing page's real, intact DOM at
  // that point. Without this, back/forward only reached captureSnapshot via
  // the unmount-cleanup fallback below, which by the time it fires can
  // already be looking at a stale, detached contentRef.current.
  useEffect(() => {
    window.addEventListener("popstate", captureSnapshot);
    return () => window.removeEventListener("popstate", captureSnapshot);
  }, [captureSnapshot]);

  // Last-resort fallback for navigations that are neither a tracked click
  // nor popstate (e.g. a programmatic router.push elsewhere).
  useLayoutEffect(() => {
    const thisPathname = pathname;
    capturedForTransitionRef.current = false;
    return () => {
      // React Strict Mode synchronously invokes setup/cleanup/setup once on
      // mount to test cleanup safety, for the exact same pathname - Next's
      // router updates window.location.pathname synchronously as part of a
      // real navigation, before this cleanup ever runs, so a genuine
      // cleanup always sees a *different* live pathname than the one this
      // effect instance was set up for. Strict Mode's synthetic call fires
      // before any navigation happened at all, so the live URL still
      // matches - that's the signal to bail out and touch nothing.
      if (window.location.pathname === thisPathname) return;
      captureSnapshot();
    };
  }, [pathname, captureSnapshot]);

  useGSAP(
    () => {
      if (!ready || !contentRef.current) return;
      const el = contentRef.current;

      // Kill whichever previous transition's timeline might still be
      // running before building a new one - the concurrency guard that
      // makes browser back/forward safe (see the doc comment above).
      tlRef.current?.kill();
      // Likewise tear down any still-active scroll guard from an
      // interrupted previous run (normal completion already removes its
      // own via release() below; this covers the case where a second
      // navigation started before that ever happened).
      if (scrollGuardRef.current) {
        scrollGuardRef.current();
        scrollGuardRef.current = null;
      }

      // Not a raw window.scrollTo - force:true scrolls even though stop()
      // just paused Lenis (scrollTo's own early-return on isStopped is
      // gated on force), and immediate:true applies it synchronously while
      // Lenis stays stopped. Falls back to a plain window.scrollTo when
      // Lenis doesn't exist (prefers-reduced-motion already returned
      // above; Lenis also never gets created on touch devices - see
      // SmoothScroll.tsx). Defined up here, before release(), so release()
      // can call it too.
      //
      // Deliberately does NOT call lenis.start(): real OS trackpad momentum
      // keeps firing wheel events for roughly a second after the finger
      // lifts, well past the click. Lenis's own onWheel/onVirtualScroll
      // handlers gate on isStopped and ignore events while stopped, so
      // leftover momentum is a no-op as long as Lenis stays stopped - but
      // start() resumes processing immediately, and since this function
      // runs every frame of the hold loop below, calling start() here let
      // each frame's momentum tick re-perturb the scroll before the next
      // frame's call forced it back, reading as the new page landing
      // scrolled down and sliding up over about a second instead of
      // landing clean. Resuming is deferred to a single explicit
      // lenis.start() call once the hold loop's own natural completion
      // decides no more residual momentum is coming - see HOLD_FRAMES
      // below.
      const resetScroll = () => {
        const lenis = lenisRef?.current;
        if (lenis) {
          lenis.scrollTo(0, { immediate: true, force: true });
        } else {
          window.scrollTo(0, 0);
        }
      };

      const release = () => {
        // clearProps for the position/inset properties, not an explicit
        // "static" - that would permanently override the "relative" class
        // on el's own className (inline style always beats a class) even
        // once the transition is long over, which could break any
        // descendant relying on el itself as its positioning container.
        // clearProps removes the inline overrides entirely, letting the
        // "relative" class reassert itself exactly as if this element had
        // never been touched.
        gsap.set(el, {
          clearProps: "position,top,left,right",
          height: "auto",
          overflow: "visible",
          y: 0,
          scale: 1,
        });
        gsap.set(spacerRef.current, { height: 0 });
        gsap.set(darkenRef.current, { opacity: 0 });
        snapshotRef.current?.replaceChildren();
        // RevealOnScroll-style children mount and register their own
        // ScrollTriggers while this wrapper is still staged (scaled/
        // translated/height-capped), so those triggers calculate against
        // the wrong geometry. Force everything to recompute now that the
        // real, settled layout is in place.
        ScrollTrigger.refresh();
        // ScrollTrigger.refresh() internally caches window.scrollY and
        // restores it once its own remeasuring pass finishes, so things
        // don't visually shift during the remeasure. That cache only gets
        // invalidated by a real native 'scroll' event - our own
        // resetScroll() runs via a raw window.scrollTo, which is a no-op
        // (fires no 'scroll' event) whenever the browser had already
        // auto-clamped scrollY to 0 on its own right after the DOM swap.
        // When that happens, refresh() restores scroll to whatever it last
        // read before this navigation instead of 0. Re-asserting scroll to
        // 0 immediately after refresh() is a real change this time, so it
        // fires a real 'scroll' event, keeping gsap's cache in sync going
        // forward too.
        resetScroll();
        // Delayed, not immediate - the intro overlay's own display:none (a
        // separate timeline in IntroSequence.tsx) can land a frame or two
        // after this pane's animation completes; dropping the elevated
        // z-index too early re-exposes it on top for that gap.
        gsap.delayedCall(0.6, () => gsap.set(el, { zIndex: "auto" }));
        transitioningRef.current = false;
        // The scroll guard deliberately does NOT get torn down here - see
        // its own doc comment (where it's installed, above) for why it
        // outlives release() by design now, ending instead on a real user
        // gesture or its own bounded timeout.
      };

      const isInitialLoad = !hasPlayedInitialRef.current;
      hasPlayedInitialRef.current = true;
      // See the doc comment on pageTransitionState itself (lib/motion.ts)
      // for why a remounted child component (Hero.tsx) can read this
      // safely without a prop/context round-trip.
      pageTransitionState.hasPlayedInitial = true;

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReducedMotion) {
        release();
        // No hold loop on this path (nothing animates, so there's nothing
        // for residual scroll input to race against) - restore straight
        // after release()'s own resetScroll(), same pathname-match guard as
        // the animated path below, instant rather than smooth since this
        // whole branch exists specifically to skip motion.
        const restore = restoreScrollRef.current;
        if (isInitialLoad && restore && restore.pathname === pathname) {
          restoreScrollRef.current = null;
          window.scrollTo({ top: restore.y, behavior: "instant" });
        }
        return;
      }

      const fromScale = isInitialLoad ? 0.88 : 0.8;

      // el is position:fixed for the duration of the transition, not
      // static/relative in normal flow. A fixed-position element's own
      // rendering never depends on document scroll at all - the same
      // reason darkenRef and snapshotRef (both fixed inset-0 since the
      // very first version of this file) need no scroll bookkeeping. el
      // gets the same treatment: pinned to the viewport's own top/left/
      // right regardless of wherever window.scrollY actually is, so there
      // is no window where a scroll race can make it render the wrong
      // slice of itself. spacerRef (a plain, normal-flow placeholder - see
      // its own doc comment) reserves el's document space for exactly as
      // long as el itself is fixed, so Footer doesn't collapse upward the
      // way it would if el just went `position: fixed` with nothing else
      // accounting for the space it used to occupy in flow.
      gsap.set(spacerRef.current, { height: window.innerHeight });
      gsap.set(el, {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        // dvh, not svh - svh is pinned to the *smallest* possible viewport
        // (mobile browser chrome fully expanded), which under-covers the
        // real, current viewport on any mobile browser whose address bar is
        // already hidden at this exact moment - and scrolling down to the
        // footer (this capture's own trigger) is exactly what hides it on
        // iOS/Android. The pane then renders shorter than the actual
        // screen, leaving a gap at the bottom where the real, uncovered
        // page (footer included) shows through underneath it - reading as
        // "the pane lands on top of the footer instead of covering the
        // whole screen." Headless/automated browsers have no real chrome to
        // hide, so svh and dvh are identical there - this class of gap is
        // only reproducible on an actual mobile browser, not in automated
        // testing. dvh tracks the browser's actual current viewport live,
        // closing the gap regardless of toolbar state.
        height: "100dvh",
        overflow: "hidden",
        transformOrigin: "center",
        y: window.innerHeight,
        scale: fromScale,
        // Needs to clear both the darken overlay (z-[5]) and, on the
        // initial load only, the intro overlay too (z-[100]).
        zIndex: isInitialLoad ? 101 : 10,
      });

      resetScroll();
      // ScrollTrigger has its own internal refresh cycle, independent of our
      // own explicit ScrollTrigger.refresh() call in release() below: it can
      // cache the current scroll position, zero it to measure the page, then
      // restore the cached value - and this cycle can be triggered by
      // anything that calls ScrollTrigger.update(), which this app wires up
      // to fire on every Lenis "scroll" emission (see lenis.on("scroll", ...)
      // in SmoothScroll.tsx). Lenis emits that event from plain .stop()/
      // .start() calls too, not just real scrolling - including SiteNav's
      // own mobile-menu scroll lock, which has nothing to do with this
      // transition, so that lock can trigger a stale-position restore mid-
      // transition. Calling refresh() again here, immediately, re-syncs
      // ScrollTrigger's own cache to 0 as early as possible, so if that
      // cycle fires again later it has nothing stale left to restore.
      // release()'s own refresh() call further down still matters too
      // (triggers need accurate positions against the final, settled
      // layout) - this one is purely about keeping the scroll cache
      // harmless in the meantime.
      //
      // Only needed when Lenis actually exists: SmoothScroll.tsx never
      // constructs Lenis on a touch device (pointer: coarse - native scroll
      // feels better there), so lenisRef.current is null on every phone, the
      // lenis.on("scroll", ...) wiring this guards against was never
      // attached, and the stale-restore race this refresh() prevents can't
      // happen at all. ScrollTrigger.refresh() is a genuinely expensive,
      // whole-page remeasure (every mounted trigger - a content-heavy page
      // here easily has a dozen from Parallax/RevealOnScroll/PinnedScale);
      // paying that cost on mobile guarded nothing, on exactly the device
      // class with the least frame budget to spare for it.
      if (lenisRef?.current) {
        ScrollTrigger.refresh();
      }
      resetScroll();
      // Unconditionally holds scroll at 0 for a fixed window of animation
      // frames, every frame, no exceptions - not a reactive 'scroll'
      // listener, since GSAP's own internal ScrollTrigger refresh cycle can
      // restore a stale pre-navigation scroll position any time something
      // elsewhere in the app calls lenis.stop()/.start() (SiteNav's mobile-
      // menu scroll lock does exactly that), with no 'user gesture' signal
      // to distinguish that from deliberate scrolling. Polling scrollY
      // every frame sidesteps that guessing game entirely: whoever writes a
      // stray value, it gets overwritten the very next frame. HOLD_FRAMES
      // is generous rather than tightly tuned - comfortably past both the
      // visual transition and release()'s own refresh call, since holding
      // a few extra frames is invisible but ending early is a visible bug.
      const HOLD_FRAMES = 120; // ~2s at 60fps
      let framesLeft = HOLD_FRAMES;
      let holdRafId: number | null = null;
      // Belt-and-suspenders alongside resetScroll() above: Lenis's own
      // isStopped gate already preventDefaults wheel/touch input for the
      // whole hold (see lenis.mjs's onVirtualScroll), but that's only the
      // gesture-driven paths it listens for - keyboard scroll (Space/Page
      // Down/arrow keys), a dragged scrollbar thumb, and middle-click
      // autoscroll all move window.scrollY natively, outside Lenis
      // entirely. document.body.style.overflow = "hidden" blocks all of
      // those the same way SiteNav's own mobile-menu lock does (the
      // body->viewport overflow propagation quirk - confirmed not to
      // disturb position:sticky the way toggling <html>'s own overflow
      // does, see the doc comment on the Lenis-stopped override in
      // globals.css). Re-applied every tick below, not just set once here -
      // SiteNav's own close-the-menu effect unconditionally clears this
      // same property the instant a menu-triggered nav link closes the
      // panel (see its `else` branch), which races this hold on exactly
      // the "click a link while the auto-opened footer menu is up" path.
      // Whichever one last wrote the property wins until the next frame,
      // same tolerance the scrollY reassertion below already accepts.
      document.body.style.overflow = "hidden";
      // Only cancels the rAF loop and clears the ref - does NOT resume
      // Lenis or restore body's overflow. Used for both the natural-
      // completion and interrupted-by-a-new-nav paths; the latter must
      // leave both Lenis and this lock in place, since releasing either
      // here would momentarily reopen scrolling in the gap before the new
      // navigation's own entrance effect gets a chance to re-lock.
      const stopHold = () => {
        if (holdRafId !== null) cancelAnimationFrame(holdRafId);
        holdRafId = null;
        scrollGuardRef.current = null;
      };
      const holdTick = () => {
        if (window.scrollY !== 0) resetScroll();
        // Guarded, not an unconditional reassert every frame: the race this
        // protects against (SiteNav's menu-close clearing this same
        // property) is rare, and writing an inline style the browser has to
        // diff against its current computed value still costs a style
        // recalc even when the value doesn't change - over 120 frames
        // that's 120 recalcs to catch a race that fires at most once.
        // Reading the inline value first (cheap CSSOM string read, not a
        // layout read) and only writing on an actual mismatch keeps the same
        // one-frame-late tolerance the comment above already accepts.
        if (document.body.style.overflow !== "hidden") {
          document.body.style.overflow = "hidden";
        }
        framesLeft -= 1;
        if (framesLeft <= 0) {
          stopHold();
          // The one place either actually releases - only reached when the
          // hold ran its full, uninterrupted course, meaning no navigation
          // preempted it and residual momentum has long since decayed.
          document.body.style.overflow = "";
          lenisRef?.current?.start();
          // Only after the hold has fully released, and only on the exact
          // hard reload restoreScrollRef's own render-time read captured
          // this for (see its doc comment) - a navigation that interrupted
          // this same reload's entrance before reaching here leaves the ref
          // holding a position stamped for a pathname that no longer
          // matches, so it's silently dropped rather than misapplied to
          // wherever the user actually landed instead.
          const restore = restoreScrollRef.current;
          if (isInitialLoad && restore && restore.pathname === pathname) {
            restoreScrollRef.current = null;
            if (lenisRef?.current) {
              lenisRef.current.scrollTo(restore.y);
            } else {
              window.scrollTo({
                top: restore.y,
                behavior: prefersReducedMotion ? "instant" : "smooth",
              });
            }
          }
          return;
        }
        holdRafId = requestAnimationFrame(holdTick);
      };
      holdRafId = requestAnimationFrame(holdTick);
      scrollGuardRef.current = stopHold;

      // Durations/offset live in src/lib/motion.ts, not as local constants
      // here - Hero.tsx's own text-entrance delay is computed from these
      // same numbers (via pageTransitionSettleTime), so the two can't drift
      // out of sync the way separately-hand-tuned constants eventually do.
      const { yDuration, scaleDuration, scaleOffset } = isInitialLoad
        ? pageTransition.initial
        : pageTransition.subsequent;
      // Peak darken amount, not full black - settles at ~0.5 opacity over
      // the dark base, roughly a 50/50 blend, not an opaque cover.
      const DARKEN_OPACITY = 0.5;
      const DARKEN_DURATION = 0.5;
      gsap.set(darkenRef.current, { opacity: 0 });

      const tl = gsap.timeline({ onComplete: release });
      tlRef.current = tl;
      tl.to(el, { y: 0, duration: yDuration, ease: ease.inOutQuart }, 0)
        .to(
          el,
          { scale: 1, duration: scaleDuration, ease: ease.inOutQuart },
          scaleOffset,
        )
        .to(
          darkenRef.current,
          { opacity: DARKEN_OPACITY, duration: DARKEN_DURATION, ease: "power2.out" },
          0,
        );
    },
    { dependencies: [pathname, ready], revertOnUpdate: true },
  );

  return (
    <>
      {/* z-[2]: a frozen visual stand-in for the outgoing route, above the
          plain page background, below the darken overlay and the incoming
          pane. Empty outside a transition. */}
      <div
        ref={snapshotRef}
        aria-hidden
        className="fixed inset-0 z-[2] overflow-hidden pointer-events-none"
      />
      {/* z-[5]: below the content pane's own transient z-index (10, or 101
          on the initial load) but above the plain page background it's
          meant to darken. Not keyed on pathname, so it persists as one
          stable element across navigations instead of remounting. */}
      <div
        ref={darkenRef}
        aria-hidden
        className="fixed inset-0 z-[5] bg-black opacity-0 pointer-events-none"
      />
      {/* bg-background: without it, this div (and a bare <main>/<PageHero>)
          has no background of its own - the only paint color comes from
          <body>'s own background, which by the CSS spec always paints
          beneath every positioned element, including this div's own z-10.
          The pane would be fully transparent during the transition,
          letting the darkened snapshot behind it (z-5/z-2) show straight
          through instead of a solid pane. Fixed here once so every
          current and future page gets a solid pane without having to
          remember to background every section. */}
      {/* Reserves contentRef's document space while it's position:fixed -
          see the doc comment on spacerRef above. Zero height outside a
          transition (contentRef is back in normal flow and reserves its own
          space the ordinary way), set to one viewport's height only for the
          transition's duration. */}
      <div ref={spacerRef} aria-hidden style={{ height: 0 }} />
      <div ref={contentRef} key={pathname} className="relative bg-background">
        {children}
      </div>
    </>
  );
}
