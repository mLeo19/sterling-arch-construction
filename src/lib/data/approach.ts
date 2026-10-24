// w=3840, not the site's usual 2400 - this specific photo is rendered
// inside ApproachHero's deliberately oversized parallax layer (180% height,
// see that component's own doc comment), which forces object-cover to
// stretch a landscape crop to cover a much taller box. On a narrow, tall,
// high-DPR mobile viewport that crop factor compounds with devicePixelRatio
// (often 3x) into a real resolution shortfall - visible as blur - that a
// standard-width source can't cover no matter how the responsive `sizes`
// hint is tuned. Confirmed Unsplash actually has native detail at this
// width for this photo (not an artificial upscale) before raising it.
export const heroImage = {
  src: "https://images.unsplash.com/photo-1706808849780-7a04fbac83ef?q=80&w=3840&auto=format&fit=crop",
  alt: "Modern upscale house exterior with pool and lounge chairs",
};

// Baked offline from heroImage via scripts/bake-approach-sketch.mjs - see
// ApproachHero.tsx's doc comment for why this isn't a live filter.
export const heroSketchSrc = "/images/approach-sketch.png";

export const principles = [
  {
    title: "One team, start to finish",
    description:
      "The same project lead who walks the site at the first excavation signs off on the certificate of occupancy - no handoff between a design phase and a construction phase run by different people.",
  },
  {
    title: "Budget built into every decision",
    description:
      "Estimating runs alongside design, not after it, so a concept is never developed past what it will actually cost to build.",
  },
  {
    title: "Self-performed on the trades that matter",
    description:
      "Site work, structure, and glazing are led by our own crews rather than subcontracted out, keeping schedule control over the phases most likely to slip.",
  },
  {
    title: "Documented like the building will outlive us",
    description:
      "As-builts, warranties, and systems manuals are assembled throughout construction, not reconstructed from memory during closeout.",
  },
];

export const processSteps = [
  {
    label: "01 — Listen & Scope",
    heading: "We listen first, build second.",
    description:
      "Every project starts with understanding how a client actually plans to use and own the building, not just what they want built.",
    image: {
      src: "https://images.unsplash.com/photo-1780733057909-e40d3f4c8cbe?q=80&w=1400&auto=format&fit=crop",
      alt: "Portrait of Richard Solano",
    },
  },
  {
    label: "02 — Design & Price Together",
    heading: "Design and budget, decided together.",
    description:
      "Design and cost estimating run in parallel, so decisions get made with real numbers attached instead of surfacing as a budget problem later.",
    image: {
      src: "https://images.unsplash.com/photo-1782290547018-8bb89b8edf07?q=80&w=1400&auto=format&fit=crop",
      alt: "Architect's drafting table with transparent stool and wooden sawhorses",
    },
  },
  {
    label: "03 — Build With One Team",
    heading: "One crew, start to finish.",
    description:
      "Our own crews lead the phases most likely to slip; trade partners work against a single schedule, not a sequence of separate contracts.",
    image: {
      src: "https://images.unsplash.com/photo-1744735973756-b2efa8be24c8?q=80&w=1400&auto=format&fit=crop",
      alt: "Welder joining structural steel with bright sparks",
    },
  },
  {
    label: "04 — Close Out & Stand Behind It",
    heading: "Finished right. Backed by us.",
    description:
      "Punch list, commissioning, and owner training are scheduled from the start, not improvised in the final weeks - and the warranty carries one signature, ours.",
    image: {
      src: "https://images.unsplash.com/photo-1780369088190-914cc3eee938?q=80&w=1400&auto=format&fit=crop",
      alt: "Spacious modern office lobby with reflective floor and columns",
    },
  },
];
