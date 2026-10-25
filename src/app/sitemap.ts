import type { MetadataRoute } from "next";
import { site } from "@/lib/data/site";
import { projects } from "@/lib/data/projects";
import { services } from "@/lib/data/services";

const staticRoutes = ["", "/about", "/approach", "/contact", "/projects", "/services"];

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries = staticRoutes.map((route) => ({
    url: `${site.url}${route}`,
  }));

  const projectEntries = projects.map((project) => ({
    url: `${site.url}/projects/${project.slug}`,
  }));

  const serviceEntries = services.map((service) => ({
    url: `${site.url}/services/${service.slug}`,
  }));

  return [...staticEntries, ...projectEntries, ...serviceEntries];
}
