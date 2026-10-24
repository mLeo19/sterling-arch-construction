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

// Secondary links (phone/email), separate from the main navLinks list the
// same way fluid.glass's own menu splits its "main" (page) and "sub"
// (secondary) link groups - both get the same entrance reveal, but only the
// sub ones get the underline-sweep hover treatment, matching the reference.
const subLinks = [
  { label: site.phone, href: `tel:${site.phone.replace(/\s+/g, "")}` },
  { label: site.email, href: `mailto:${site.email}` },
];

export function MenuOverlay({
  open,
  onClose,
  onNavigate,
  returnFocusRef,
  skipCloseAnimRef,
  openedByBottomRef,
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
  // True when this open came from scrolling to the very bottom of the page
  // rather than a manual click - see its own doc comment in SiteNav.tsx.
  // Read (never written) here to skip darkening backdropRef on open: the
  // full-screen Footer section behind the panel at that scroll position is
  // already its own dark backdrop (see Footer.tsx), so this one would only
  // double it up.
  openedByBottomRef: RefObject<boolean>;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const quoteWrapRef = useRef<HTMLDivElement>(null);
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
  //
  // preventScroll: true on both calls - without it, focusing an element
  // the browser doesn't consider fully "in view" can trigger its own
  // native scroll-into-view/layout pass, independent of and untimed with
  // whatever GSAP is doing to that same element right now (still mid-
  // entrance, translated and clipped, the moment this runs on open). This
  // is specific to firstLinkRef alone - the only link in the list this
  // component ever calls .focus() on - which is exactly why it was the
  // one link that kept reading as "animating differently" from its
  // siblings even though every GSAP-level check on the tween itself came
  // back identical across all of them.
  useEffect(() => {
    if (open) {
      hasOpenedRef.current = true;
      firstLinkRef.current?.focus({ preventScroll: true });
    } else if (hasOpenedRef.current) {
      returnFocusRef.current?.focus({ preventScroll: true });
    }
  }, [open, returnFocusRef]);

  const { contextSafe } = useGSAP();

  // Per-link hover: the two stacked, identical text lines rendered inside
  // each link (see the JSX below) swap places vertically within the link's
  // own clipped box - studied directly from fluid.glass's compiled menu
  // bundle (their Menu.vue component): on mouseenter both children translate
  // yPercent -100 together (the first line slides up out of its clip box as
  // the second, already-identical line slides up into the same slot from
  // below); mouseleave reverses it. Exact values from that source: no
  // explicit duration (GSAP's own 0.5s default), power3.out.
  function runLinkHoverIn(el: HTMLElement) {
    gsap.to(el.children, { yPercent: -100, duration: 0.5, ease: ease.outCubic });
  }
  function runLinkHoverOut(el: HTMLElement) {
    gsap.to(el.children, { yPercent: 0, duration: 0.5, ease: ease.outCubic });
  }

  // Open/close timeline, durations/eases taken directly from fluid.glass's
  // own compiled Menu.vue (read from their shipped JS/CSS, not guessed
  // from recordings - see the git history for how). Four independently-
  // timed pieces, not one combined panel tween:
  //
  // - background: a separate blurred/tinted layer (not the links' own
  //   backdrop-filter - a dedicated child), scaling 0->1 from its bottom
  //   edge (transform-origin: bottom) rather than fading, so it reads as
  //   the glass pane *growing up* out of the dock point rather than
  //   simply materializing.
  // - links (both the main nav items and the secondary phone/email links,
  //   queried together as one list): slide up from 150% of their own
  //   height to 0 inside their own clipped boxes, 0.8s, all together -
  //   see the doc comment on this tween itself for why no stagger, unlike
  //   the reference.
  // - title ("Menu" label) and the quote button: independent autoAlpha
  //   fades, each starting 0.3s after the others so they visibly trail
  //   the pane/links rather than arriving in the same instant.
  //
  // Closing is faster and simpler than opening: no stagger (every link
  // retreats together), no delays, ease.outCubic instead of inOutCubic -
  // matching the asymmetry in the source exactly (their own open uses
  // power3.inOut throughout; close uses power3.out for everything but the
  // background, which stays power3.inOut both ways).
  useGSAP(() => {
    if (
      !panelRef.current ||
      !backgroundRef.current ||
      !titleRef.current ||
      !navRef.current ||
      !quoteWrapRef.current ||
      !backdropRef.current
    )
      return;
    const links = panelRef.current.querySelectorAll<HTMLElement>("[data-reveal-link]");
    // 150% of each link's own (rendered) height, computed per-element -
    // this project's fluid-vw sizing means that height differs by
    // breakpoint, so a hardcoded pixel figure would be wrong somewhere.
    // Animates `y` (pixels), not `yPercent`, to match the bucket GSAP
    // caches on first touch from this element's own SSR-rendered
    // `translateY(150%)` inline style (see the style prop on each link
    // below) - y/yPercent are independently-tracked, additive buckets in
    // GSAP, so a yPercent tween here would stack on top of that cached
    // pose instead of overwriting it, landing links roughly 2.5x further
    // down than intended on the very first open (confirmed via computed
    // style: ~300% instead of 150%). Same mechanism as Hero.tsx's own
    // per-word reveal - see its doc comment for the full explanation.
    //
    // Read right here, up front, before any of the gsap.set/fromTo calls
    // below touch panelRef/backgroundRef - not inlined as a per-target
    // value function read lazily by gsap.fromTo itself. el.offsetHeight
    // forces the browser to synchronously flush layout at the exact
    // moment it's read; reading it *after* panelRef has already been
    // flipped visible (gsap.set(panelRef.current, {autoAlpha:1}) below)
    // left a real window where that forced flush/recalc could paint a
    // frame with the panel already visible but the links not yet pushed
    // into their hidden y - confirmed by actual video capture (a real
    // click, both dev and a production build) showing "Projects" fully
    // visible at rest before the panel had even started forming. Never
    // caught by computed-style polling from JS, which - being single-
    // threaded - can only ever observe state *after* this whole
    // synchronous effect body finishes running, not a transient paint
    // mid-execution. Reading every height before any visibility-changing
    // mutation removes the forced-recalc opportunity entirely: these
    // elements are still fully laid out while hidden (opacity/visibility
    // don't remove layout), so there's nothing wrong with measuring them
    // this early.
    const linkHiddenYValues = Array.from(links, (el) => el.offsetHeight * 1.5);
    const linkHiddenY = (i: number) => linkHiddenYValues[i] ?? 0;

    if (open) {
      gsap.set([panelRef.current, backdropRef.current], { pointerEvents: "auto" });
      if (openedByBottomRef.current) {
        // No darken-in - see the doc comment on openedByBottomRef above.
        // Still pointerEvents: auto (set just above) though: clicking
        // anywhere on the footer outside the panel should still dismiss it,
        // same as clicking the backdrop normally does.
        gsap.set(backdropRef.current, { opacity: 0, overwrite: true });
      } else {
        // 40% black, 1s ease-in-out - fluid.glass's own page-dim values
        // exactly (a plain CSS `main:before{opacity:1; transition: opacity
        // 1s ease-in-out}` in their source), not this project's earlier
        // guessed 50%/0.4s/power4.out.
        gsap.fromTo(
          backdropRef.current,
          { opacity: 0 },
          { opacity: 0.4, duration: 1, ease: ease.inOutSoft, overwrite: true },
        );
      }
      // overwrite: true here specifically - without it, reopening before a
      // prior close's delayed autoAlpha:0 tween on this same element (see
      // the close branch below) has fired leaves that old tween armed, and
      // it goes off seconds later, yanking the panel invisible again mid-
      // reopen. Confirmed via frame capture: panelOpacity flips back to 0
      // a couple frames into a reopen triggered while the previous close
      // was still inside its first half-second. Every tween below also
      // gets overwrite: true for the same reason - any new open/close
      // cycle has to cleanly supersede whatever the previous one left
      // running, not just append on top of it.
      gsap.set(panelRef.current, { autoAlpha: 1, overwrite: true });
      gsap.fromTo(
        backgroundRef.current,
        { scale: 0 },
        { scale: 1, duration: 0.5, ease: ease.inOutCubic, overwrite: true },
      );
      // opacity included here alongside y, even though fluid.glass's own
      // source animates y only (pure clipped translation, no fade) - a
      // defensive deviation from the reference, not a stylistic one. Real
      // video capture (both dev and a production build, across several
      // runs) showed an occasional frame where a link paints fully
      // visible at its *final* position before the clip/transform has
      // caught up, even though every computed-style check immediately
      // before and after that same click reads the correct hidden
      // position throughout - consistent with a brief paint/composite-
      // level lag between this element's clip-rect and its transform
      // rather than anything wrong with the values GSAP is actually
      // driving. Fading in across the same span means that if a frame
      // ever does land before the clip/transform are fully in sync,
      // what's visible on it is also still close to transparent.
      // No stagger - every link (main nav and the phone/email links alike)
      // animates in lockstep as one unit, not item-by-item. fluid.glass's
      // own source does stagger this (0.02s/item), but at this item count
      // the visible result read as "Projects arriving slightly ahead of
      // the rest," not a deliberate cascade - dropping it to 0 removes any
      // one item's motion from standing apart from the others.
      gsap.fromTo(
        links,
        { y: linkHiddenY, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: ease.inOutCubic,
          overwrite: true,
          // Clears the inline opacity GSAP leaves behind once it reaches
          // 1, handing opacity back to the CSS classes (group-hover/nav
          // dim-siblings + the self-hover !important override) - without
          // this, that inline style permanently outranks the non-
          // !important group-hover class, and hovering the nav list stops
          // dimming its other links the very first time the menu opens.
          clearProps: "opacity",
        },
      );
      gsap.fromTo(
        titleRef.current,
        { autoAlpha: 0 },
        { autoAlpha: 1, delay: 0.3, duration: 0.5, ease: ease.inOutCubic, overwrite: true },
      );
      gsap.fromTo(
        quoteWrapRef.current,
        { autoAlpha: 0 },
        { autoAlpha: 1, delay: 0.3, duration: 0.5, ease: ease.inOutCubic, overwrite: true },
      );
    } else if (skipCloseAnimRef.current) {
      // Closing because a menu link was actually clicked, not because the
      // user backed out via the X/backdrop - real navigation is a click
      // away, and PageTransition is about to run its own rise/scale
      // animation on this same instant. This panel's backdrop-blur is
      // expensive to keep re-rendering every frame while its backdrop (the
      // page behind it) is simultaneously changing under PageTransition's
      // animation - confirmed via a real Safari recording (frame-hashed to
      // find exact stall ranges, not guessed from screenshots) showing the
      // page stuck rendering the same frame for 100-500ms+ stretches right
      // in this exact window, something Chromium never reproduced for the
      // same scenario. Snapping straight to the resting (closed) state
      // removes this panel from that contention entirely, the same fix
      // already applied to the pill's own shape-revert in SiteNav.tsx.
      gsap.set([panelRef.current, backdropRef.current], {
        autoAlpha: 0,
        pointerEvents: "none",
        overwrite: true,
      });
      gsap.set(backgroundRef.current, { scale: 0, overwrite: true });
      gsap.set(links, { y: linkHiddenY, opacity: 0, overwrite: true });
      gsap.set([titleRef.current, quoteWrapRef.current], { autoAlpha: 0, overwrite: true });
    } else {
      gsap.to(backdropRef.current, {
        opacity: 0,
        duration: 1,
        ease: ease.inOutSoft,
        overwrite: true,
        onComplete: () => gsap.set(backdropRef.current, { pointerEvents: "none" }),
      });
      gsap.to(backgroundRef.current, {
        scale: 0,
        duration: 0.5,
        ease: ease.inOutCubic,
        overwrite: true,
      });
      gsap.to(links, {
        y: linkHiddenY,
        opacity: 0,
        duration: 0.5,
        ease: ease.outCubic,
        overwrite: true,
      });
      gsap.to([titleRef.current, quoteWrapRef.current], {
        autoAlpha: 0,
        duration: 0.5,
        ease: ease.outCubic,
        overwrite: true,
      });
      // Panel's own content (background/links/title/button, all animated
      // above) finishes retreating well before the slower 1s backdrop fade
      // does - dropping autoAlpha here at that same 0.5s mark (rather than
      // waiting on the backdrop's own onComplete) takes the now-empty-
      // looking panel out of hit-testing immediately, instead of leaving an
      // invisible but still-clickable 32rem-wide dead zone sitting over the
      // page for the backdrop's remaining half second.
      //
      // This is the tween that exposed the reopen race described on the
      // open branch's own panelRef.current set above: its 0.5s delay means
      // it's still armed for a moment after a close click, and without
      // overwrite: true on *that* set (not this one - this one's own
      // overwrite just covers two closes in a row), reopening in that
      // window didn't stop it - it fired anyway on its original schedule
      // and yanked the freshly-reopened panel back to invisible out from
      // under the open animation. Confirmed via frame capture.
      gsap.to(panelRef.current, { autoAlpha: 0, delay: 0.5, duration: 0, overwrite: true });
    }
  }, [open]);

  return (
    <>
      <div
        ref={backdropRef}
        onClick={onClose}
        aria-hidden
        className="fixed inset-0 z-40 bg-black opacity-0 pointer-events-none"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        // Sizing/position here is fluid.glass's own actual math, not their
        // literal rem numbers taken at face value - their root font-size
        // isn't the browser default 16px, it's a viewport-scaled custom
        // property (`calc((100vw/1600)*10)` desktop, `/375` mobile, read
        // straight out of their shipped CSS), so e.g. their menu's
        // `width:40rem` is really a fluid 25vw (40 * 100/160), not a fixed
        // 640px. Converted every dimension below the same way rather than
        // assuming a 16px rem, and expressed as vw (mobile unprefixed,
        // `sm:` for their ≥601px breakpoint) - the same technique this
        // project's own nav pill already uses in SiteNav.tsx.
        className="fixed bottom-[26.67vw] left-1/2 z-50 w-[85.33vw] -translate-x-1/2 px-[10.67vw] pt-[16vw] pb-[8vw] text-white opacity-0 pointer-events-none sm:bottom-[6.25vw] sm:w-[25vw] sm:px-[2.5vw] sm:pt-[3.75vw] sm:pb-[1.875vw]"
      >
        {/* Sharp corners, no shadow/radius - a dedicated layer behind the
            content (not the panel's own background) so it can scale
            independently from its bottom edge while the content above it
            fades/slides on its own separate timing. Blur radius is the
            same fluid-vw conversion as everything else here (2rem in their
            source). */}
        <div
          ref={backgroundRef}
          aria-hidden
          style={{ transform: "scale(0)" }}
          // 55%, not their literal 80% - at 80% only a fifth of whatever's
          // behind shows through, which reads as "a dark box with a faint
          // vignette" rather than actual frosted glass once the heavy blur
          // is also applied on top. Prioritizing the look they're actually
          // after (visibly translucent, blurred glass) over the literal
          // number measured from their CSS.
          className="absolute inset-0 -z-10 origin-bottom scale-0 bg-black/55 backdrop-blur-[5.33vw] sm:backdrop-blur-[1.25vw]"
        />

        <div ref={titleRef} className="mb-[5.33vw] opacity-0 sm:mb-[1.25vw]">
          <Eyebrow tone="light">Menu</Eyebrow>
        </div>

        <nav ref={navRef} className="group/nav flex flex-col gap-1">
          {navLinks.map((link, i) => {
            const isActive = pathname === link.href;
            return (
              <div key={link.href} className="relative flex items-center">
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute -left-[5.33vw] h-[1.6vw] w-[1.6vw] rotate-45 bg-current opacity-60 sm:-left-[1.25vw] sm:h-[0.375vw] sm:w-[0.375vw]"
                  />
                )}
                {/* Outer overflow-hidden box clips the link's own entrance
                    slide (yPercent 150->0, driven by [data-reveal-link]
                    above); the link itself is a second, independent
                    overflow-hidden box clipping its two stacked text lines
                    for the hover flip below - two nested clip boxes, two
                    separate motions. */}
                <div className="overflow-hidden">
                  <Link
                    data-reveal-link
                    ref={i === 0 ? firstLinkRef : undefined}
                    href={link.href}
                    onClick={onNavigate}
                    onMouseEnter={(e) =>
                      contextSafe(() => runLinkHoverIn(e.currentTarget))()
                    }
                    onMouseLeave={(e) =>
                      contextSafe(() => runLinkHoverOut(e.currentTarget))()
                    }
                    aria-current={isActive ? "page" : undefined}
                    // Hidden pose (pushed below its own clip box) rendered
                    // directly here, not only applied later by the open
                    // effect's own gsap.fromTo "from" value - matches every
                    // other scroll/gate-triggered reveal in this project
                    // (RevealOnScroll, Hero's word reveal, PinnedScale):
                    // without it, this link would paint at rest the instant
                    // `open` flips true and React re-renders (panelRef's
                    // opacity going from the className's 0 to the effect's
                    // autoAlpha:1), one frame before the effect's own
                    // "from" state has had a chance to apply - exactly the
                    // "Projects visible, mid-air, before the slide-in
                    // starts" flash this was built to prevent. A literal
                    // percentage translateY, not px - GSAP decomposes it
                    // into the same yPercent bucket the entrance tween
                    // itself animates, so it's a clean overwrite down to 0
                    // rather than stacking additively on top (see the GSAP
                    // SSR transform bucket note elsewhere in this project).
                    // opacity: 0 alongside it for the same reason the
                    // entrance tween now fades in too (see its own doc
                    // comment) - belt and suspenders against the very
                    // first paint specifically.
                    style={{ transform: "translateY(150%)", opacity: 0 }}
                    className={`relative flex h-[9.6vw] flex-col items-start overflow-hidden font-sans text-[8.53vw] leading-none font-medium opacity-100 transition-opacity duration-0 group-hover/nav:opacity-40 hover:opacity-100! sm:h-[2.25vw] sm:text-[2vw] ${
                      isActive ? "text-white" : "text-white/90"
                    }`}
                  >
                    {/* shrink-0 on both - without it, flexbox's default
                        flex-shrink:1 squeezes these two h-[9.6vw] (sm:
                        h-[2.25vw]) spans down to fit the single-row-tall
                        Link they're stacked in (itself capped at that
                        same height), since together they're double that.
                        The SPAN's own box shrinks correctly, but its
                        *text content* doesn't shrink with it (nothing here
                        clips an individual span, only the Link's own
                        overflow-hidden around both of them together) - so
                        the second, lower span's text kept rendering at
                        its full size inside its own squeezed box and
                        poking a sliver out past the Link's clipped
                        bottom edge, under the first (visible) line. */}
                    <span className="block h-[9.6vw] shrink-0 sm:h-[2.25vw]">
                      {link.label}
                    </span>
                    <span aria-hidden className="block h-[9.6vw] shrink-0 sm:h-[2.25vw]">
                      {link.label}
                    </span>
                  </Link>
                </div>
              </div>
            );
          })}
        </nav>

        <div className="mt-[8vw] flex flex-col gap-2 border-t border-white/10 pt-[4vw] font-mono text-[4.27vw] tracking-[0.08em] text-white/60 normal-case sm:mt-[2.5vw] sm:pt-[1.5vw] sm:text-[1vw]">
          {subLinks.map((link) => (
            <div key={link.href} className="overflow-hidden">
              <a
                data-reveal-link
                href={link.href}
                style={{ transform: "translateY(150%)", opacity: 0 }}
                className="relative inline-block w-fit break-all text-white/60 transition-colors duration-500 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-500 after:[transition-timing-function:cubic-bezier(1,0,0,1)] after:content-[''] hover:text-white hover:after:origin-left hover:after:scale-x-100"
              >
                {link.label}
              </a>
            </div>
          ))}
        </div>

        <div ref={quoteWrapRef} className="mt-[4vw] opacity-0 sm:mt-[1.5vw]">
          <Button href="/contact" onClick={onNavigate} className="w-full justify-center">
            Get a Quote
          </Button>
        </div>
      </div>
    </>
  );
}
