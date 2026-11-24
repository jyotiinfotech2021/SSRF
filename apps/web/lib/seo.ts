import type { Metadata } from "next";

export const SITE = (process.env.SITE_URL ?? "https://sagatsingh.org").replace(/\/$/, "");
export const SITE_NAME = "Sagat Singh Research Foundation";
export const OG_DEFAULT = "/og-default.jpg";
export const abs = (path: string) => (/^https?:\/\//.test(path) ? path : SITE + (path.startsWith("/") ? path : "/" + path));

/**
 * Per-page metadata: unique title and description, a canonical address (without filters or page numbers, so filtered views
 * do not compete with the page itself), and matching Open Graph / Twitter tags. Nested metadata replaces rather than merges,
 * so the image is repeated here on purpose.
 */
export function pageMeta(title: string, description: string, path: string, image: string = OG_DEFAULT): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | SSRF`, description, url: path, siteName: SITE_NAME, type: "website", locale: "en_IN", images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: "summary_large_image", title: `${title} | SSRF`, description, images: [image] },
  };
}

/**
 * For list pages whose items have no page of their own (videos, library, events, recognition): a link such as
 * /videos?item=<id> gets that item's title, summary and picture in its preview card (WhatsApp, Facebook, LinkedIn),
 * while the canonical address stays the list page, so search engines still see one page. Only an item that exists is
 * ever used; anything else in the address is ignored.
 */
export function itemMeta(base: Metadata, path: string, item?: { title: string; description?: string; image?: string } | null): Metadata {
  if (!item) return base;
  const desc = (item.description ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
  return pageMeta(item.title.slice(0, 70), desc || String(base.description ?? ""), path, item.image || OG_DEFAULT);
}

/** Facts about the subject, taken from the biography entries on this site (each carries its own sources). */
export const SUBJECT = {
  name: "Sagat Singh",
  honorificPrefix: "Lieutenant General",
  honorificSuffix: "PVSM, Padma Bhushan",
  birthDate: "1919-07-14",
  birthPlace: "Kusumdesar, Churu district, Rajasthan, India",
  deathDate: "2001-09-26",
  deathPlace: "New Delhi, India",
  jobTitle: "Lieutenant General, Indian Army",
};
