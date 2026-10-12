import Hero from "@/components/Hero";

// Temporary placeholders so the parallax and smooth scroll can be seen in
// action. These will be replaced with real sections later.
const PLACEHOLDER_SECTIONS = [
  { label: "Section 2 (placeholder)", background: "bg-neutral-100" },
  { label: "Section 3 (placeholder)", background: "bg-neutral-200" },
  { label: "Section 4 (placeholder)", background: "bg-neutral-100" },
];

export default function Home() {
  return (
    <main>
      <Hero />
      {PLACEHOLDER_SECTIONS.map((section) => (
        <section
          key={section.label}
          className={`flex min-h-[100svh] items-center justify-center ${section.background}`}
        >
          <span className="text-sm font-medium uppercase tracking-widest text-neutral-400">
            {section.label}
          </span>
        </section>
      ))}
    </main>
  );
}
