import { PinnedScale } from "@/components/motion/PinnedScale";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Button } from "@/components/ui/Button";
import { site } from "@/lib/data/site";

export function CraftShowcase() {
  return (
    <PinnedScale
      src="https://images.unsplash.com/photo-1744735973756-b2efa8be24c8?q=80&w=2400&auto=format&fit=crop"
      alt="Welder joining structural steel with bright sparks"
    >
      <div className="relative z-10 flex h-full w-full items-center">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-6 sm:grid-cols-2 sm:px-10">
          <div>
            <Eyebrow tone="light" className="mb-4">
              The Craft
            </Eyebrow>
            <SectionHeading tone="light" className="max-w-md text-3xl sm:text-4xl">
              A standard of precision that starts long before the first
              beam goes up.
            </SectionHeading>
          </div>
          <div className="flex flex-col items-start gap-6 sm:items-end sm:text-right">
            <div>
              <p className="font-mono text-[0.7rem] tracking-[0.12em] text-white/60 uppercase">
                Studio
              </p>
              <p className="mt-2 text-white/90">
                {site.address.line1}
                <br />
                {site.address.line2}
              </p>
            </div>
            <Button href="/about" variant="secondary" tone="light">
              Our Process
            </Button>
          </div>
        </div>
      </div>
    </PinnedScale>
  );
}
