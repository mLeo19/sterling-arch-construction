import Image from "next/image";
import Link from "next/link";
import { projects } from "@/lib/data/projects";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

export function ProjectDuo() {
  const project = projects[0];

  return (
    <section className="bg-background px-6 pb-20 sm:px-10 sm:pb-24">
      <div className="mx-auto max-w-6xl">
        <RevealOnScroll className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <div className="group relative aspect-[4/5] overflow-hidden rounded-sm">
            <Image
              src={project.duo[0].src}
              alt={project.duo[0].alt}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
          </div>
          <div className="group relative aspect-[4/5] overflow-hidden rounded-sm sm:mt-12">
            <Image
              src={project.duo[1].src}
              alt={project.duo[1].alt}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
          </div>
        </RevealOnScroll>

        <div className="mt-6 flex items-center justify-between font-mono text-xs tracking-[0.1em] text-black/50 uppercase">
          <span>
            {project.title} - {project.location}
          </span>
          <Link
            href={`/projects/${project.slug}`}
            className="transition-colors duration-300 hover:text-black"
          >
            View project ↳
          </Link>
        </div>
      </div>
    </section>
  );
}
