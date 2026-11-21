import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export const dynamic = "force-dynamic"; // read the public address at request time, not at build time

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/account", "/search", "/login", "/register", "/forgot-password", "/reset-password"] }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
