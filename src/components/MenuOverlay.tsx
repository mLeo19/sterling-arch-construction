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
