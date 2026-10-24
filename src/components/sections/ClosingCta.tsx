import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { site } from "@/lib/data/site";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

export function ClosingCta() {
  return (
    <section className="bg-background px-6 pt-4 pb-20 sm:px-10 sm:pb-28">
      <div className="mx-auto max-w-6xl">
        <div className="flex justify-end pb-10">
          <span className="font-mono text-[0.7rem] tracking-[0.1em] text-black/50 uppercase">
            {site.trustLine}
          </span>
        </div>

        <RevealOnScroll className="relative overflow-hidden border border-black/15 p-10 sm:p-16">
          <CornerAccent className="top-0 right-0 rotate-0" />
          <CornerAccent className="bottom-0 left-0 rotate-180" />

          <Eyebrow className="mb-6">Where Vision Meets Execution</Eyebrow>
          <SectionHeading className="max-w-xl">
            Every great building begins with a conversation.
          </SectionHeading>

          <div className="mt-10 flex flex-wrap items-center gap-6">
            <Button href="/contact">Start a Project</Button>
            <Button href="/services" variant="secondary">
              Our Services
            </Button>
          </div>
        </RevealOnScroll>
      </div>
    </section>
  );
}

function CornerAccent({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 96 96"
      className={`pointer-events-none absolute h-20 w-20 text-black/20 sm:h-24 sm:w-24 ${className}`}
    >
      <path d="M0 48 L48 0 L48 96" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}
