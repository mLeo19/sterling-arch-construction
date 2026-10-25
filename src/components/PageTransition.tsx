"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useIntroReady } from "@/components/motion/IntroSequence";
import { useLenis } from "@/components/SmoothScroll";
import { pageTransitionState } from "@/lib/motion";

/**
 * Matches fluid.glass's own page-to-page transition exactly, confirmed by
 * reading their actual shipped Nuxt/Vue bundle rather than guessing from
 * how the live site looks: a `RouterLink` click calls `router.push()`
 * (Next's equivalent) wrapped in the browser's native
 * `document.startViewTransition()` when it exists, with zero custom
 * animation - the browser's own default cross-fade is the entire effect.
 * Their only transition-specific CSS is one rule dropping the outgoing
 * page's z-index/pointer-events during the fade, which Next doesn't need
 * (the old route's DOM is already gone by the time the browser's "before"
 * snapshot would be visible under it - App Router doesn't keep it mounted
 * the way Vue Router's own transition component does).
 *
 * This replaces an earlier, much more elaborate hand-rolled version (DOM-
 * cloned outgoing-page snapshots, a rise/scale/darken incoming pane kept
 * in position:fixed, per-frame scroll freezing) that was never actually
 * part of fluid.glass's own design - an embellishment layered on top of
 * the reference by an earlier pass, and the direct source of every iOS
 * Safari-specific flash/repaint bug found this session (forced-layout
 * timing, compositor layer promotion, explicit-vs-auto z-index stacking).
 * View Transitions sidesteps all of that by letting each browser's own
 * engine own the snapshot/composite work instead of re-implementing it by
 * hand - and on a browser that doesn't support it at all (Firefox, as of
 * this writing), `startViewTransition` is simply never called, same as
 * fluid.glass: a plain, instant, trivially-correct navigation.
 *
 * The one-time intro loader (IntroSequence.tsx/IntroLoader) is unrelated
 * to this and untouched - this only governs subsequent page-to-page
 * navigation, after that loader has already lifted off.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const lenisRef = useLenis();
  const ready = useIntroReady();
  const transitioningRef = useRef(false);
  // Holds the callback that tells startViewTransition "the DOM now matches
  // the new route" - router.push() itself doesn't signal this (App Router
  // navigation is async), so the pending transition waits here until the
  // pathname effect below confirms React has actually committed the new
  // page.
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

  // Resolves whatever view transition is in flight once the new route has
  // actually committed, and resets scroll to the top of it - matching Vue
  // Router's own default scrollBehavior (fluid.glass's actual mechanism
  // for this, not a custom one).
  useEffect(() => {
    resolveRef.current?.();
    resolveRef.current = null;
    transitioningRef.current = false;

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
      if (transitioningRef.current) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      const href = url.pathname + url.search + url.hash;

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (
        prefersReducedMotion ||
        typeof document === "undefined" ||
        !("startViewTransition" in document)
      ) {
        router.push(href);
        return;
      }

      transitioningRef.current = true;
      document.startViewTransition(() => {
        return new Promise<void>((resolve) => {
          resolveRef.current = resolve;
          router.push(href);
        });
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
