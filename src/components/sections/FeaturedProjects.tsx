import { projects } from "@/lib/data/projects";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/Divider";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { ProjectRow } from "@/components/projects/ProjectRow";

export function FeaturedProjects() {
  return (
    <section className="bg-white px-6 py-20 sm:px-10 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <Divider className="mb-10" />
        <Eyebrow className="mb-6">Featured Projects</Eyebrow>

        <RevealOnScroll className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading className="max-w-xl text-3xl sm:text-4xl">
            Every project carries the same discipline, from a single
            addition to a 400,000 square foot tower.
          </SectionHeading>
          <Button href="/projects">View Projects</Button>
        </RevealOnScroll>

        <div className="mt-16 border-t border-black/10">
          {projects.map((project, index) => (
            <ProjectRow key={project.slug} project={project} delay={index * 0.04} />
          ))}
        </div>
      </div>
    </section>
  );
}
