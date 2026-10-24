import type { Metadata } from "next";
import Image from "next/image";
import { services } from "@/lib/data/services";
import { site } from "@/lib/data/site";
import { PageHero } from "@/components/PageHero";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { ClosingCta } from "@/components/sections/ClosingCta";

export const metadata: Metadata = {
  title: `Services - ${site.name}`,
  description:
    "Commercial construction, structural glazing, custom residences, renovations and additions, and design-build services.",
};

export default function ServicesPage() {
  return (
    <main>
      <PageHero
        eyebrow="Services"
        heading="One team, every discipline a building requires."
        intro="From first sketch to final walkthrough, our service collection covers ground-up construction, structural glazing, renovation, and design-build - all carried by the same team, start to finish."
      />

      <section className="bg-background px-6 pb-24 sm:px-10 sm:pb-32">
        <div className="mx-auto flex max-w-6xl flex-col gap-20 sm:gap-28">
          {services.map((service, index) => (
            <RevealOnScroll
              key={service.slug}
              className={`grid grid-cols-1 items-center gap-8 sm:grid-cols-2 sm:gap-16 ${
                index % 2 === 1 ? "sm:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-sm">
                <Image
                  src={service.image.src}
                  alt={service.image.alt}
                  fill
                  sizes="(min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="font-mono text-sm tracking-[0.1em] text-black/40">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-3 text-3xl font-medium text-black sm:text-4xl">
                  {service.label}
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-black/70">
                  {service.blurb}
                </p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      <ClosingCta />
    </main>
  );
}
