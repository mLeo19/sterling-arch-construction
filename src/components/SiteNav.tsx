"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { MenuOverlay } from "@/components/MenuOverlay";
import { BrandMark } from "@/components/ui/BrandMark";
import { useIntroReady } from "@/components/motion/IntroSequence";
import { useLenis } from "@/components/SmoothScroll";
import { ease, navEntrance } from "@/lib/motion";

const sectionLabels: Record<string, string> = {
  "/": "Home",
  "/projects": "Projects",
  "/services": "Services",
  "/about": "About",
  "/contact": "Contact",
};

function labelForPath(pathname: string) {
  return sectionLabels[pathname] ?? "Sterling Arch";
}

export function SiteNav() {
  const pathname = usePathname();
  const lenisRef = useLenis();
  const [open, setOpen] = useState(false);
  const [previousPathname, setPreviousPathname] = useState(pathname);
  const ready = useIntroReady();
  const navRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const pillBgRef = useRef<HTMLDivElement>(null);
  const borderFrameRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLAnchorElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const burgerLinesRef = useRef<HTMLSpanElement>(null);
  const skipCloseAnimRef = useRef(false);

  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Lock page scroll while the mobile menu is open. `overflow:hidden` alone
  // covers touch/keyboard scrolling regardless of whether Lenis is even
  // running (it's never created on touch devices - see SmoothScroll.tsx);
  // stopping Lenis on top of that halts its own rAF-driven scrollTop writes
  // so it doesn't fight the lock on devices where it is running.
  useEffect(() => {
    if (open) {
      lenisRef?.current?.stop();
      document.body.style.overflow = "hidden";
    } else {
      lenisRef?.current?.start();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open, lenisRef]);

  // Nav entrance: a GSAP timeline gated behind IntroSequence's `ready`, so it
  // rises into place at the exact moment the intro loader's liftoff begins
  // (see IntroSequence.tsx) rather than racing it.
  useGSAP(
    () => {
      if (
        !ready ||
        !navRef.current ||
        !pillRef.current ||
        !pillBgRef.current ||
        !borderFrameRef.current ||
        !iconRef.current
      )
        return;
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReducedMotion) {
        gsap.set(navRef.current, { opacity: 1, y: 0 });
        gsap.set(iconRef.current, { x: 0 });
        return;
      }

      // clip-path, not width - animating width while backdrop-blur is active
      // forces a synchronous layout reflow and a full re-blur every frame.
      // clip-path is compositor-only and reads identically to a width grow.
      // This only clips pillBgRef (the background+blur+content layer) - the
      // border lives on a separate, unclipped borderFrameRef instead (see
      // the doc comment below), so it isn't clipped away along with it.
      const pillRect = pillRef.current.getBoundingClientRect();
      const fullWidth = pillRect.width;
      // Read live, not hardcoded - the bar's own height (hence the
      // icon-sized square this collapses to) is responsive.
      const collapsedWidth = pillRect.height;
      const startInset = Math.max(
        0,
        ((fullWidth - collapsedWidth) / 2 / fullWidth) * 100,
      );

      // The icon starts centered on the bar's horizontal middle (where the
      // collapsed square sits), not at its natural left-aligned spot, so it
      // slides exactly the distance the clip has to grow to reach it.
      const iconRect = iconRef.current.getBoundingClientRect();
      const iconCenterFromPillLeft =
        iconRect.left - pillRect.left + iconRect.width / 2;
      const iconStartX = fullWidth / 2 - iconCenterFromPillLeft;

      // Both endpoints as literal, equally-shaped 4-value inset() strings -
      // the browser renormalizes a literal string down to its shortest
      // equivalent the moment it's committed to style, and a plain .to()
      // would read that renormalized (differently-shaped) value as its
      // implicit start, snapping instead of interpolating. fromTo with both
      // ends spelled out here avoids ever reading a computed style back.
      const collapsedClip = `inset(0% ${startInset}% 0% ${startInset}%)`;
      const expandedClip = "inset(0% 0% 0% 0%)";
      // The border-frame's left/right inset percentages, kept numerically in
      // lockstep with the clip-path above (see the doc comment on
      // borderFrameRef in the JSX for why it's a separate element).
      const collapsedBorderInset = `${startInset}%`;
      const expandedBorderInset = "0%";

      // Off-screen, not just offset, so the rise reads as "climbing up from
      // below" rather than a small nudge. No z-index juggling here (a
      // previous pass gave the nav a *temporary* bump during its rise, then
      // cleared it back to a lower resting value - that requires its timing
      // to stay in sync with PageTransition's own z-index release on every
      // future retune of either file, and it didn't: speeding up the nav's
      // entrance without also speeding up PageTransition's initial-load
      // z-index release left a window where the pane (temporarily z-101)
      // sat above the already-reverted nav (back to its old resting z-50) -
      // nav visible, then hidden, then visible again once the pane's own
      // elevation finally cleared. Fixed at the root: the nav's resting
      // z-index (see the className below) is now permanently above anything
      // PageTransition or the intro overlay ever use, so there's no
      // temporary state to keep synchronized at all.
      gsap.set(navRef.current, { opacity: 1, y: 180 });
      gsap.set(pillBgRef.current, { clipPath: collapsedClip });
      gsap.set(borderFrameRef.current, {
        left: collapsedBorderInset,
        right: collapsedBorderInset,
      });
      gsap.set(iconRef.current, { x: iconStartX });
      gsap.set(labelRef.current, { yPercent: 100 });
      // Collapsed to nothing from their left edge, so the reveal reads as
      // each bar drawing itself in left-to-right.
      //
      // clip-path, not scaleX - the bars also carry a Tailwind
      // transition-transform class (for the separate open/close X-morph
      // further down). GSAP's scaleX writes the `scale` CSS property every
      // frame, which that Tailwind transition would also try to ease over
      // its own duration, layering a second competing animation on top.
      // clip-path never touches transform/scale at all.
      if (burgerLinesRef.current) {
        gsap.set(burgerLinesRef.current.children, {
          clipPath: "inset(0% 100% 0% 0%)",
        });
      }

      // Durations below live in src/lib/motion.ts (navEntrance), not as
      // local consts here - Hero.tsx's own text-entrance timing is derived
      // from this nav's actual settle time (via
      // navEntranceSettleTime/heroTextBudget), so the two can't drift out
      // of sync the way separately-hand-tuned constants eventually do. See
      // the doc comment on navEntrance itself for why growStartRatio and
      // growEase both changed from the originally rAF-measured fluid.glass
      // values: side-by-side comparison against the live site showed the
      // short, collapsed pill needs to visibly rise into place *first*,
      // with the elongation reading as a distinct, visible second beat
      // rather than an near-instant snap to full width.
      const RISE_DURATION = navEntrance.riseDuration;
      const GROW_DURATION = navEntrance.growDuration;
      const ICON_DURATION = navEntrance.iconDuration;
      const LABEL_DURATION = navEntrance.labelDuration;
      const BURGER_DURATION = navEntrance.burgerDuration;
      const BURGER_STAGGER = navEntrance.burgerStagger;
      const growStart = RISE_DURATION * navEntrance.growStartRatio;
      const sharedStart = navEntrance.sharedStart;

      const tl = gsap.timeline({ delay: navEntrance.delay });
      tl.to(
        navRef.current,
        { y: 0, duration: RISE_DURATION, ease: ease.inOutQuart },
        0,
      )
        .fromTo(
          pillBgRef.current,
          { clipPath: collapsedClip },
          {
            clipPath: expandedClip,
            duration: GROW_DURATION,
            ease: navEntrance.growEase,
          },
          growStart,
        )
        // Same duration/ease/position as the clip-path tween above, so the
        // border's visible edges track the growing pane exactly - this is
        // what keeps the left/right edges shown throughout the grow instead
        // of only appearing once it finishes (they'd otherwise be clipped
        // away along with everything else inside pillBgRef, same as the top/
        // bottom edges never are, since those are never clipped at all).
        .fromTo(
          borderFrameRef.current,
          { left: collapsedBorderInset, right: collapsedBorderInset },
          {
            left: expandedBorderInset,
            right: expandedBorderInset,
            duration: GROW_DURATION,
            ease: navEntrance.growEase,
          },
          growStart,
        )
        .to(
          iconRef.current,
          { x: 0, duration: ICON_DURATION, ease: ease.outQuart },
          sharedStart,
        )
        .to(
          labelRef.current,
          { yPercent: 0, duration: LABEL_DURATION, ease: ease.outQuart },
          sharedStart,
        )
        .fromTo(
          burgerLinesRef.current ? burgerLinesRef.current.children : [],
          { clipPath: "inset(0% 100% 0% 0%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: BURGER_DURATION,
            ease: "power2.out",
            stagger: BURGER_STAGGER,
          },
          sharedStart,
        )
        .set(pillBgRef.current, { clipPath: "none" });
    },
    { dependencies: [ready] },
  );

  const hasPlayedInitialLabelReveal = useRef(false);

  useGSAP(
    () => {
      if (!ready || !labelRef.current) return;
      // The main entrance timeline above already owns revealing this label
      // the very first time ready goes true - only real subsequent pathname
      // changes should trigger this plain crossfade.
      if (!hasPlayedInitialLabelReveal.current) {
        hasPlayedInitialLabelReveal.current = true;
        return;
      }
      gsap.fromTo(
        labelRef.current,
        { opacity: 0, y: 4 },
        { opacity: 1, y: 0, duration: 0.35, ease: ease.outQuart },
      );
    },
    { dependencies: [pathname, ready] },
  );

  const hasPlayedInitialOpenState = useRef(false);

  // The whole pill collapses back down to the same icon-sized square it
  // grows from on load when the mobile menu opens, with the logo/label
  // fading out and the button sliding into that square's center - reusing
  // the same clip-path technique and recenter-via-computed-offset trick as
  // the entrance grow above, just aimed at the button instead.
  useGSAP(
    () => {
      if (
        !ready ||
        !pillRef.current ||
        !pillBgRef.current ||
        !borderFrameRef.current ||
        !iconRef.current ||
        !labelRef.current ||
        !buttonRef.current
      )
        return;
      if (!hasPlayedInitialOpenState.current) {
        hasPlayedInitialOpenState.current = true;
        return;
      }
      const pillRect = pillRef.current.getBoundingClientRect();
      const fullWidth = pillRect.width;
      const collapsedWidth = pillRect.height;
      const inset = Math.max(0, ((fullWidth - collapsedWidth) / 2 / fullWidth) * 100);
      const collapsedClip = `inset(0% ${inset}% 0% ${inset}%)`;
      const expandedClip = "inset(0% 0% 0% 0%)";
      const collapsedBorderInset = `${inset}%`;
      const expandedBorderInset = "0%";

      const buttonRect = buttonRef.current.getBoundingClientRect();
      const buttonCenterFromPillLeft =
        buttonRect.left - pillRect.left + buttonRect.width / 2;
      const buttonCenterOffset = fullWidth / 2 - buttonCenterFromPillLeft;

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (prefersReducedMotion) {
        skipCloseAnimRef.current = false;
        gsap.set(pillBgRef.current, { clipPath: open ? collapsedClip : "none" });
        gsap.set(borderFrameRef.current, {
          left: open ? collapsedBorderInset : expandedBorderInset,
          right: open ? collapsedBorderInset : expandedBorderInset,
        });
        gsap.set([iconRef.current, labelRef.current], { opacity: open ? 0 : 1 });
        gsap.set(buttonRef.current, { x: open ? buttonCenterOffset : 0 });
        return;
      }

      const duration = 0.3;
      if (open) {
        gsap.fromTo(
          pillBgRef.current,
          { clipPath: expandedClip },
          { clipPath: collapsedClip, duration, ease: ease.outQuart },
        );
        gsap.fromTo(
          borderFrameRef.current,
          { left: expandedBorderInset, right: expandedBorderInset },
          {
            left: collapsedBorderInset,
            right: collapsedBorderInset,
            duration,
            ease: ease.outQuart,
          },
        );
        gsap.to([iconRef.current, labelRef.current], {
          opacity: 0,
          duration: duration * 0.6,
          ease: ease.outQuart,
        });
        gsap.to(buttonRef.current, { x: buttonCenterOffset, duration, ease: ease.outQuart });
      } else if (skipCloseAnimRef.current) {
        // Closing because a menu link was actually clicked, not because the
        // user backed out via the X/backdrop - real navigation is a click
        // away, and PageTransition is about to run its own much bigger
        // rise/scale/darken animation on top of this same instant. Snapping
        // straight to the resting state (no tween) removes the competing
        // motion instead of visibly un-collapsing right as the new page
        // starts rising.
        skipCloseAnimRef.current = false;
        gsap.set(pillBgRef.current, { clipPath: "none" });
        gsap.set(borderFrameRef.current, {
          left: expandedBorderInset,
          right: expandedBorderInset,
        });
        gsap.set([iconRef.current, labelRef.current], { opacity: 1 });
        gsap.set(buttonRef.current, { x: 0 });
      } else {
        gsap.fromTo(
          pillBgRef.current,
          { clipPath: collapsedClip },
          {
            clipPath: expandedClip,
            duration,
            ease: ease.outQuart,
            onComplete: () => gsap.set(pillBgRef.current, { clipPath: "none" }),
          },
        );
        gsap.fromTo(
          borderFrameRef.current,
          { left: collapsedBorderInset, right: collapsedBorderInset },
          {
            left: expandedBorderInset,
            right: expandedBorderInset,
            duration,
            ease: ease.outQuart,
          },
        );
        gsap.to([iconRef.current, labelRef.current], {
          opacity: 1,
          duration,
          delay: duration * 0.3,
          ease: ease.outQuart,
        });
        gsap.to(buttonRef.current, { x: 0, duration, ease: ease.outQuart });
      }
    },
    { dependencies: [open, ready] },
  );

  return (
    <>
      <div
        ref={navRef}
        // z-[110]: permanently above PageTransition's pane (max z-101, see
        // that file) and the intro overlay (z-100) - see the doc comment
        // above for why this replaced a temporary rise-only bump. Staying
        // invisible the rest of the time is handled by opacity, not z-index
        // (opacity-0 below, until the entrance timeline sets it to 1), so
        // sitting above everything at rest the whole session is harmless.
        className="fixed bottom-10 left-1/2 z-[110] -translate-x-1/2 opacity-0"
      >
        <div
          ref={pillRef}
          // Fluidly scales with viewport width (vw units) rather than fixed
          // breakpoint sizes, mobile-first with an `sm:` override at
          // Tailwind's 640px breakpoint. Just a sizing/positioning wrapper -
          // the background+blur (pillBgRef, clipped) and the border
          // (borderFrameRef, unclipped) are separate children so the border
          // can stay unclipped - see the doc comment on borderFrameRef below.
          className="relative flex h-[13.333vw] w-[73.6vw] sm:h-[3.125vw] sm:w-[17.25vw]"
        >
          <div
            ref={pillBgRef}
            className="absolute inset-0 flex items-center bg-black/80 backdrop-blur-[5.333vw] sm:backdrop-blur-[1.25vw]"
          >
            <Link
              ref={iconRef}
              href="/"
              aria-label="Sterling Arch Construction - home"
              className="flex h-[13.333vw] w-[13.333vw] shrink-0 items-center justify-center text-white sm:h-[3.125vw] sm:w-[3.125vw]"
            >
              <BrandMark
                className="h-[6.4vw] w-[6.4vw] sm:h-[1.5vw] sm:w-[1.5vw]"
                strokeWidth={3.2}
              />
            </Link>
            <span className="flex-1 overflow-hidden px-3">
              <span
                ref={labelRef}
                className="block text-center font-mono text-[3.2vw] font-medium tracking-[0.08em] text-white uppercase sm:text-[0.75vw]"
              >
                {labelForPath(pathname)}
              </span>
            </span>
            <button
              ref={buttonRef}
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
              className="flex h-[13.333vw] w-[13.333vw] shrink-0 items-center justify-center text-white transition-opacity duration-300 hover:opacity-70 sm:h-[3.125vw] sm:w-[3.125vw]"
            >
              <span
                ref={burgerLinesRef}
                className="relative block h-[2.933vw] w-[5.333vw] sm:h-[0.6875vw] sm:w-[1.25vw]"
              >
                <span
                  className={`absolute left-0 top-0 h-[1.5px] w-full bg-current transition-transform duration-300 ${
                    open ? "translate-y-[1.3vw] rotate-45 sm:translate-y-[0.3vw]" : ""
                  }`}
                />
                <span
                  className={`absolute top-1/2 left-0 h-[1.5px] w-full -translate-y-1/2 bg-current transition-opacity duration-300 ${
                    open ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`absolute bottom-0 left-0 h-[1.5px] w-full bg-current transition-transform duration-300 ${
                    open ? "-translate-y-[1.3vw] -rotate-45 sm:-translate-y-[0.3vw]" : ""
                  }`}
                />
              </span>
            </button>
          </div>
          {/* Unclipped sibling of pillBgRef, so its border never gets cut by
              that element's clip-path - a clipped `border` (tried first)
              only ever shows its top/bottom edges, since those axes are
              never clipped, while left/right stay invisible until the clip
              finishes growing (they're clipped away along with everything
              else inside pillBgRef until then). This div has no clip-path at
              all; its left/right *insets* are animated directly instead, in
              lockstep with pillBgRef's clip-path (same duration/ease/
              position in every timeline above), so the border's visible
              edges track the growing pane exactly instead of popping in only
              once it's done. */}
          <div
            ref={borderFrameRef}
            aria-hidden
            className="pointer-events-none absolute inset-y-0 border border-white/25"
          />
        </div>
      </div>
      <MenuOverlay
        open={open}
        returnFocusRef={buttonRef}
        onClose={() => setOpen(false)}
        onNavigate={() => {
          skipCloseAnimRef.current = true;
          setOpen(false);
        }}
      />
    </>
  );
}
