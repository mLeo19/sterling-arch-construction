export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  portrait: { src: string; alt: string };
};

export const testimonials: Testimonial[] = [
  {
    quote:
      "Sterling Arch delivered our tower two weeks ahead of schedule with zero change orders on the glazing package. That almost never happens.",
    name: "Daniel Ferraro",
    role: "Meridian Office Tower, Hartford CT",
    portrait: {
      src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=400&auto=format&fit=crop",
      alt: "Portrait of a professional man in business attire",
    },
  },
  {
    quote:
      "We interviewed four contractors for the harbor site. Sterling Arch was the only one who flagged a drainage issue before we broke ground, not after.",
    name: "Monica Reyes",
    role: "Harbor District Mixed-Use, New Haven CT",
    portrait: {
      src: "https://images.unsplash.com/photo-1699899657680-421c2c2d5064?q=80&w=400&auto=format&fit=crop",
      alt: "Portrait of a woman with long blonde hair",
    },
  },
  {
    quote:
      "Restoring a landmark building means every surprise behind the walls is expensive. Sterling Arch absorbed three of them without touching our budget.",
    name: "Thomas Whitaker",
    role: "Ashford Hall Restoration, Hartford CT",
    portrait: {
      src: "https://images.unsplash.com/photo-1576558656222-ba66febe3dec?q=80&w=400&auto=format&fit=crop",
      alt: "Portrait of a man in a grey business jacket",
    },
  },
  {
    quote:
      "Running three buildings as one design-build contract sounds efficient on paper. Sterling Arch is the first firm that actually made it work that way.",
    name: "Priya Chandran",
    role: "Lakeview Corporate Campus, Stamford CT",
    portrait: {
      src: "https://images.unsplash.com/photo-1609436132311-e4b0c9370469?q=80&w=400&auto=format&fit=crop",
      alt: "Portrait of a woman in a gray and black scarf",
    },
  },
  {
    quote:
      "Keeping the original timber frame added real cost and complexity. They never once suggested we just tear it out and start over.",
    name: "Adaeze Okafor",
    role: "Union Street Lofts, Providence RI",
    portrait: {
      src: "https://images.unsplash.com/photo-1701096374092-bb70915fdc5c?q=80&w=400&auto=format&fit=crop",
      alt: "Professional portrait of a businesswoman",
    },
  },
];
