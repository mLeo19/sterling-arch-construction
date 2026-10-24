import type { Metadata } from "next";
import Image from "next/image";
import { founder, credentials, stats } from "@/lib/data/about";
import { site } from "@/lib/data/site";
import { PageHero } from "@/components/PageHero";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Divider } from "@/components/ui/Divider";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { ClosingCta } from "@/components/sections/ClosingCta";

export const metadata: Metadata = {
  title: `About - ${site.name}`,
  description:
    "The studio, the principal, and the credentials behind Sterling Arch Construction.",
};

export default function AboutPage() {
  return (
    <main>
      <PageHero
        eyebrow="About Sterling Arch"
        heading="Built by one team, from first drawing to final occupancy."
        intro="Sterling Arch Construction is a design-build general contractor working on commercial, institutional, and custom residential projects - ground-up builds and whole-building renovations for clients who plan to own the asset for decades."
      />

      <section className="bg-background px-6 pb-20 sm:px-10 sm:pb-28">
        <div className="mx-auto max-w-6xl">
          <Divider className="mb-16" />
          <RevealOnScroll className="grid grid-cols-1 gap-10 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-medium text-black sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-2 font-mono text-[0.65rem] tracking-[0.1em] text-black/50 uppercase">
                  {stat.label}
                </p>
              </div>
            ))}
          </RevealOnScroll>
        </div>
      </section>

      <section className="bg-background px-6 pb-24 sm:px-10 sm:pb-32">
        <RevealOnScroll className="mx-auto grid max-w-6xl grid-cols-1 items-start gap-10 sm:grid-cols-[280px_1fr] sm:gap-16">
          <div className="relative aspect-[3/4] overflow-hidden rounded-sm grayscale">
            <Image
              src={founder.portrait.src}
              alt={founder.portrait.alt}
              fill
              sizes="280px"
              className="object-cover"
            />
          </div>
          <div>
            <Eyebrow className="mb-4">{founder.role}</Eyebrow>
            <h2 className="text-3xl font-medium text-black sm:text-4xl">
              {founder.name}
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-black/80">
              {founder.bio}
            </p>

            <p className="mt-10 mb-3 font-mono text-[0.65rem] tracking-[0.1em] text-black/50 uppercase">
              Credentials
            </p>
            <ul className="space-y-2 text-sm text-black/70">
              {credentials.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </RevealOnScroll>
      </section>

      <section className="relative h-[60svh] min-h-[420px] w-full overflow-hidden">
        <Image
          src="/images/photo-1742185193142-896ae1a8c15d.jpg"
          alt="Construction site with cranes and buildings being built"
          fill
          sizes="100vw"
          className="object-cover"
        />
      </section>

      <ClosingCta />
    </main>
  );
}
