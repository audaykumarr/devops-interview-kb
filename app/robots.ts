import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Parameterized search/practice views are a JS-rendered subset of already-indexed
      // category/technology pages; disallowing avoids thin/duplicate-content crawl.
      disallow: ["/search?*", "/practice?*"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
