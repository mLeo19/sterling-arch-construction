"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { pageTransitionSettleDuration } from "@/lib/motion";
import { site } from "@/lib/data/site";
import { getProject, projects } from "@/lib/data/projects";
import { services } from "@/lib/data/services";
import { heroImage as APPROACH_IMAGE } from "@/lib/data/approach";
import { Button } from "@/components/ui/Button";

type FooterImage = { src: string; alt: string };

// Mirrors Hero.tsx's own backdrop photo, so the homepage footer reads as a
// continuation of the same hero rather than an unrelated image.
const HOME_IMAGE: FooterImage = {
  src: "/images/photo-1758846946188-12316e71c680.jpg",
  alt: "Detail view of a glass and steel building facade with an exposed staircase structure, next to a textured concrete block building",
};

// Mirrors the construction-site photo on the About page.
const ABOUT_IMAGE: FooterImage = {
  src: "/images/photo-1742185193142-896ae1a8c15d.jpg",
  alt: "Construction site with cranes and buildings being built",
};

// Keyed off the current route - fluid.glass's own footer shows different
// backdrop photography depending on which page you're on rather than one
// fixed image. Resolved from imagery already established elsewhere in the
// project (project heroes, service photos) rather than introducing new,
// unrelated stock photos.
function footerImageFor(pathname: string): FooterImage {
  if (pathname.startsWith("/projects/")) {
    const project = getProject(pathname.slice("/projects/".length));
    if (project) return project.heroImage;
  }
  if (pathname === "/projects") return projects[0].heroImage;
  if (pathname === "/services") return services[0].image;
  if (pathname === "/approach") return APPROACH_IMAGE;
  if (pathname === "/about") return ABOUT_IMAGE;
  if (pathname === "/contact") {
    return services.find((s) => s.slug === "design-build")?.image ?? HOME_IMAGE;
  }
  return HOME_IMAGE;
}

