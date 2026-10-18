import Image from "next/image";
import { services } from "@/lib/data/services";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { Parallax } from "@/components/motion/Parallax";

// Per-card config, not a couple of shared/alternating values - fluid.glass's
// own bento grid staggers every column by its own amount (position, size,
// and scroll speed all differ card to card), not just two values repeated.
const cardConfig = [
  {
    aspect: "aspect-[3/4]",
    mobileY: "translate-y-0",
    desktopY: "sm:translate-y-28",
    parallax: 26,
  },
  {
    aspect: "aspect-square",
    mobileY: "translate-y-14",
    desktopY: "sm:translate-y-0",
    parallax: -22,
  },
  {
    aspect: "aspect-[4/5]",
    mobileY: "translate-y-0",
    desktopY: "sm:translate-y-12",
    parallax: 30,
  },
  {
    aspect: "aspect-[3/4]",
    mobileY: "translate-y-14",
    desktopY: "sm:translate-y-36",
    parallax: -26,
  },
];

export function ServicesCollection() {
  const [first, ...rest] = services;

  return (
    <section className="bg-white px-6 py-20 sm:px-10 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex items-center justify-between gap-4">
          <Eyebrow>Service Collection</Eyebrow>
          <Button href="/services" variant="secondary">
            View Services
          </Button>
        </div>

        <RevealOnScroll className="grid grid-cols-1 items-center gap-10 sm:grid-cols-12">
          <div className="sm:col-span-7">
            <ServiceCard service={first} large />
          </div>
          <div className="sm:col-span-5">
            <p className="text-base leading-relaxed text-black/70">
              Our service collection is defined by precision engineering,
              honest estimating, and durable construction. Built for
              ambitious projects and uncompromising standards.
            </p>
            <Button href="/about" className="mt-8">
              Our Approach
            </Button>
          </div>
        </RevealOnScroll>

        <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4 sm:gap-10">
          {rest.map((service, index) => {
            const config = cardConfig[index];
            return (
              <Parallax
                key={service.slug}
                amount={config?.parallax ?? 0}
                className={`${config?.mobileY ?? ""} ${config?.desktopY ?? ""}`}
              >
                <RevealOnScroll delay={index * 0.05}>
                  <ServiceCard service={service} aspect={config?.aspect} />
                </RevealOnScroll>
              </Parallax>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({
  service,
  large = false,
  aspect = "aspect-[3/4]",
}: {
  service: (typeof services)[number];
  large?: boolean;
  aspect?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-sm ${large ? "aspect-[4/3]" : aspect}`}
    >
      <Image
        src={service.image.src}
        alt={service.image.alt}
        fill
        sizes={large ? "(min-width: 640px) 50vw, 100vw" : "(min-width: 640px) 25vw, 50vw"}
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
        <span className="text-2xl font-medium text-white sm:text-3xl">
          {service.label}
        </span>
      </div>
    </div>
  );
}
