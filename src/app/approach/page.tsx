import type { Metadata } from "next";
import { principles, heroImage, heroSketchSrc } from "@/lib/data/approach";
import { site } from "@/lib/data/site";
import { ApproachHero } from "@/components/sections/ApproachHero";
import { ApproachProcess } from "@/components/sections/ApproachProcess";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { ClosingCta } from "@/components/sections/ClosingCta";

export const metadata: Metadata = {
  title: `Our Approach - ${site.name}`,
  description:
    "How Sterling Arch Construction runs a project: one accountable team, budget discipline from day one, and crews who stay on site through closeout.",
};

export default function ApproachPage() {
  return (
    <main>
      <ApproachHero
        eyebrow="Our Approach"
        heading="One accountable team, from first sketch to final walkthrough."
        intro="Every project we take on runs the same way: design and cost estimating together, our own crews on the phases that matter most, and one team accountable from groundbreaking to occupancy."
        image={heroImage}
        sketchSrc={heroSketchSrc}
      />

      <section className="bg-background px-6 pt-20 pb-20 sm:px-10 sm:pt-28 sm:pb-28">
        <div className="mx-auto max-w-6xl">
          <Eyebrow className="mb-10">Principles</Eyebrow>
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-x-16 sm:gap-y-14">
            {principles.map((principle, index) => (
              <RevealOnScroll
                key={principle.title}
                delay={index * 0.05}
                className="border-t border-black/10 pt-6"
              >
                <h3 className="text-2xl font-medium text-black">{principle.title}</h3>
                <p className="mt-3 max-w-md leading-relaxed text-black/70">
                  {principle.description}
                </p>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      <ApproachProcess />

      <ClosingCta />
    </main>
  );
}