export function Footer() {
  const pathname = usePathname();
  const initialImage = footerImageFor(pathname);
  const [imageA, setImageA] = useState<FooterImage>(initialImage);
  const [imageB, setImageB] = useState<FooterImage>(initialImage);
  const footerRef = useRef<HTMLElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);
  const layerARef = useRef<HTMLDivElement>(null);
  const layerBRef = useRef<HTMLDivElement>(null);
  // Which layer is currently the visible one.
  const frontRef = useRef<"A" | "B">("A");
  // Set right before swapping a (currently hidden) layer's image src, so
  // that layer's onLoad knows the load it's seeing is the one this pending
  // crossfade is waiting on - cleared once the crossfade actually runs.
  // Without this, the fade would start the instant the src prop changes,
  // before the new photo has actually decoded, showing a blank flash
  // underneath the outgoing photo for however long the new one takes to load.
  const pendingRef = useRef<"A" | "B" | null>(null);
  const currentSrcRef = useRef(initialImage.src);
  const lastPathnameRef = useRef(pathname);
  // The in-flight gsap.delayedCall scheduled by the pathname effect below,
  // killed and replaced on every new navigation - see that effect's own
  // doc comment for the exact race this prevents: without it, navigating
  // away again before a scheduled crossfade actually fires left that stale
  // call free to run later and flip this footer's visible layer to
  // whatever image happened to be loaded on it at that later moment, not
  // necessarily the current route's - confirmed live, toggling quickly
  // between /approach and /services, as the footer's backdrop showing the
  // wrong page's photo.
  const pendingTweenRef = useRef<gsap.core.Tween | null>(null);
  // Whether the pending layer's image has actually fired onLoad yet - set
  // by handleLoadA/handleLoadB, read by the settle timer below (and vice
  // versa: whichever of the two - the timer firing, or the load finishing -
  // happens LAST is what actually triggers the crossfade). Reset to false
  // on every new navigation.
  const loadedRef = useRef(false);
  // Whether this navigation's settle timer has already fired once (while
  // still waiting on a slow image load) - lets handleLoadA/handleLoadB
  // know the crossfade is now on them as soon as the load finishes,
  // instead of double-scheduling another delayedCall.
  const settleElapsedRef = useRef(false);

  // Backdrop parallax, the same technique and swing as Hero.tsx's own (see
  // that file's doc comment for the overhang math): the wrapper is 150% of
  // the section's height, centered on it (top: -25%), so a yPercent swing
  // of 15 (actual pixel travel 15 * 1.5 = 22.5% of the wrapper) stays safely
  // inside the 25% overhang without exposing an edge. Runs for as long as
  // the footer is scrolling into view, finishing its full swing exactly as
  // the page reaches its true bottom (end: "bottom bottom") - this is the
  // last section, so there's no further scroll past it to run the second
  // half of a normal entry-to-exit parallax range against.
  useGSAP(
    () => {
      if (!parallaxRef.current) return;
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      if (prefersReducedMotion) return;

      gsap.fromTo(
        parallaxRef.current,
        { yPercent: -15 },
        {
          yPercent: 15,
          ease: "none",
          scrollTrigger: {
            trigger: footerRef.current,
            start: "top bottom",
            end: "bottom bottom",
            scrub: true,
          },
        },
      );
    },
    { scope: footerRef },
  );

  const { contextSafe } = useGSAP();

  // Instant, not an animated crossfade - once it actually runs (see the
  // delayedCall in handleLoadA/handleLoadB below for *when* that is), it's
  // a hard cut, not a tween. An animated fade here never gets to play out
  // cleanly anyway: a PageTransition entrance is always running at the same
  // moment (every pathname change triggers both), as a second, independent,
  // unsynchronized timeline on top of the main transition's own rise - the
  // moment of both partially-opaque layers overlapping read as a visible
  // glitch rather than a smooth crossfade. The two-layer wait-for-load
  // mechanism itself still matters regardless (see pendingRef's doc comment
  // - swapping before the new photo has decoded would show a blank flash).
  function runCrossfade(layer: "A" | "B") {
    const incomingRef = layer === "A" ? layerARef : layerBRef;
    const outgoingRef = layer === "A" ? layerBRef : layerARef;
    frontRef.current = layer;
    gsap.set(incomingRef.current, { opacity: 1 });
    gsap.set(outgoingRef.current, { opacity: 0 });
  }

  // Schedules the settle timer from NAVIGATION itself (this effect, keyed
  // on pathname), not from the image's own onLoad - see the comment above
  // handleLoadA/handleLoadB below for why that distinction is the actual
  // fix here, not just a refactor. contextSafe is already in scope (see
  // useGSAP() above).
  useEffect(() => {
    if (pathname === lastPathnameRef.current) return;
    lastPathnameRef.current = pathname;
    const next = footerImageFor(pathname);
    if (next.src === currentSrcRef.current) return;
    currentSrcRef.current = next.src;
    // Cancels a crossfade still scheduled from a previous, now-superseded
    // navigation - see pendingTweenRef's own doc comment above for the
    // exact bug this prevents. Without this, navigating away again (even
    // back to the route this footer had been showing before) while an
    // earlier crossfade was still waiting out its own delayedCall left
    // that stale call free to fire later regardless, flipping this
    // footer's visible layer to whatever `src` that layer's <img>
    // happened to have at that point - which, since frontRef doesn't
    // update until a crossfade actually *runs*, consecutive rapid
    // navigations always target the same hidden layer, repeatedly
    // overwriting its `src` out from under an earlier, still-pending
    // crossfade meant for a different route entirely.
    pendingTweenRef.current?.kill();
    pendingTweenRef.current = null;
    loadedRef.current = false;
    settleElapsedRef.current = false;
    const back = frontRef.current === "A" ? "B" : "A";
    pendingRef.current = back;
    (back === "A" ? setImageA : setImageB)(next);

    pendingTweenRef.current = gsap.delayedCall(
      pageTransitionSettleDuration,
      contextSafe(() => {
        pendingTweenRef.current = null;
        settleElapsedRef.current = true;
        // Only run now if the image already finished loading - otherwise
        // handleLoadA/handleLoadB (below) will see settleElapsedRef
        // already true and fire the crossfade themselves the instant the
        // load actually completes.
        if (loadedRef.current) runCrossfade(back);
      }),
    );
  }, [pathname, contextSafe]);

  // Delayed by pageTransitionSettleDuration (lib/motion.ts), not run the
  // instant the image loads - this footer is outside PageTransition
  // entirely (see layout.tsx), so it's never hidden behind that component's
  // own rising pane the way the rest of a page's content is. Running this
  // crossfade immediately on load swapped this footer's own backdrop to
  // the *new* route's photo the moment that photo finished decoding -
  // often within single-digit milliseconds, since it's frequently the
  // exact same file Hero.tsx already preloaded - well before the incoming
  // pane had even started its own visible rise. If this footer happened to
  // be anywhere near the viewport at that moment (scrolled partway down a
  // page, say), the user saw that same photo flash in on its own, unscaled
  // and un-animated, *before* the real pane later rose over the same spot
  // showing it again - reading as a duplicated, broken transition rather
  // than one clean reveal.
  //
  // The delay itself is now scheduled from navigation time by the pathname
  // effect above, NOT from this onLoad handler - these two just flag that
  // the load side of the race finished, and fire the crossfade directly
  // only if the timer side had already elapsed first. Confirmed live
  // (Playwright, polling the footer's own <img src>/opacity through a real
  // navigation): anchoring the delay to onLoad instead, like this file used
  // to, put the crossfade's own clock on a different, later-starting timer
  // than the page's own reveal - which, since the View Transitions rewrite,
  // runs on a fixed CSS clock with no dependency on image decode at all.
  // Even with the new photo already warm in cache, onLoad still fires some
  // nonzero time after navigation starts (a frame or more), and that gap
  // added directly onto the flat delay meant this footer's backdrop was
  // reliably still showing the *previous* route's photo for a visible beat
  // after the transition had already fully settled and the live page was
  // right there on screen - exactly the reported "wrong background image"
  // bug. Anchoring the timer to navigation time instead keeps it in lockstep
  // with the CSS transition's own clock in the common case (image already
  // loaded), while still never forcing a hidden, undecoded image visible
  // early in the slow-network/cold-cache case - whichever of the two
  // actually finishes last is what fires the crossfade.
  function handleLoadA() {
    if (pendingRef.current !== "A") return;
    pendingRef.current = null;
    loadedRef.current = true;
    if (settleElapsedRef.current) runCrossfade("A");
  }
  function handleLoadB() {
    if (pendingRef.current !== "B") return;
    pendingRef.current = null;
    loadedRef.current = true;
    if (settleElapsedRef.current) runCrossfade("B");
  }

  return (
    <footer
      ref={footerRef}
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black text-white"
    >
      <div
        ref={parallaxRef}
        className="absolute inset-x-0 top-[-25%] h-[150%] w-full"
      >
        <div ref={layerARef} className="absolute inset-0">
          <Image
            src={imageA.src}
            alt={imageA.alt}
            fill
            sizes="100vw"
            className="object-cover"
            onLoad={handleLoadA}
          />
        </div>
        <div ref={layerBRef} className="absolute inset-0 opacity-0">
          <Image
            src={imageB.src}
            alt={imageB.alt}
            fill
            sizes="100vw"
            className="object-cover"
            onLoad={handleLoadB}
          />
        </div>
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black" />

      <p
        aria-hidden
        className="pointer-events-none absolute -bottom-[0.12em] left-1/2 w-full -translate-x-1/2 text-center text-[22vw] leading-none font-medium whitespace-nowrap text-white/[0.08] select-none"
      >
        {site.shortName}
      </p>

      {/* Brand/contact block, pinned high in the section rather than at the
          bottom - the auto-opening nav panel (see SiteNav.tsx) docks
          centered in the lower portion of the screen once this footer is
          fully scrolled into view, and a 3-column content grid down there
          (the previous layout) sat directly underneath it. No separate
          "Menu" links column either - that's what the nav panel itself is
          for now that it opens automatically here; repeating the same four
          links in both places was redundant even before the overlap.
          No max-w-6xl cap here either (unlike the bottom bar below) -
          the nav panel itself is up to 40rem wide and horizontally
          centered (see MenuOverlay.tsx), so this block needs to clear a
          fixed-width zone around the viewport's own center, not a
          percentage of some narrower content column. Letting brand/studio
          push out toward the true viewport edges via justify-between on a
          full-width row keeps them clear of that zone at any viewport
          width, rather than just at the specific one last checked. */}
      <div className="relative w-full px-6 pt-28 sm:px-10 sm:pt-36">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-2xl font-semibold text-white">{site.name}</p>
            <p className="mt-3 max-w-[26ch] text-sm text-white/60">
              {site.tagline}
            </p>
            <Button href="/contact" className="mt-6">
              Get a Quote
            </Button>
          </div>

          <div className="font-mono text-xs tracking-[0.08em] text-white/60 uppercase sm:text-right">
            <p className="mb-3 text-white/40">Studio</p>
            <p className="normal-case">{site.address.line1}</p>
            <p className="normal-case">{site.address.line2}</p>
            <p className="mt-3 normal-case">{site.phone}</p>
            <p className="normal-case">{site.email}</p>
          </div>
        </div>
      </div>

      {/* Bottom bar only - pinned to the very bottom edge via mt-auto, but
          deliberately thin and spread full-width (copyright far left,
          socials far right) rather than centered, so it clears the
          horizontally-centered nav panel docked above it instead of sitting
          directly underneath it. */}
      <div className="relative mt-auto mx-auto w-full max-w-6xl px-6 pb-6 sm:px-10 sm:pb-8">
        <div className="flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 font-mono text-[0.65rem] tracking-[0.08em] text-white/40 uppercase sm:flex-row sm:items-center">
          <p>© 2026, {site.name}</p>
          <div className="flex gap-6">
            {site.socials.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="transition-colors duration-300 hover:text-white"
              >
                {social.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
