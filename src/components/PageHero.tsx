import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * Deliberately not wrapped in a scroll-gated reveal. Confirmed on
 * fluid.glass by polling a heading's opacity through a live page
 * transition: it never changes, stays at 1 the entire time - the incoming
 * page's content is always fully opaque, the page-transition pane
 * (scale/translate on its container) is the only motion. A scroll-gated
 * fade here would fight that pane and read as "content pops in late."
 */
export function PageHero({
  eyebrow,
  heading,
  intro,
}: {
  eyebrow: string;
  heading: string;
  intro?: string;
}) {
  return (
    <section className="bg-white px-6 pt-40 pb-16 sm:px-10 sm:pt-48 sm:pb-20">
      <div className="mx-auto max-w-4xl">
        <Eyebrow className="mb-6">{eyebrow}</Eyebrow>
        <SectionHeading>{heading}</SectionHeading>
        {intro ? (
          <p className="mt-6 max-w-xl text-base leading-relaxed text-black/70">
            {intro}
          </p>
        ) : null}
      </div>
    </section>
  );
}
