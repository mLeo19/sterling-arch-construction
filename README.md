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

- **Custom page transition system** - modeled on fluid.glass: the incoming
  page rises from fully offscreen, growing from a smaller scale up to full
  size, while the outgoing page stays real and visible underneath (darkened
  partway through, so two pages with the same white background don't read
  as one page's text sliding by itself). The outgoing page is never
  unmounted mid-transition - both pages coexist as live, stable React
  subtrees for the transition's duration - except for the one moment it has
  to be swapped out for a static DOM snapshot right before navigating, since
  Next's router would otherwise re-render it to the new route out from
  under the still-visible pane. That snapshot's own position is locked
  independently of the live page underneath it, which stays frozen (height
  and all) regardless of whatever route it silently re-renders to - see the
  doc comments around `handleClick`/`TransitionPane` in `PageTransition.tsx`
  for the handful of narrow, scroll-position-dependent bugs this correctness
  took a few rounds to chase down.
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
