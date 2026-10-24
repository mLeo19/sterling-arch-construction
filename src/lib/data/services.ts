type ServiceImage = { src: string; alt: string };

export type Service = {
  slug: string;
  label: string;
  blurb: string;
  summary: string;
  stats: { label: string; value: string }[];
  capabilities: string[];
  process: { title: string; description: string }[];
  image: ServiceImage;
  duo: [ServiceImage, ServiceImage];
  relatedProjectSlugs: string[];
};

export const services: Service[] = [
  {
    slug: "commercial-construction",
    label: "Commercial Construction",
    blurb:
      "Ground-up commercial buildings delivered on schedule, from site work through final occupancy.",
    summary:
      "We take commercial projects from site work to final occupancy as a single accountable team, not a chain of subcontractors handed off between phases. The same project lead who walks the site at groundbreaking signs off on the certificate of occupancy.",
    stats: [
      { label: "Typical size", value: "50,000 - 450,000 sq ft" },
      { label: "Typical duration", value: "14 - 26 months" },
      { label: "Delivery", value: "Design-build or CM-at-risk" },
    ],
    capabilities: [
      "Site selection and feasibility studies",
      "Entitlement and permitting",
      "Core & shell construction",
      "Base-building MEP coordination",
      "Tenant fit-out and interiors",
    ],
    process: [
      {
        title: "Pre-construction",
        description:
          "Budget, schedule, and constructability review run alongside design, not after it - so the drawings that go out to bid already reflect what the building actually costs to build.",
      },
      {
        title: "Site & structure",
        description:
          "Our own crews lead sitework, foundations, and structural steel, keeping schedule control over the phases most likely to slip.",
      },
      {
        title: "Envelope & systems",
        description:
          "Glazing, roofing, and MEP rough-in proceed in parallel under one schedule, not staged behind each other the way separate trade contracts usually force.",
      },
      {
        title: "Closeout",
        description:
          "Punch list, commissioning, and owner training are scheduled from day one, not improvised in the final weeks before occupancy.",
      },
    ],
    image: {
      src: "https://images.unsplash.com/photo-1778961419928-2968ddd57c05?q=80&w=1600&auto=format&fit=crop",
      alt: "Downtown commercial office tower exterior at sunset",
    },
    duo: [
      {
        src: "https://images.unsplash.com/photo-1757213576496-1a43a6fe7a43?q=80&w=1400&auto=format&fit=crop",
        alt: "Curved modern glass building facade",
      },
      {
        src: "https://images.unsplash.com/photo-1780369088190-914cc3eee938?q=80&w=1400&auto=format&fit=crop",
        alt: "Spacious modern office lobby with reflective floor and columns",
      },
    ],
    relatedProjectSlugs: ["lakeview-corporate-campus", "meridian-office-tower"],
  },
  {
    slug: "structural-glazing",
    label: "Structural Glazing",
    blurb:
      "Curtain-wall and structural glass facades engineered for precision fit and long-term weather performance.",
    summary:
      "Glazing is where a building's performance and its appearance are decided at once, and where the tolerance for error is smallest. Our glazing crews work from the same shop drawings as our structural team, not a separate subcontractor's own set, so curtain-wall anchorage gets resolved before steel is ever ordered.",
    stats: [
      { label: "Typical size", value: "15,000 - 120,000 sq ft of facade" },
      { label: "Typical duration", value: "8 - 16 months" },
      { label: "Delivery", value: "Design-assist or self-perform" },
    ],
    capabilities: [
      "Curtain-wall and storefront systems",
      "Structural silicone glazing",
      "Unitized facade engineering",
      "Thermal and air-barrier detailing",
      "Mock-up testing and field verification",
    ],
    process: [
      {
        title: "Design-assist",
        description:
          "We join the architect's facade design early, pricing and buildability-checking details while they're still easy to change.",
      },
      {
        title: "Mock-up & testing",
        description:
          "A full-scale mock-up goes through air, water, and structural testing before a single panel is fabricated for the actual building.",
      },
      {
        title: "Fabrication",
        description:
          "Panels are built to shop drawings our own engineers produced, closing the gap between what was designed and what gets installed.",
      },
      {
        title: "Installation",
        description:
          "Sequenced floor by floor against the structural schedule, so glazing is never the trade holding up occupancy.",
      },
    ],
    image: {
      src: "https://images.unsplash.com/photo-1482996207824-b0f01de61751?q=80&w=1600&auto=format&fit=crop",
      alt: "Wave-like glass and steel curtain wall facade detail",
    },
    duo: [
      {
        src: "https://images.unsplash.com/photo-1744735973756-b2efa8be24c8?q=80&w=1400&auto=format&fit=crop",
        alt: "Welder joining structural steel with bright sparks",
      },
      {
        src: "https://images.unsplash.com/photo-1771607906126-2158d563bc6c?q=80&w=1400&auto=format&fit=crop",
        alt: "Modern waterfront apartment buildings with balconies",
      },
    ],
    relatedProjectSlugs: [
      "meridian-office-tower",
      "harbor-district-mixed-use",
      "ashford-hall-restoration",
    ],
  },
  {
    slug: "custom-residences",
    label: "Custom Residences",
    blurb:
      "Architect-led residential builds, engineered with the same rigor we bring to commercial work.",
    summary:
      "A custom home carries the same structural and envelope complexity as a commercial building, just at a scale where every decision is visible. We bring the same estimating discipline and trade coordination from our commercial work to residential projects, rather than treating a house as a smaller, looser version of the same job.",
    stats: [
      { label: "Typical size", value: "3,500 - 12,000 sq ft" },
      { label: "Typical duration", value: "10 - 18 months" },
      { label: "Delivery", value: "Design-build" },
    ],
    capabilities: [
      "Architect collaboration from schematic design",
      "Custom millwork and interior finishes",
      "Structural glass and window-wall systems",
      "Pool, landscape, and site coordination",
      "Smart-home and building-systems integration",
    ],
    process: [
      {
        title: "Design collaboration",
        description:
          "We work alongside your architect from schematic design onward, pricing options in real time instead of bidding a finished set cold.",
      },
      {
        title: "Pre-construction",
        description:
          "Long-lead items - windows, millwork, structural steel - get ordered months before they're needed, not discovered as a schedule risk later.",
      },
      {
        title: "Construction",
        description:
          "One superintendent owns the site from foundation to final walkthrough, so decisions made in month two aren't relitigated in month ten.",
      },
      {
        title: "Finishes & handoff",
        description:
          "A dedicated finish carpentry crew closes out the details a house lives or dies on, with a full systems walkthrough before keys change hands.",
      },
    ],
    image: {
      src: "https://images.unsplash.com/photo-1706808849780-7a04fbac83ef?q=80&w=1600&auto=format&fit=crop",
      alt: "Modern upscale house exterior with pool and lounge chairs",
    },
    duo: [
      {
        src: "https://images.unsplash.com/photo-1740446569677-a79c3186a16b?q=80&w=1400&auto=format&fit=crop",
        alt: "Renovated interior with exposed brick wall and loft bed",
      },
      {
        src: "https://images.unsplash.com/photo-1787653916679-044d55759cd0?q=80&w=1400&auto=format&fit=crop",
        alt: "Weathered red brick industrial building exterior",
      },
    ],
    relatedProjectSlugs: ["union-street-lofts"],
  },
  {
    slug: "renovations-additions",
    label: "Renovations & Additions",
    blurb:
      "Full-scale renovations and additions that integrate seamlessly with existing structure and systems.",
    summary:
      "Renovation work starts with a building that already has its own structure, its own systems, and its own undocumented history of past repairs. We open up existing conditions before pricing a renovation, not after signing a contract, so the budget a client agrees to is the one that survives contact with the actual building.",
    stats: [
      { label: "Typical size", value: "5,000 - 90,000 sq ft" },
      { label: "Typical duration", value: "6 - 19 months" },
      { label: "Delivery", value: "CM-at-risk or self-perform" },
    ],
    capabilities: [
      "Existing-conditions investigation",
      "Historic and landmark restoration",
      "Structural reinforcement and underpinning",
      "Building systems upgrades",
      "Phased construction around occupied space",
    ],
    process: [
      {
        title: "Investigation",
        description:
          "Selective demolition and probes expose what's actually behind existing walls and ceilings before final pricing, catching surprises before they become change orders.",
      },
      {
        title: "Phasing plan",
        description:
          "For occupied buildings, work is sequenced floor by floor or wing by wing so the rest of the building keeps operating.",
      },
      {
        title: "Structural & systems work",
        description:
          "Reinforcement, new MEP runs, and envelope upgrades are coordinated against the building's original structure, not assumed to match a generic as-built.",
      },
      {
        title: "Finishes & closeout",
        description:
          "New work is detailed to read as intentional against what's original, not as a visible patch.",
      },
    ],
    image: {
      src: "https://images.unsplash.com/photo-1740446569677-a79c3186a16b?q=80&w=1600&auto=format&fit=crop",
      alt: "Renovated interior with exposed brick wall and loft bed",
    },
    duo: [
      {
        src: "https://images.unsplash.com/photo-1523550558441-d1f0fd3575d1?q=80&w=1400&auto=format&fit=crop",
        alt: "Scaffolding beside a brown brick historic building",
      },
      {
        src: "https://images.unsplash.com/photo-1787653916679-044d55759cd0?q=80&w=1400&auto=format&fit=crop",
        alt: "Weathered red brick industrial building exterior",
      },
    ],
    relatedProjectSlugs: ["union-street-lofts", "ashford-hall-restoration"],
  },
  {
    slug: "design-build",
    label: "Design-Build",
    blurb:
      "One team from first drawing to final punch list, so design intent survives contact with the build.",
    summary:
      "Design-build puts the architect and the builder on the same contract, answering to the same schedule, from the very first drawing. The gap where most projects lose money and time - the handoff between a design team and a construction team who've never had to agree on a number - doesn't exist here, because there's no handoff.",
    stats: [
      { label: "Typical size", value: "40,000 - 400,000 sq ft" },
      { label: "Typical duration", value: "12 - 26 months" },
      { label: "Delivery", value: "Single-contract design-build" },
    ],
    capabilities: [
      "Integrated design and estimating",
      "Single point of contract accountability",
      "Value engineering during design, not after bid",
      "Fast-track scheduling",
      "Unified warranty across design and construction",
    ],
    process: [
      {
        title: "Concept & budget",
        description:
          "Design and cost estimating happen together from the first sketch, so a concept is never developed past what the budget can actually support.",
      },
      {
        title: "Design development",
        description:
          "Our estimators price each design decision as it's made, keeping the project inside budget by design rather than by cutting scope at the end.",
      },
      {
        title: "Construction",
        description:
          "Early trade packages can break ground while later-phase design is still being finalized, compressing the schedule a design-bid-build contract can't.",
      },
      {
        title: "Single-point closeout",
        description:
          "One contract, one warranty, one team accountable for the building matching the design intent it started from.",
      },
    ],
    image: {
      src: "https://images.unsplash.com/photo-1782290547018-8bb89b8edf07?q=80&w=1600&auto=format&fit=crop",
      alt: "Architect's drafting table with transparent stool and wooden sawhorses",
    },
    duo: [
      {
        src: "https://images.unsplash.com/photo-1778961419928-2968ddd57c05?q=80&w=1400&auto=format&fit=crop",
        alt: "Downtown commercial office tower exterior at sunset",
      },
      {
        src: "https://images.unsplash.com/photo-1757213576496-1a43a6fe7a43?q=80&w=1400&auto=format&fit=crop",
        alt: "Curved modern glass building facade",
      },
    ],
    relatedProjectSlugs: ["meridian-office-tower", "lakeview-corporate-campus"],
  },
];

export function getService(slug: string) {
  return services.find((service) => service.slug === slug);
}
