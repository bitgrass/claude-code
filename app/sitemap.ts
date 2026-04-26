import type { MetadataRoute } from "next";
import { site } from "@/content/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: site.meta.url,
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
