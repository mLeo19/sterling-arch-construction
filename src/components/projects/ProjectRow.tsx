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
      className="group flex flex-col gap-3 border-b border-black/10 py-6 transition-colors duration-300 hover:bg-black/[0.03] sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-2"
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
    </Link>
  );

  if (!reveal) return row;

  return <RevealOnScroll delay={delay}>{row}</RevealOnScroll>;
}
