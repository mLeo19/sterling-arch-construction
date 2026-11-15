import Image from "next/image";
import Link from "next/link";
import type { Project } from "@/lib/data/projects";
import { Tag } from "@/components/ui/Tag";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

export function ProjectRow({
  project,
  delay = 0,
  reveal = true,
}: {
  project: Project;
  delay?: number;
  /**
   * Set false when this row renders near-immediately visible on page load
   * (the /projects index, right under PageHero) - a scroll-gated reveal
   * there double-dips with the page-transition pane and pops in late.
   * Leave true on the home page, where this list is genuinely reached by
   * scrolling.
   */
  reveal?: boolean;
}) {
  const row = (
    <Link
      href={`/projects/${project.slug}`}
      className="group relative flex flex-col gap-3 border-b border-black/10 py-6 transition-colors duration-300 hover:bg-black/[0.03] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-2"
    >
      <span className="text-2xl font-medium text-black/50 transition-colors duration-300 group-hover:text-black sm:w-64 sm:shrink-0">
        {project.title}
      </span>
      <div className="flex flex-wrap gap-2 sm:flex-1">
        {project.scopeTags.map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </div>
      <span
        aria-hidden
        className="font-mono text-black/30 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-black"
      >
        ↳
      </span>

      {/* Desktop-only reveal thumbnail - fluid.glass's own "Featured
          projects" treats this list as imagery, not plain text (the bento
          grid's zoom-on-hover, reused here: same transition-transform +
          group-hover:scale-110 on the image itself, see ServiceCard/
          ProjectDuo). pointer-events-none since the whole row is already
          the click target; absolute/hidden on mobile where there's no
          spare width for it to land without fighting the stacked tags. */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-16 z-10 hidden h-28 w-44 -translate-y-1/2 translate-x-3 scale-90 overflow-hidden rounded-sm opacity-0 shadow-xl transition-all duration-500 ease-out group-hover:translate-x-0 group-hover:scale-100 group-hover:opacity-100 sm:block"
      >
        <Image
          src={project.heroImage.src}
          alt=""
          fill
          sizes="176px"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
      </div>
    </Link>
  );

  if (!reveal) return row;

  return <RevealOnScroll delay={delay}>{row}</RevealOnScroll>;
}
