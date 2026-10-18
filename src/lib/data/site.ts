export const site = {
  name: "Sterling Arch Construction",
  shortName: "Sterling Arch",
  tagline: "Precision-built structures, shaped by craft and engineered to last.",
  phone: "860 555 0192",
  email: "studio@sterlingarch.build",
  address: {
    line1: "480 Foundry Street, Suite 300",
    line2: "Hartford, CT 06103",
  },
  hours: "Monday - Friday, 8am - 5pm. Site visits by appointment.",
  trustLine: "4.9 average across 90+ client reviews",
  socials: [
    { label: "Instagram", href: "#" },
    { label: "LinkedIn", href: "#" },
  ],
} as const;

export const navLinks = [
  { label: "Projects", href: "/projects" },
  { label: "Services", href: "/services" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
] as const;
