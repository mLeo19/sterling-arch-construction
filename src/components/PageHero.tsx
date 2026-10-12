// Simple placeholder hero for pages that don't have real content yet - just
// enough height to scroll so the page transition and parallax can be seen
// working. No animation of its own; replace with real section content later.
export function PageHero({ title, tagline }: { title: string; tagline: string }) {
  return (
    <section className="flex min-h-[150svh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-black sm:text-6xl">
        {title}
      </h1>
      <p className="mt-4 max-w-xl text-base text-black/60 sm:text-lg">
        {tagline}
      </p>
    </section>
  );
}
