import Hero from "@/components/Hero";
import { Philosophy } from "@/components/sections/Philosophy";
import { ServicesCollection } from "@/components/sections/ServicesCollection";
import { CraftShowcase } from "@/components/sections/CraftShowcase";
import { FeaturedProjects } from "@/components/sections/FeaturedProjects";
import { ProjectDuo } from "@/components/sections/ProjectDuo";
import { Testimonials } from "@/components/sections/Testimonials";
import { ClosingCta } from "@/components/sections/ClosingCta";

export default function Home() {
  return (
    <main>
      <Hero />
      <Philosophy />
      <ServicesCollection />
      <CraftShowcase />
      <FeaturedProjects />
      <ProjectDuo />
      <Testimonials />
      <ClosingCta />
    </main>
  );
}
