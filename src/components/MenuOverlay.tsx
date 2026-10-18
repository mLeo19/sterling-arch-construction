"use client";

import { useEffect, useRef, type RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { navLinks, site } from "@/lib/data/site";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { ease } from "@/lib/motion";

export function MenuOverlay({
  open,
  onClose,
  onNavigate,
  returnFocusRef,
  skipCloseAnimRef,
}: {
  open: boolean;
  onClose: () => void;
  // Distinct from onClose: fires only for links that actually navigate
  // somewhere, not the backdrop/explicit dismiss - see the skipCloseAnimRef
  // comment in SiteNav.tsx for why the two need to be told apart.
  onNavigate: () => void;
  // Focus returns here on close, wherever "here" is (the nav's hamburger
  // button) - keeps keyboard focus from silently landing on <body>.
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  // Same ref SiteNav's own pill-collapse effect reads (and is the one that
  // resets it back to false - this effect only ever reads it, never resets
  // it itself, so the two effects can't race on who clears it first). See
  // the doc comment below on why this backdrop-blur panel specifically
  // needs the same treatment.
  skipCloseAnimRef: RefObject<boolean>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const pathname = usePathname();
  // `open` starts false on mount, so this effect's first run is never a real
  // close - without this guard the toggle button would steal focus (and show
  // its focus ring) on every page load, not just when the menu actually closes.
  const hasOpenedRef = useRef(false);

  // Move focus into the panel on open, and back to the button that opened
  // it on close - without this, a keyboard user's focus silently stays on
  // (or falls back to) <body> while a modal-like panel covers the screen.
  useEffect(() => {
    if (open) {
      hasOpenedRef.current = true;
      firstLinkRef.current?.focus();
    } else if (hasOpenedRef.current) {
      returnFocusRef.current?.focus();
    }
  }, [open, returnFocusRef]);

  // Durations match Northfield's own menu exactly - a previous pass here
  // retimed this ~2x faster based on fluid.glass screenshot captures that
  // turned out to be a measurement artifact (see PageTransition.tsx's doc
  // comment on the same issue), not a real difference worth deviating from
  // the actual reference for.
  useGSAP(() => {
    if (!panelRef.current || !backdropRef.current) return;

    if (open) {
      gsap.set([panelRef.current, backdropRef.current], { pointerEvents: "auto" });
      gsap.fromTo(
        backdropRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.4, ease: ease.outQuart },
      );
      gsap.fromTo(
        panelRef.current,
        { opacity: 0, y: 24, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: ease.outQuart },
      );
    } else if (skipCloseAnimRef.current) {
      // Closing because a menu link was actually clicked, not because the
      // user backed out via the X/backdrop - real navigation is a click
      // away, and PageTransition is about to run its own rise/scale
      // animation on this same instant. This panel's backdrop-blur-2xl is
      // expensive to keep re-rendering every frame while its backdrop (the
      // page behind it) is simultaneously changing under PageTransition's
      // animation - confirmed via a real Safari recording (frame-hashed to
      // find exact stall ranges, not guessed from screenshots) showing the
      // page stuck rendering the same frame for 100-500ms+ stretches right
      // in this exact window, something Chromium never reproduced for the
      // same scenario. Two separate blurred, animating elements (this panel
      // fading out, PageTransition's pane rising in) compositing at once is
      // exactly the kind of load Safari's backdrop-filter handles far worse
      // than Chromium's. Snapping straight to the resting (closed) state
      // removes this panel from that contention entirely, the same fix
      // already applied to the pill's own shape-revert in SiteNav.tsx.
      gsap.set([panelRef.current, backdropRef.current], {
        opacity: 0,
        pointerEvents: "none",
      });
      gsap.set(panelRef.current, { y: 16, scale: 0.98 });
    } else {
      gsap.to(backdropRef.current, {
        opacity: 0,
        duration: 0.3,
        ease: ease.outQuart,
        onComplete: () => {
          gsap.set([panelRef.current, backdropRef.current], { pointerEvents: "none" });
        },
      });
      gsap.to(panelRef.current, {
        opacity: 0,
        y: 16,
        scale: 0.98,
        duration: 0.3,
        ease: ease.outQuart,
      });
    }
  }, [open]);

  return (
    <>
      <div
        ref={backdropRef}
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 z-40 bg-black/50 opacity-0 pointer-events-none"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className="fixed bottom-28 left-1/2 z-50 w-[min(85vw,20rem)] -translate-x-1/2 rounded-lg bg-black/90 p-8 opacity-0 pointer-events-none shadow-2xl backdrop-blur-2xl sm:p-10"
      >
        <Eyebrow tone="light" className="mb-6">
          Menu
        </Eyebrow>
        <nav className="flex flex-col gap-1">
          {navLinks.map((link, i) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                ref={i === 0 ? firstLinkRef : undefined}
                href={link.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={`font-sans text-3xl font-semibold transition-colors duration-300 sm:text-4xl ${
                  isActive ? "text-white" : "text-white/70 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 font-mono text-xs tracking-[0.08em] text-white/60 uppercase sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1 break-all normal-case">
            <p>{site.phone}</p>
            <p>{site.email}</p>
          </div>
        </div>

        <Button href="/contact" onClick={onNavigate} className="mt-8 w-full justify-center">
          Get a Quote
        </Button>
      </div>
    </>
  );
}
