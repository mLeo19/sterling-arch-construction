import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main>
      <PageHero
        eyebrow="404"
        heading="This page hasn't been built yet."
        intro="The page you're looking for doesn't exist, or has moved. Let's get you back on site."
      />
      <section className="bg-background px-6 pb-28 sm:px-10 sm:pb-36">
        <div className="mx-auto max-w-4xl">
          <Button href="/">Back to homepage</Button>
        </div>
      </section>
    </main>
  );
}
