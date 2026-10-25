"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useIntroReady } from "@/components/motion/IntroSequence";
import { pageColumnsApi } from "@/components/PageTransitionColumns";
import { useLenis } from "@/components/SmoothScroll";
import { pageTransitionState } from "@/lib/motion";

/**
 * A link click covers the screen with PageTransitionColumns' own vertical-
 * columns wipe, swaps the route underneath while fully hidden, then
 * reveals it. Deliberately not the browser's native View Transitions API
 * (an earlier version of this file used that, and used fluid.glass's own
 * actual implementation as its reference) - once the columns are
 * guaranteed to fully obscure the screen during the swap, there's nothing
 * left for a native snapshot/crossfade to buy: the columns are pure CSS/
 * GSAP transforms with zero platform API dependency, so every browser
 * (Firefox and Android Chrome included, not just Safari 18+/Chromium)
 * gets the identical animation rather than Firefox silently falling back
 * to an unanimated instant swap.
 *
 * This also replaced a much more elaborate hand-rolled transition (DOM-
 * cloned outgoing-page snapshots, a rise/scale/darken incoming pane held
 * in position:fixed, per-frame scroll freezing, manual z-index stacking
 * against the live page) that was the direct source of every iOS Safari-
 * specific flash/repaint bug chased across this project's history -
 * forced-layout timing races, compositor layer promotion timing,
 * explicit-vs-auto z-index stacking gaps, image decode races. This
 * version never touches, measures, or clones the actual page content at
 * all - the columns are a solid, opaque, purely decorative overlay
 * sitting above everything while the real page quietly swaps behind it,
 * which structurally can't exhibit that entire bug class.
 *
 * The one-time intro loader (IntroSequence.tsx) builds its own matching
 * set of columns for its own liftoff handoff, sharing this file's timing
 * constants - see its own doc comment for why that's a separate DOM
 * instance rather than this same one.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lenisRef = useLenis();
  const ready = useIntroReady();
  const transitioningRef = useRef(false);
  // Holds the callback that tells the in-flight navigate() call "the DOM
  // now matches the new route" - router.push() itself doesn't signal this
  // (App Router navigation is async), so the pending promise waits here
  // until the pathname effect below confirms React has actually committed
  // the new page.
  const resolveRef = useRef<(() => void) | null>(null);

  // A plain (passive) effect, deliberately not useGSAP/useLayoutEffect:
  // React guarantees every layout effect across the whole tree finishes
  // before any passive effect runs, in every commit - so this write is
  // guaranteed to land after Hero/WordReveal/RevealOnScroll/Parallax's own
  // layout-effect reads of this same flag in the commit where `ready`
  // first turns true, without this component needing to sit at any
  // particular tree depth relative to them the way a competing layout
  // effect would.
  useEffect(() => {
    if (ready) pageTransitionState.hasPlayedInitial = true;
  }, [ready]);

  // Resolves whatever navigation is in flight once the new route has
  // actually committed, and resets scroll to the top of it - matching Vue
  // Router's own default scrollBehavior (fluid.glass's actual mechanism
  // for this). Runs while the columns are still fully covering the
  // screen, so the jump is never visible.
  useEffect(() => {
    resolveRef.current?.();
    resolveRef.current = null;

    const lenis = lenisRef?.current;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, lenisRef]);

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

      const href = url.pathname + url.search + url.hash;

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (prefersReducedMotion) {
        router.push(href);
        return;
      }

      transitioningRef.current = true;

      const routeCommitted = new Promise<void>((resolve) => {
        resolveRef.current = resolve;
      });
      router.push(href);

      // Covering and waiting for the new route to commit run concurrently,
      // not sequentially - the columns' own cover animation sets the
      // transition's minimum duration, with actual route-load time (if
      // slower) simply extending the hold rather than adding on top of it.
      Promise.all([pageColumnsApi.cover(), routeCommitted])
        .then(() => pageColumnsApi.reveal())
        .finally(() => {
          transitioningRef.current = false;
        });
    }

    // Capture phase so this always runs before Link's own click handling
    // and can preventDefault it, regardless of where in the tree that
    // handler is attached.
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [router]);

  return <>{children}</>;
}
