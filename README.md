# Sterling Arch Construction

A marketing site for a fictional commercial general contractor, built as a
portfolio piece focused on scroll-driven motion design and animation
engineering rather than a typical CRUD/content site.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack, Cache Components / Partial Prerendering)
- React 19, TypeScript
- [GSAP](https://gsap.com) + ScrollTrigger for all motion
- [Lenis](https://lenis.darkroom.engineering) for smooth scroll
- Tailwind CSS 4

## Notable technical details

- **Custom page transition system** - a solid vertical-columns wipe that
  covers the screen before swapping routes underneath, deliberately never
  touching, measuring, or cloning the live page content. That constraint
  is what keeps it immune to the cross-browser flashing/repaint bugs a
  more elaborate clone-and-crossfade transition would otherwise chase.
- **Scroll-driven hero and pinned sections** - parallax drift, pinned-scale
  cinematic moments, and a horizontal scroll-jacked process section, all
  built on GSAP ScrollTrigger rather than CSS scroll-timeline.
- **Offline-baked pencil-sketch effect** - the `/approach` hero's sketch-to-
  photo reveal is pixel-processed once at build time (edge detection +
  color-based region suppression) and baked to a static PNG, instead of
  running expensive per-frame canvas filters during scroll.
- **Per-word mask-reveal headlines** - reusable `WordReveal` component used
  across the homepage and project pages.
- Fully static generation (`generateStaticParams` on every dynamic route)
  with Partial Prerendering enabled, no server-side data fetching.
- Self-hosted, `next/image`-optimized images; no remote image dependencies.
- `sitemap.ts` / `robots.ts`, OpenGraph/Twitter metadata, and a themed
  favicon that adapts to dark browser chrome.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm run lint    # eslint
```

## License

All rights reserved - see [LICENSE](./LICENSE). This repository is public
for portfolio purposes; it is not licensed for reuse.
