import type { Metadata } from "next";
import { projects } from "@/lib/data/projects";
import { PageHero } from "@/components/PageHero";
import { ProjectRow } from "@/components/projects/ProjectRow";
import { site } from "@/lib/data/site";

export const metadata: Metadata = {
  title: `Projects - ${site.name}`,
  description:
    "Commercial, institutional, and custom residential projects built across the Northeast.",
};

export default function ProjectsPage() {
  return (
    <main>
      <PageHero
        eyebrow="Projects"
        heading="A portfolio built on precision, not spectacle."
        intro="Every project below was designed and built by the same team, start to finish - no subcontracted design, no handoffs between strangers."
      />
      <section className="bg-white px-6 pb-24 sm:px-10 sm:pb-32">
        <div className="mx-auto max-w-6xl border-t border-black/10">
          {projects.map((project) => (
            <ProjectRow key={project.slug} project={project} reveal={false} />
          ))}
        </div>
      </section>
    </main>
  );
}
