import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

export function Philosophy() {
  return (
    <section className="bg-background px-6 py-20 sm:px-10 sm:py-24">
      <RevealOnScroll className="mx-auto flex max-w-4xl flex-col items-center text-center">
        <Eyebrow className="mb-6">About Sterling Arch</Eyebrow>
        <h2 className="text-3xl leading-[1.15] font-medium text-balance text-black sm:text-5xl">
          We bring architectural vision to life through precision and
          discipline. Trusted by owners and developers who demand a
          structure built to outperform its blueprint.
        </h2>
        <Button href="/about" className="mt-10">
          Who We Are
        </Button>
      </RevealOnScroll>
    </section>
  );
}
