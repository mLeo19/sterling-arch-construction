import type { Metadata } from "next";
import { site } from "@/lib/data/site";
import { PageHero } from "@/components/PageHero";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ContactForm } from "@/components/contact/ContactForm";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

export const metadata: Metadata = {
  title: `Contact - ${site.name}`,
  description:
    "Get in touch with Sterling Arch Construction to start a commercial, institutional, or custom residential project.",
};

export default function ContactPage() {
  return (
    <main>
      <PageHero
        eyebrow="Contact"
        heading="Every great building begins with a conversation."
        intro="Tell us about the project, the site, and the timeline - we'll follow up within one business day to schedule a first walkthrough."
      />

      <section className="bg-white px-6 pb-28 sm:px-10 sm:pb-36">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-16 sm:grid-cols-[1fr_1.4fr]">
          <RevealOnScroll className="flex flex-col gap-10">
            <div>
              <Eyebrow className="mb-4">Studio</Eyebrow>
              <p className="text-black">
                {site.address.line1}
                <br />
                {site.address.line2}
              </p>
            </div>
            <div>
              <Eyebrow className="mb-4">Direct</Eyebrow>
              <p className="text-black">{site.phone}</p>
              <p className="text-black">{site.email}</p>
            </div>
            <div>
              <Eyebrow className="mb-4">Hours</Eyebrow>
              <p className="text-black/80">{site.hours}</p>
            </div>
          </RevealOnScroll>

          <RevealOnScroll delay={0.08}>
            <ContactForm />
          </RevealOnScroll>
        </div>
      </section>
    </main>
  );
}
