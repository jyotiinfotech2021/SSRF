import type { MetadataRoute } from "next";
import { get, type Campaign, type Story, type ArchiveItem, type Book, type EventItem } from "@/lib/api";
import { SITE } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Entry = MetadataRoute.Sitemap[number];
const last = (...d: (string | null | undefined)[]) => { const t = d.map((x) => (x ? new Date(x).getTime() : 0)).filter((n) => n > 0); return t.length ? new Date(Math.max(...t)) : undefined; };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [camps, stories, archive, books, events] = await Promise.all([get<Campaign[]>("/api/campaigns"), get<Story[]>("/api/stories"), get<ArchiveItem[]>("/api/archive"), get<Book[]>("/api/books"), get<EventItem[]>("/api/events")]);
  const fixed: [string, number, Entry["changeFrequency"]][] = [
    ["", 1, "weekly"], ["/biography", 0.9, "monthly"], ["/campaigns", 0.9, "monthly"], ["/archive", 0.8, "weekly"], ["/learn", 0.8, "monthly"], ["/library", 0.7, "weekly"],
    ["/stories", 0.7, "weekly"], ["/events", 0.7, "weekly"], ["/recognition", 0.7, "weekly"], ["/people", 0.6, "monthly"], ["/videos", 0.6, "monthly"], ["/sources", 0.6, "monthly"],
    ["/chapters", 0.5, "monthly"], ["/members", 0.4, "weekly"], ["/about", 0.5, "yearly"], ["/about/standards", 0.5, "yearly"], ["/about/governance", 0.4, "yearly"], ["/about/corrections", 0.4, "yearly"],
  ];
  const newest = (xs?: { createdAt: string }[] | null) => last(...(xs ?? []).map((x) => x.createdAt));
  const lm: Record<string, Date | undefined> = { "/library": newest(books), "/stories": newest(stories), "/archive": newest(archive), "/events": newest(events) };
  return [
    ...fixed.map(([p, priority, changeFrequency]) => ({ url: SITE + (p || "/"), priority, changeFrequency, lastModified: lm[p] })),
    ...(camps ?? []).map((c) => ({ url: `${SITE}/campaigns/${c.id}`, priority: 0.8, changeFrequency: "monthly" as const })),
    ...(stories ?? []).map((s) => ({ url: `${SITE}/stories/${s.id}`, priority: 0.5, changeFrequency: "monthly" as const, lastModified: last(s.createdAt) })),
    ...(archive ?? []).filter((a) => a.status !== "rejected").map((a) => ({ url: `${SITE}/archive/${a.id}`, priority: 0.6, changeFrequency: "monthly" as const, lastModified: last(a.createdAt) })),
  ];
}
