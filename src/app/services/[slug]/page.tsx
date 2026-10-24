import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getService, services } from "@/lib/data/services";
import { getProject } from "@/lib/data/projects";
import { site } from "@/lib/data/site";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { ProjectRow } from "@/components/projects/ProjectRow";
import { ClosingCta } from "@/components/sections/ClosingCta";

export function generateStaticParams() {
  return services.map((service) => ({ slug: service.slug }));
}

// Every pixel on this page depends on the resolved slug (hero image, stats,
// capabilities, process steps - there's no param-independent "shell" worth
// prerendering separately), so there's nothing a <Suspense> boundary would
// usefully stream in around. Opting out of the instant-navigation shell
// requirement here is the documented escape hatch for exactly this case,
// not a workaround - see https://nextjs.org/docs/messages/instant-shell-url-data.
// generateStaticParams above still makes every known slug a static page at
// build time regardless; this only affects the *shell* Next tries to show
// before that static HTML arrives on a client-side navigation.
export const instant = false;

export async function generateMetadata(
  props: PageProps<"/services/[slug]">
): Promise<Metadata> {
  const { slug } = await props.params;
  const service = getService(slug);
  if (!service) return {};
  return {
    title: `${service.label} - ${site.name}`,
    description: service.blurb,
  };
}

export default async function ServiceDetailPage(props: PageProps<"/services/[slug]">) {
  const { slug } = await props.params;
  const service = getService(slug);
  if (!service) notFound();

  const currentIndex = services.findIndex((s) => s.slug === slug);
  const next = services[(currentIndex + 1) % services.length];
  const relatedProjects = service.relatedProjectSlugs
    .map((projectSlug) => getProject(projectSlug))
    .filter((project) => project !== undefined);

  return (
    <main>
      <section className="relative flex min-h-[70svh] flex-col justify-end">
        <Image
          src={service.image.src}
          alt={service.image.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/40" />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-40 pb-16 sm:px-10 sm:pb-20">
          <Eyebrow tone="light" className="mb-4">
            Services
          </Eyebrow>
          <SectionHeading tone="light" className="max-w-2xl">
            {service.label}
          </SectionHeading>
        </div>
      </section>

      <section className="bg-background px-6 py-16 sm:px-10 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <RevealOnScroll className="grid grid-cols-1 gap-10 sm:grid-cols-[1fr_2fr]">
            <div className="flex flex-col gap-6">
              {service.stats.map((stat) => (
                <div key={stat.label}>
                  <p className="font-mono text-[0.65rem] tracking-[0.1em] text-black/40 uppercase">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-black">{stat.value}</p>
                </div>
              ))}
            </div>
            <p className="max-w-2xl text-lg leading-relaxed text-black/80">
              {service.summary}
            </p>
          </RevealOnScroll>
        </div>
      </section>

      <section className="bg-background px-6 pb-16 sm:px-10 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <RevealOnScroll>
            <Eyebrow className="mb-6">What&apos;s included</Eyebrow>
            <ul className="grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
              {service.capabilities.map((capability) => (
                <li
                  key={capability}
                  className="flex items-start gap-3 border-t border-black/10 pt-4 text-black/80"
                >
                  <span aria-hidden className="mt-1 font-mono text-black/30">
                    ↳
                  </span>
                  {capability}
                </li>
              ))}
            </ul>
          </RevealOnScroll>
        </div>
      </section>

      <section className="bg-background px-6 pb-16 sm:px-10 sm:pb-20">
        <RevealOnScroll className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
          <div className="group relative aspect-[4/5] overflow-hidden rounded-sm">
            <Image
              src={service.duo[0].src}
              alt={service.duo[0].alt}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
          </div>
          <div className="group relative aspect-[4/5] overflow-hidden rounded-sm sm:mt-12">
            <Image
              src={service.duo[1].src}
              alt={service.duo[1].alt}
              fill
              sizes="(min-width: 640px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            />
          </div>
        </RevealOnScroll>
      </section>

      <section className="bg-background px-6 pb-20 sm:px-10 sm:pb-28">
        <div className="mx-auto max-w-6xl">
          <Eyebrow className="mb-10">How it works</Eyebrow>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-x-16 sm:gap-y-14">
            {service.process.map((step, index) => (
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

      {relatedProjects.length > 0 && (
        <section className="bg-background px-6 pb-20 sm:px-10 sm:pb-28">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 flex items-center justify-between gap-4">
              <Eyebrow>Related projects</Eyebrow>
              <Button href="/projects" variant="secondary">
                View All Projects
              </Button>
            </div>
            <div className="border-t border-black/10">
              {relatedProjects.map((project) => (
                <ProjectRow key={project.slug} project={project} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-background px-6 pb-20 sm:px-10 sm:pb-28">
        <div className="mx-auto flex max-w-6xl items-center justify-between border-t border-black/10 pt-8">
          <span className="font-mono text-xs tracking-[0.1em] text-black/50 uppercase">
            Next service
          </span>
          <Link
            href={`/services/${next.slug}`}
            className="group flex items-center gap-2 text-2xl font-medium text-black transition-colors duration-300 hover:text-black/60"
          >
            {next.label}
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
