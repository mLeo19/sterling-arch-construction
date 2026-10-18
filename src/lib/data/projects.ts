type ProjectImage = { src: string; alt: string };

export type Project = {
  slug: string;
  title: string;
  location: string;
  year: string;
  scopeTags: string[];
  summary: string;
  stats: { label: string; value: string }[];
  heroImage: ProjectImage;
  duo: [ProjectImage, ProjectImage];
  gallery: ProjectImage[];
};

function img(id: string, w: number, alt: string): ProjectImage {
  return { src: `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`, alt };
}

export const projects: Project[] = [
  {
    slug: "meridian-office-tower",
    title: "Meridian Office Tower",
    location: "Hartford, Connecticut",
    year: "2024",
    scopeTags: ["New Construction", "Structural Glazing", "Design-Build"],
    summary:
      "A 28-story ground-up office tower, built around a full structural-glass curtain wall and delivered as a single design-build contract from foundation to final occupancy.",
    stats: [
      { label: "Size", value: "412,000 sq ft" },
      { label: "Duration", value: "26 months" },
      { label: "Scope", value: "New construction" },
    ],
    heroImage: img(
      "photo-1778961419928-2968ddd57c05",
      2400,
      "Downtown commercial office tower exterior at sunset"
    ),
    duo: [
      img(
        "photo-1778961419928-2968ddd57c05",
        1400,
        "Downtown commercial office tower exterior at sunset"
      ),
      img(
        "photo-1780369088190-914cc3eee938",
        1400,
        "Spacious modern office lobby with reflective floor and columns"
      ),
    ],
    gallery: [
      img("photo-1757213576496-1a43a6fe7a43", 1000, "Curved modern glass building facade"),
      img(
        "photo-1744735973756-b2efa8be24c8",
        1000,
        "Welder joining structural steel with bright sparks"
      ),
    ],
  },
  {
    slug: "harbor-district-mixed-use",
    title: "Harbor District Mixed-Use",
    location: "New Haven, Connecticut",
    year: "2023",
    scopeTags: ["New Construction", "Structural Glazing", "Interiors & Finishes"],
    summary:
      "A waterfront mixed-use development combining ground-floor retail with residential units above, organized around a glazed atrium that frames the harbor.",
    stats: [
      { label: "Size", value: "186,000 sq ft" },
      { label: "Duration", value: "21 months" },
      { label: "Scope", value: "New construction" },
    ],
    heroImage: img(
      "photo-1771607906126-2158d563bc6c",
      2400,
      "Modern waterfront apartment buildings with balconies"
    ),
    duo: [
      img(
        "photo-1771607906126-2158d563bc6c",
        1400,
        "Modern waterfront apartment buildings with balconies"
      ),
      img(
        "photo-1740446569677-a79c3186a16b",
        1400,
        "Renovated interior with exposed brick wall and loft bed"
      ),
    ],
    gallery: [
      img(
        "photo-1780369088190-914cc3eee938",
        1000,
        "Spacious modern office lobby with reflective floor and columns"
      ),
      img(
        "photo-1706808849780-7a04fbac83ef",
        1000,
        "Modern upscale house exterior with pool and lounge chairs"
      ),
    ],
  },
  {
    slug: "ashford-hall-restoration",
    title: "Ashford Hall Restoration",
    location: "Hartford, Connecticut",
    year: "2022",
    scopeTags: ["Historic Restoration", "Structural Glazing", "Interiors & Finishes"],
    summary:
      "A landmark 1890s stone hall restored to code and reopened as commercial office space, with a new glazed link connecting the original structure to a rear addition.",
    stats: [
      { label: "Size", value: "64,000 sq ft" },
      { label: "Duration", value: "19 months" },
      { label: "Scope", value: "Restoration + addition" },
    ],
    heroImage: img(
      "photo-1523550558441-d1f0fd3575d1",
      2400,
      "Scaffolding beside a brown brick historic building"
    ),
    duo: [
      img(
        "photo-1523550558441-d1f0fd3575d1",
        1400,
        "Scaffolding beside a brown brick historic building"
      ),
      img(
        "photo-1787653916679-044d55759cd0",
        1400,
        "Weathered red brick industrial building exterior"
      ),
    ],
    gallery: [
      img(
        "photo-1740446569677-a79c3186a16b",
        1000,
        "Renovated interior with exposed brick wall and loft bed"
      ),
      img(
        "photo-1782290547018-8bb89b8edf07",
        1000,
        "Architect's drafting table with transparent stool and wooden sawhorses"
      ),
    ],
  },
  {
    slug: "lakeview-corporate-campus",
    title: "Lakeview Corporate Campus",
    location: "Stamford, Connecticut",
    year: "2023",
    scopeTags: ["Commercial Construction", "Design-Build"],
    summary:
      "A three-building corporate campus set around a central green, built as a single design-build commission with a shared mechanical and glazing standard across all three structures.",
    stats: [
      { label: "Size", value: "298,000 sq ft" },
      { label: "Duration", value: "24 months" },
      { label: "Scope", value: "New construction" },
    ],
    heroImage: img("photo-1757213576496-1a43a6fe7a43", 2400, "Curved modern glass building facade"),
    duo: [
      img("photo-1757213576496-1a43a6fe7a43", 1400, "Curved modern glass building facade"),
      img(
        "photo-1780369088190-914cc3eee938",
        1400,
        "Spacious modern office lobby with reflective floor and columns"
      ),
    ],
    gallery: [
      img(
        "photo-1482996207824-b0f01de61751",
        1000,
        "Wave-like glass and steel curtain wall facade detail"
      ),
      img(
        "photo-1706808849780-7a04fbac83ef",
        1000,
        "Modern upscale house exterior with pool and lounge chairs"
      ),
    ],
  },
  {
    slug: "union-street-lofts",
    title: "Union Street Lofts",
    location: "Providence, Rhode Island",
    year: "2024",
    scopeTags: ["Renovation & Addition", "Custom Residences", "Interiors & Finishes"],
    summary:
      "A former textile mill converted into 42 residential lofts, preserving the original timber frame and brick shell while adding a full new building envelope and amenity level.",
    stats: [
      { label: "Size", value: "88,000 sq ft" },
      { label: "Duration", value: "16 months" },
      { label: "Scope", value: "Adaptive reuse" },
    ],
    heroImage: img(
      "photo-1787653916679-044d55759cd0",
      2400,
      "Weathered red brick industrial building exterior"
    ),
    duo: [
      img(
        "photo-1787653916679-044d55759cd0",
        1400,
        "Weathered red brick industrial building exterior"
      ),
      img(
        "photo-1740446569677-a79c3186a16b",
        1400,
        "Renovated interior with exposed brick wall and loft bed"
      ),
    ],
    gallery: [
      img(
        "photo-1523550558441-d1f0fd3575d1",
        1000,
        "Scaffolding beside a brown brick historic building"
      ),
      img(
        "photo-1778961419928-2968ddd57c05",
        1000,
        "Downtown commercial office tower exterior at sunset"
      ),
    ],
  },
];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
