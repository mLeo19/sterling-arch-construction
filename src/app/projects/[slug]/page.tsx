import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProject, projects } from "@/lib/data/projects";
import { site } from "@/lib/data/site";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Tag } from "@/components/ui/Tag";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { WordReveal } from "@/components/motion/WordReveal";
import { Parallax } from "@/components/motion/Parallax";
import { PinnedScale } from "@/components/motion/PinnedScale";
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

// Per-tile layout for the gallery grid - deliberately its own value per
// card, not a couple of shared/alternating ones, matching the asymmetric
// bento convention ServicesCollection.tsx already established on this site
// (see its own cardConfig doc comment).
const galleryCardConfig = [
  { span: "sm:col-span-7", aspect: "aspect-[4/3]", offset: "", parallax: 10, sizes: "(min-width: 640px) 58vw, 100vw" },
  { span: "sm:col-span-5", aspect: "aspect-[3/4]", offset: "sm:mt-10", parallax: -14, sizes: "(min-width: 640px) 42vw, 100vw" },
  { span: "sm:col-span-5", aspect: "aspect-[4/5]", offset: "sm:mt-6", parallax: 16, sizes: "(min-width: 640px) 42vw, 100vw" },
  { span: "sm:col-span-7", aspect: "aspect-[16/9]", offset: "", parallax: -10, sizes: "(min-width: 640px) 58vw, 100vw" },
];

export default async function ProjectPage(props: PageProps<"/projects/[slug]">) {
  const { slug } = await props.params;
  const project = getProject(slug);
  if (!project) notFound();

  const currentIndex = projects.findIndex((p) => p.slug === slug);
  const next = projects[(currentIndex + 1) % projects.length];

  return (
    <main>
      <section className="relative flex min-h-[70svh] flex-col justify-end overflow-hidden">
        <Parallax
          amount={10}
          topOfPage
          className="absolute inset-x-0 top-[-10%] h-[120%] w-full"
        >
          <Image
            src={project.heroImage.src}
            alt={project.heroImage.alt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </Parallax>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/40" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-40 pb-16 sm:px-10 sm:pb-20">
          <Eyebrow tone="light" className="mb-4">
            {project.location} - {project.year}
          </Eyebrow>
          <WordReveal
            as="h1"
            text={project.title}
            className="max-w-2xl text-4xl leading-[1.1] font-medium tracking-tight text-balance text-white sm:text-5xl lg:text-6xl"
          />
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
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <Parallax amount={10}>
            <RevealOnScroll className="relative aspect-[4/5] overflow-hidden rounded-sm">
              <Image
                src={project.duo[0].src}
                alt={project.duo[0].alt}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </RevealOnScroll>
          </Parallax>
          <Parallax amount={-10} className="sm:mt-12">
            <RevealOnScroll delay={0.08} className="relative aspect-[4/5] overflow-hidden rounded-sm">
              <Image
                src={project.duo[1].src}
                alt={project.duo[1].alt}
                fill
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover"
              />
            </RevealOnScroll>
          </Parallax>
        </div>
      </section>

      <section className="bg-background px-6 pb-20 sm:px-10 sm:pb-28">
        <div className="mx-auto max-w-6xl">
          <Eyebrow className="mb-10">How It Was Built</Eyebrow>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-x-16 sm:gap-y-14">
            {project.process.map((step, index) => (
              <RevealOnScroll key={step.title} delay={index * 0.05}>
                <p className="font-mono text-sm tracking-[0.1em] text-black/40">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-2xl font-medium text-black">{step.title}</h3>
                <p className="mt-3 max-w-md leading-relaxed text-black/70">
                  {step.description}
                </p>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      <PinnedScale src={project.duo[1].src} alt={project.duo[1].alt}>
        <div className="relative z-10 flex h-full w-full items-center">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-6 sm:grid-cols-2 sm:px-10">
            <div>
              <Eyebrow tone="light" className="mb-4">
                {project.stats[0].label}
              </Eyebrow>
              <p className="text-5xl font-medium text-white sm:text-6xl">
                {project.stats[0].value}
              </p>
            </div>
            <div className="flex flex-col items-start gap-4 sm:items-end sm:text-right">
              <Eyebrow tone="light" className="mb-2">
                Scope
              </Eyebrow>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {project.scopeTags.map((tag) => (
                  <Tag key={tag} tone="light">
                    {tag}
                  </Tag>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PinnedScale>

      <section className="bg-background px-6 pt-20 pb-20 sm:px-10 sm:pt-28 sm:pb-28">
        <div className="mx-auto max-w-6xl">
          <Eyebrow className="mb-10">Gallery</Eyebrow>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:gap-6">
            {project.gallery.map((image, index) => {
              const config = galleryCardConfig[index];
              return (
                <Parallax
                  key={index}
                  amount={config?.parallax ?? 0}
                  className={`${config?.span ?? "sm:col-span-6"} ${config?.offset ?? ""}`}
                >
                  <RevealOnScroll
                    delay={index * 0.05}
                    className={`relative overflow-hidden rounded-sm ${config?.aspect ?? "aspect-[4/5]"}`}
                  >
                    <Image
                      src={image.src}
                      alt={image.alt}
                      fill
                      sizes={config?.sizes ?? "(min-width: 640px) 50vw, 100vw"}
                      className="object-cover"
                    />
                  </RevealOnScroll>
                </Parallax>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-background px-6 pb-20 sm:px-10 sm:pb-28">
        <div className="mx-auto max-w-6xl">
          <Eyebrow className="mb-10">Project Team</Eyebrow>
          <div className="border-t border-black/10">
            {project.credits.map((credit, index) => (
              <RevealOnScroll key={credit.role} delay={index * 0.05}>
                <div className="flex items-center justify-between gap-4 border-b border-black/10 py-5">
                  <span className="font-mono text-xs tracking-[0.1em] text-black/40 uppercase">
                    {credit.role}
                  </span>
                  <span className="text-lg text-black">{credit.name}</span>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
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
