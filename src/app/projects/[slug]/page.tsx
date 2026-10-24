import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, projects } from "@/lib/data/projects";
import { site } from "@/lib/data/site";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Tag } from "@/components/ui/Tag";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { ClosingCta } from "@/components/sections/ClosingCta";

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.slug }));
}

// Same reasoning as the services/[slug] route's own instant=false - every
// pixel here depends on the resolved slug, so there's no param-independent
// shell for a <Suspense> boundary to usefully stream content around.
// generateStaticParams above still prerenders every known slug at build
// time; this only opts out of the instant-navigation shell requirement for
// client-side transitions. See
// https://nextjs.org/docs/messages/instant-shell-url-data.
export const instant = false;

export async function generateMetadata(
  props: PageProps<"/projects/[slug]">
): Promise<Metadata> {
  const { slug } = await props.params;
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: `${project.title} - ${site.name}`,
    description: project.summary,
  };
}

export default async function ProjectPage(props: PageProps<"/projects/[slug]">) {
  const { slug } = await props.params;
  const project = getProject(slug);
  if (!project) notFound();

  const currentIndex = projects.findIndex((p) => p.slug === slug);
  const next = projects[(currentIndex + 1) % projects.length];

  return (
    <main>
      <section className="relative flex min-h-[70svh] flex-col justify-end">
        <Image
          src={project.heroImage.src}
          alt={project.heroImage.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/40" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-40 pb-16 sm:px-10 sm:pb-20">
          <Eyebrow tone="light" className="mb-4">
            {project.location} - {project.year}
          </Eyebrow>
          <SectionHeading tone="light" className="max-w-2xl">
            {project.title}
          </SectionHeading>
        </div>
      </section>

      <section className="bg-background px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <RevealOnScroll className="grid grid-cols-1 gap-10 sm:grid-cols-[1fr_2fr]">
            <div className="flex flex-col gap-6">
              {project.stats.map((stat) => (
                <div key={stat.label}>
                  <p className="font-mono text-[0.65rem] tracking-[0.1em] text-black/40 uppercase">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-black">{stat.value}</p>
                </div>
              ))}
              <div className="flex flex-wrap gap-2 pt-2">
                {project.scopeTags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            </div>
            <p className="max-w-2xl text-lg leading-relaxed text-black/80">
              {project.summary}
            </p>
          </RevealOnScroll>
        </div>
      </section>

      <section className="bg-background px-6 pb-16 sm:px-10 sm:pb-20">
        <RevealOnScroll className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm">
            <Image
              src={project.duo[0].src}
              alt={project.duo[0].alt}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-sm sm:mt-12">
            <Image
              src={project.duo[1].src}
              alt={project.duo[1].alt}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </RevealOnScroll>
      </section>

      <section className="bg-background px-6 pb-20 sm:px-10 sm:pb-28">
        <RevealOnScroll className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-3">
          {project.gallery.map((image, i) => (
            <div
              key={i}
              className="relative aspect-[3/4] overflow-hidden rounded-sm"
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 640px) 33vw, 100vw"
                className="object-cover"
              />
            </div>
          ))}
        </RevealOnScroll>
      </section>

      <section className="bg-background px-6 pb-20 sm:px-10 sm:pb-28">
        <div className="mx-auto flex max-w-6xl items-center justify-between border-t border-black/10 pt-8">
          <span className="font-mono text-xs tracking-[0.1em] text-black/50 uppercase">
            Next project
          </span>
          <Link
            href={`/projects/${next.slug}`}
            className="group flex items-center gap-2 text-2xl font-medium text-black transition-colors duration-300 hover:text-black/60"
          >
            {next.title}
            <span
              aria-hidden
              className="font-mono transition-transform duration-300 group-hover:translate-x-1"
            >
              ↳
            </span>
          </Link>
        </div>
      </section>

      <ClosingCta />
    </main>
  );
}
