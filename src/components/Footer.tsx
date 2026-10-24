"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";
import { site } from "@/lib/data/site";
import { getProject, projects } from "@/lib/data/projects";
import { services } from "@/lib/data/services";
import { heroImage as APPROACH_IMAGE } from "@/lib/data/approach";
import { Button } from "@/components/ui/Button";
import { ease } from "@/lib/motion";

type FooterImage = { src: string; alt: string };

// Mirrors Hero.tsx's own backdrop photo, so the homepage footer reads as a
// continuation of the same hero rather than an unrelated image.
const HOME_IMAGE: FooterImage = {
  src: "https://images.unsplash.com/photo-1758846946188-12316e71c680?q=85&w=2400&auto=format&fit=crop",
  alt: "Detail view of a glass and steel building facade with an exposed staircase structure, next to a textured concrete block building",
};

// Mirrors the construction-site photo on the About page.
const ABOUT_IMAGE: FooterImage = {
  src: "https://images.unsplash.com/photo-1742185193142-896ae1a8c15d?q=80&w=2000&auto=format&fit=crop",
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

  function runCrossfade(layer: "A" | "B") {
    const incomingRef = layer === "A" ? layerARef : layerBRef;
    const outgoingRef = layer === "A" ? layerBRef : layerARef;
    frontRef.current = layer;
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) {
      gsap.set(incomingRef.current, { opacity: 1 });
      gsap.set(outgoingRef.current, { opacity: 0 });
      return;
    }
    gsap.to(incomingRef.current, { opacity: 1, duration: 1, ease: ease.outCubic });
    gsap.to(outgoingRef.current, { opacity: 0, duration: 1, ease: ease.outCubic });
  }

  useEffect(() => {
    if (pathname === lastPathnameRef.current) return;
    lastPathnameRef.current = pathname;
    const next = footerImageFor(pathname);
    if (next.src === currentSrcRef.current) return;
    currentSrcRef.current = next.src;
    const back = frontRef.current === "A" ? "B" : "A";
    pendingRef.current = back;
    (back === "A" ? setImageA : setImageB)(next);
  }, [pathname]);

  // contextSafe wraps (and immediately calls) runCrossfade here, inside the
  // event handler itself, rather than once up front during render - the
  // wrap only needs to happen before whichever call actually reads the
  // refs/runs the tween, and doing it here keeps every ref access confined
  // to an event-handler callback.
  function handleLoadA() {
    if (pendingRef.current !== "A") return;
    pendingRef.current = null;
    contextSafe(() => runCrossfade("A"))();
  }
  function handleLoadB() {
    if (pendingRef.current !== "B") return;
    pendingRef.current = null;
    contextSafe(() => runCrossfade("B"))();
  }

  return (
    <footer
      ref={footerRef}
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-black text-white"
    >
      <div ref={parallaxRef} className="absolute inset-x-0 top-[-25%] h-[150%] w-full">
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
