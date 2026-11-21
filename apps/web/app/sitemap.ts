import type { MetadataRoute } from "next";
import { get, type Campaign, type Story, type ArchiveItem } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  const [camps, stories, archive] = await Promise.all([get<Campaign[]>("/api/campaigns"), get<Story[]>("/api/stories"), get<ArchiveItem[]>("/api/archive")]);
  const fixed = ["", "/biography", "/campaigns", "/people", "/archive", "/library", "/videos", "/sources", "/stories", "/members", "/chapters", "/learn", "/events", "/recognition", "/about"];
  return [
    ...fixed.map((p) => ({ url: base + p })),
    ...(camps ?? []).map((c) => ({ url: `${base}/campaigns/${c.id}` })),
    ...(stories ?? []).map((s) => ({ url: `${base}/stories/${s.id}` })),
    ...(archive ?? []).map((a) => ({ url: `${base}/archive/${a.id}` })),
  ];
}
