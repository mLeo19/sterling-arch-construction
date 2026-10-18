export type Service = {
  slug: string;
  label: string;
  blurb: string;
  image: { src: string; alt: string };
};

export const services: Service[] = [
  {
    slug: "commercial-construction",
    label: "Commercial Construction",
    blurb:
      "Ground-up commercial buildings delivered on schedule, from site work through final occupancy.",
    image: {
      src: "https://images.unsplash.com/photo-1778961419928-2968ddd57c05?q=80&w=1600&auto=format&fit=crop",
      alt: "Downtown commercial office tower exterior at sunset",
    },
  },
  {
    slug: "structural-glazing",
    label: "Structural Glazing",
    blurb:
      "Curtain-wall and structural glass facades engineered for precision fit and long-term weather performance.",
    image: {
      src: "https://images.unsplash.com/photo-1482996207824-b0f01de61751?q=80&w=1600&auto=format&fit=crop",
      alt: "Wave-like glass and steel curtain wall facade detail",
    },
  },
  {
    slug: "custom-residences",
    label: "Custom Residences",
    blurb:
      "Architect-led residential builds, engineered with the same rigor we bring to commercial work.",
    image: {
      src: "https://images.unsplash.com/photo-1706808849780-7a04fbac83ef?q=80&w=1600&auto=format&fit=crop",
      alt: "Modern upscale house exterior with pool and lounge chairs",
    },
  },
  {
    slug: "renovations-additions",
    label: "Renovations & Additions",
    blurb:
      "Full-scale renovations and additions that integrate seamlessly with existing structure and systems.",
    image: {
      src: "https://images.unsplash.com/photo-1740446569677-a79c3186a16b?q=80&w=1600&auto=format&fit=crop",
      alt: "Renovated interior with exposed brick wall and loft bed",
    },
  },
  {
    slug: "design-build",
    label: "Design-Build",
    blurb:
      "One team from first drawing to final punch list, so design intent survives contact with the build.",
    image: {
      src: "https://images.unsplash.com/photo-1782290547018-8bb89b8edf07?q=80&w=1600&auto=format&fit=crop",
      alt: "Architect's drafting table with transparent stool and wooden sawhorses",
    },
  },
];
