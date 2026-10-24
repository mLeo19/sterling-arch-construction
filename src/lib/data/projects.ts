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
  process: { title: string; description: string }[];
  credits: { role: string; name: string }[];
  gallery: ProjectImage[];
};

function img(id: string, alt: string): ProjectImage {
  return { src: `/images/${id}.jpg`, alt };
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
      "Downtown commercial office tower exterior at sunset",
    ),
    duo: [
      img(
        "photo-1778961419928-2968ddd57c05",
        "Downtown commercial office tower exterior at sunset",
      ),
      img(
        "photo-1780369088190-914cc3eee938",
        "Spacious modern office lobby with reflective floor and columns",
      ),
    ],
    process: [
      {
        title: "Design & Permitting",
        description:
          "Entitlements, structural-glazing engineering, and life-safety review for a 28-story tower, carried concurrently with early sitework to protect the schedule.",
      },
      {
        title: "Foundation & Core",
        description:
          "Mat foundation and central structural core, sequenced to let floor-by-floor steel erection begin before the core itself topped out.",
      },
      {
        title: "Structural Steel & Curtain Wall",
        description:
          "Floor-by-floor steel erection paired with unitized curtain-wall installation close behind it, closing the building envelope one level at a time.",
      },
      {
        title: "Interior Build-Out & Occupancy",
        description:
          "Core-and-shell handoff to tenant fit-out crews overlapped by floor, bringing the building to full occupancy without waiting on a single top-down finish pass.",
      },
    ],
    credits: [
      { role: "Project Executive", name: "Daniel Reyes" },
      { role: "Site Superintendent", name: "Priya Natarajan" },
      { role: "Architect of Record", name: "Whitfield & Shaw Architecture" },
      { role: "Structural Engineer", name: "Voss Structural Group" },
    ],
    gallery: [
      img(
        "photo-1757213576496-1a43a6fe7a43",
        "Curved modern glass building facade",
      ),
      img(
        "photo-1744735973756-b2efa8be24c8",
        "Welder joining structural steel with bright sparks",
      ),
      img(
        "photo-1482996207824-b0f01de61751",
        "Wave-like glass and steel curtain wall facade detail",
      ),
      img(
        "photo-1782290547018-8bb89b8edf07",
        "Architect's drafting table with transparent stool and wooden sawhorses",
      ),
    ],
  },
  {
    slug: "harbor-district-mixed-use",
    title: "Harbor District Mixed-Use",
    location: "New Haven, Connecticut",
    year: "2023",
    scopeTags: [
      "New Construction",
      "Structural Glazing",
      "Interiors & Finishes",
    ],
    summary:
      "A waterfront mixed-use development combining ground-floor retail with residential units above, organized around a glazed atrium that frames the harbor.",
    stats: [
      { label: "Size", value: "186,000 sq ft" },
      { label: "Duration", value: "21 months" },
      { label: "Scope", value: "New construction" },
    ],
    heroImage: img(
      "photo-1771607906126-2158d563bc6c",
      "Modern waterfront apartment buildings with balconies",
    ),
    duo: [
      img(
        "photo-1771607906126-2158d563bc6c",
        "Modern waterfront apartment buildings with balconies",
      ),
      img(
        "photo-1740446569677-a79c3186a16b",
        "Renovated interior with exposed brick wall and loft bed",
      ),
    ],
    process: [
      {
        title: "Site Prep & Marine Permitting",
        description:
          "Waterfront setback and flood-zone permitting cleared alongside bulkhead and pile-foundation work specific to the harbor-edge site.",
      },
      {
        title: "Foundation & Structural Frame",
        description:
          "Pile-supported foundation and cast-in-place frame built to carry retail below and residential above as two distinct load paths.",
      },
      {
        title: "Glazed Atrium & Envelope",
        description:
          "The structural-glass atrium that organizes the whole building went up alongside the residential envelope, not after it, so the harbor view was never boxed in mid-build.",
      },
      {
        title: "Retail & Residential Fit-Out",
        description:
          "Ground-floor retail shells and upper-floor units finished in parallel crews, reaching substantial completion as one coordinated handoff.",
      },
    ],
    credits: [
      { role: "Project Executive", name: "Elena Castillo" },
      { role: "Site Superintendent", name: "Marcus Webb" },
      { role: "Architect of Record", name: "Dunmore Bay Studio" },
      { role: "Structural Engineer", name: "Harlan & Pierce Engineering" },
    ],
    gallery: [
      img(
        "photo-1780369088190-914cc3eee938",
        "Spacious modern office lobby with reflective floor and columns",
      ),
      img(
        "photo-1706808849780-7a04fbac83ef",
        "Modern upscale house exterior with pool and lounge chairs",
      ),
      img(
        "photo-1744735973756-b2efa8be24c8",
        "Welder joining structural steel with bright sparks",
      ),
      img(
        "photo-1742185193142-896ae1a8c15d",
        "Construction site with cranes and buildings being built",
      ),
    ],
  },
  {
    slug: "ashford-hall-restoration",
    title: "Ashford Hall Restoration",
    location: "Hartford, Connecticut",
    year: "2022",
    scopeTags: [
      "Historic Restoration",
      "Structural Glazing",
      "Interiors & Finishes",
    ],
    summary:
      "A landmark 1890s stone hall restored to code and reopened as commercial office space, with a new glazed link connecting the original structure to a rear addition.",
    stats: [
      { label: "Size", value: "64,000 sq ft" },
      { label: "Duration", value: "19 months" },
      { label: "Scope", value: "Restoration + addition" },
    ],
    heroImage: img(
      "photo-1523550558441-d1f0fd3575d1",
      "Scaffolding beside a brown brick historic building",
    ),
    duo: [
      img(
        "photo-1523550558441-d1f0fd3575d1",
        "Scaffolding beside a brown brick historic building",
      ),
      img(
        "photo-1787653916679-044d55759cd0",
        "Weathered red brick industrial building exterior",
      ),
    ],
    process: [
      {
        title: "Historic Assessment & Code Study",
        description:
          "Full structural and materials survey of the 1890s stonework, reconciled against current commercial code to scope exactly what restoration and what replacement would require.",
      },
      {
        title: "Structural Stabilization & Masonry Restoration",
        description:
          "Stone-by-stone masonry repair and structural reinforcement of the original hall, done from the inside out to preserve the street-facing facade untouched.",
      },
      {
        title: "Glazed Link & Rear Addition",
        description:
          "A new steel-and-glass link building connects the restored hall to a rear addition, built as its own structure so it never bears on the historic frame.",
      },
      {
        title: "Interior Restoration & Finish-Out",
        description:
          "Original woodwork and plaster detail restored where it survived, matched where it didn't, ahead of a full commercial fit-out across both the hall and the addition.",
      },
    ],
    credits: [
      { role: "Project Executive", name: "Thomas Ng" },
      { role: "Site Superintendent", name: "Renata Alvez" },
      { role: "Architect of Record", name: "Corrigan Heritage Architects" },
      { role: "Structural Engineer", name: "Ostrow Preservation Engineering" },
    ],
    gallery: [
      img(
        "photo-1740446569677-a79c3186a16b",
        "Renovated interior with exposed brick wall and loft bed",
      ),
      img(
        "photo-1782290547018-8bb89b8edf07",
        "Architect's drafting table with transparent stool and wooden sawhorses",
      ),
      img(
        "photo-1482996207824-b0f01de61751",
        "Wave-like glass and steel curtain wall facade detail",
      ),
      img(
        "photo-1742185193142-896ae1a8c15d",
        "Construction site with cranes and buildings being built",
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
    heroImage: img(
      "photo-1757213576496-1a43a6fe7a43",
      "Curved modern glass building facade",
    ),
    duo: [
      img(
        "photo-1757213576496-1a43a6fe7a43",
        "Curved modern glass building facade",
      ),
      img(
        "photo-1780369088190-914cc3eee938",
        "Spacious modern office lobby with reflective floor and columns",
      ),
    ],
    process: [
      {
        title: "Master Planning & Design",
        description:
          "One campus-wide design-build contract covering all three buildings, set a shared structural, glazing, and mechanical standard before any sitework began.",
      },
      {
        title: "Sitework & Shared Infrastructure",
        description:
          "Central green, shared utilities, and site drainage built first, giving all three building pads a common foundation to build from.",
      },
      {
        title: "Parallel Structural Build-Out",
        description:
          "All three structures erected in parallel by dedicated crews under one schedule, rather than sequentially building, finishing, and starting over.",
      },
      {
        title: "Campus-Wide Finishes & Commissioning",
        description:
          "Interior finishes and mechanical commissioning rolled across all three buildings against the same standard, reaching occupancy as one coordinated campus, not three separate handoffs.",
      },
    ],
    credits: [
      { role: "Project Executive", name: "Samuel Ortiz" },
      { role: "Site Superintendent", name: "Keiko Tanaka" },
      { role: "Architect of Record", name: "Bramwell Carter Architecture" },
      { role: "Structural Engineer", name: "Finch & Dalton Structural" },
    ],
    gallery: [
      img(
        "photo-1482996207824-b0f01de61751",
        "Wave-like glass and steel curtain wall facade detail",
      ),
      img(
        "photo-1706808849780-7a04fbac83ef",
        "Modern upscale house exterior with pool and lounge chairs",
      ),
      img(
        "photo-1744735973756-b2efa8be24c8",
        "Welder joining structural steel with bright sparks",
      ),
      img(
        "photo-1757213576496-1a43a6fe7a43",
        "Curved modern glass building facade",
      ),
    ],
  },
  {
    slug: "union-street-lofts",
    title: "Union Street Lofts",
    location: "Providence, Rhode Island",
    year: "2024",
    scopeTags: [
      "Renovation & Addition",
      "Custom Residences",
      "Interiors & Finishes",
    ],
    summary:
      "A former textile mill converted into 42 residential lofts, preserving the original timber frame and brick shell while adding a full new building envelope and amenity level.",
    stats: [
      { label: "Size", value: "88,000 sq ft" },
      { label: "Duration", value: "16 months" },
      { label: "Scope", value: "Adaptive reuse" },
    ],
    heroImage: img(
      "photo-1787653916679-044d55759cd0",
      "Weathered red brick industrial building exterior",
    ),
    duo: [
      img(
        "photo-1787653916679-044d55759cd0",
        "Weathered red brick industrial building exterior",
      ),
      img(
        "photo-1740446569677-a79c3186a16b",
        "Renovated interior with exposed brick wall and loft bed",
      ),
    ],
    process: [
      {
        title: "Structural Survey & Timber Frame Assessment",
        description:
          "Every original timber column and brick bearing wall assessed and graded, setting exactly what the existing mill frame could keep carrying under residential loads.",
      },
      {
        title: "Envelope Replacement & Shell Repair",
        description:
          "A full new building envelope installed inside the original brick shell, with masonry repair done wall by wall rather than all at once, to keep the structure sound mid-build.",
      },
      {
        title: "Unit Build-Out & Amenity Level",
        description:
          "42 units built out around the preserved timber frame, with a new rooftop amenity level added as its own lightweight structure rather than loaded onto the original roof framing.",
      },
      {
        title: "Final Finishes & Occupancy",
        description:
          "Exposed-brick and timber finishes throughout, closing out unit by unit as each was completed rather than holding the whole building for one final pass.",
      },
    ],
    credits: [
      { role: "Project Executive", name: "Gabriel Moreau" },
      { role: "Site Superintendent", name: "Aaliyah Banks" },
      { role: "Architect of Record", name: "Stillwater Design Collective" },
      { role: "Structural Engineer", name: "Hale Reinholt Engineering" },
    ],
    gallery: [
      img(
        "photo-1523550558441-d1f0fd3575d1",
        "Scaffolding beside a brown brick historic building",
      ),
      img(
        "photo-1778961419928-2968ddd57c05",
        "Downtown commercial office tower exterior at sunset",
      ),
      img(
        "photo-1782290547018-8bb89b8edf07",
        "Architect's drafting table with transparent stool and wooden sawhorses",
      ),
      img(
        "photo-1742185193142-896ae1a8c15d",
        "Construction site with cranes and buildings being built",
      ),
    ],
  },
];

export function getProject(slug: string) {
  return projects.find((project) => project.slug === slug);
}
