"use client";

import { useEffect, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useIntroReady } from "@/components/motion/IntroSequence";
import {
  ease,
  pageSlideDuration,
  pageSlideHoldDuration,
  pageSlideScaleFrom,
  pageTransitionState,
} from "@/lib/motion";

/**
 * Every *real* navigation (link clicks and browser back/forward alike) is
 * now handled by the native View Transitions API, via next-view-transitions
 * (see <ViewTransitions> in layout.tsx, and the Link import swap across
 * every file that links internally) - document.startViewTransition() has
 * the browser capture a real bitmap of the page before the DOM mutates and
 * another after, so there is no live DOM to clone, no <img> to freeze, no
 * scroll position to lock/measure/restore by hand. The fluid.glass-style
 * rising pane + outgoing darken is pure CSS now (globals.css, targeting
 * ::view-transition-old/new(root) - deliberately the default *unnamed*
 * transition, not a view-transition-name on this file's own wrapper div;
 * see globals.css's own doc comment for why naming it was tried and caused
 * a real bug) - this component's only remaining navigation-adjacent job is
 * closing the mobile menu *instantly*, with no animation, before a
 * transition's "old" snapshot is taken - that snapshot happens
 * synchronously, inside next-view-transitions' own click/popstate
 * handling, potentially before React has processed anything else from
 * the same event, so a capture-phase document listener (not React's
 * own synthetic bubble-phase system) is the only reliable way to run
 * before it. See pageTransitionState.onNavigate's own doc comment in
 * lib/motion.ts for why this is a shared callback SiteNav registers
 * itself into, rather than this file owning the menu's state directly.
 *
 * This file previously hand-rolled all of that: a two-slot (slotA/slotB)
 * design kept the outgoing page's own live React subtree mounted and
 * visible underneath a position:fixed incoming pane, with a cloneNode(true)
 * snapshot (plus a canvas-painted freeze for every <img>, to dodge a
 * decode race the clone alone caused) taken right before navigating away,
 * because Next's App Router unmounts/re-renders the outgoing route's own
 * context consumers immediately on navigation - there was no "live" outgoing
 * page left to show otherwise. That snapshot's own scroll alignment then had
 * to be locked and re-measured by hand for the rise's own duration, which is
 * exactly the piece that kept finding new ways to race: a browser's own
 * history-driven scroll restoration (not the native API gated by
 * history.scrollRestoration, but Next's own router re-asserting a cached
 * scroll position on a popstate-driven route change) won a race against
 * that hand-rolled lock on *every* back-navigation once the page had been
 * live long enough for Next's own internal history bookkeeping to run -
 * confirmed reproducible in plain Chromium, not a real-device-only bug, and
 * the thing that was still broken after nine other distinct, previously-
 * fixed root causes in this same mechanism (full history in this file's own
 * git log). None of that problem class exists once the browser is the one
 * taking the snapshot: it already has the exact right bitmap, at the exact
 * right scroll position, for both the outgoing and incoming page, with
 * nothing for this app's own JS to desync from.
 *
 * The one thing View Transitions can't help with is the very first page
 * load - there's no DOM mutation to wrap a transition around when nothing
 * has rendered yet. That still plays the identical rise by hand below,
 * gated behind the intro loader's own `ready` flip (see useIntroReady),
 * using the exact same GSAP tween this file has always used for it - this
 * was never the source of any of the bugs above, only the navigation half
 * was.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const ready = useIntroReady();
  const ref = useRef<HTMLDivElement>(null);

  // Announces "a real internal navigation is starting" (see
  // pageTransitionState.onNavigate's own doc comment in lib/motion.ts) so
  // SiteNav can close the mobile menu instantly, with no animation, before
  // next-view-transitions takes its "old" snapshot - that snapshot happens
  // synchronously inside its own click/popstate handling, so a capture-
  // phase document listener (ahead of React's own bubble-phase synthetic
  // events, and ahead of next-view-transitions' own Link onClick) is the
  // only reliable way to run first. This file doesn't call router.push or
  // preventDefault itself anymore - next-view-transitions' own Link and
  // popstate handling own that entirely now; this listener only ever
  // observes.
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
      pageTransitionState.onNavigate?.();
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, []);

  useEffect(() => {
    function handlePopState() {
      pageTransitionState.onNavigate?.();
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Parked fixed/offscreen via this inline style on every render until
  // `ready` flips - after that, the useGSAP effect below clears every one
  // of these props (clearProps) and this stops being applied (ready is
  // true from then on, for the rest of the session - see useIntroReady's
  // own doc comment). 100dvh/translateY(100vh)/scale ordering, and the
  // vh-not-px reasoning, are unchanged from this file's previous version -
  // see git history if any of this needs re-deriving.
  const initialStyle: React.CSSProperties | undefined = !ready
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

  useGSAP(
    () => {
      if (!ready || !ref.current) return;
      const el = ref.current;

      pageTransitionState.hasPlayedInitial = true;

      const release = () => {
        gsap.set(el, {
          clearProps: "position,top,left,right,height,overflow,y,scale,zIndex,willChange",
        });
        // Matches the old release()'s own reasoning: a child with its own
        // topOfPage ScrollTrigger (Parallax.tsx) measures correctly only
        // once this wrapper has actually returned to normal flow -
        // refreshing here, synchronously in this same GSAP callback, keeps
        // that measurement from going stale for even one paint.
        ScrollTrigger.refresh();
      };

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (prefersReducedMotion) {
        release();
        return;
      }

      // el is fully offscreen right now - nothing inside it is visible yet,
      // so briefly delaying the rise costs nothing. Spent decoding el's own
      // non-lazy images (typically a full-bleed hero photo) before the rise
      // starts, same reasoning as every other navigation's own hold used to
      // have: a brand-new <img> isn't guaranteed to reuse any previously-
      // decoded raster even when Next's own `priority` preload already has
      // the bytes on the wire. Raced against a timeout so one slow decode
      // can't hold up the whole reveal.
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
    <div
      ref={ref}
      className="relative bg-background"
      style={initialStyle}
    >
      {children}
    </div>
  );
}
