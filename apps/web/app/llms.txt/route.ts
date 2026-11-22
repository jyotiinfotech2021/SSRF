import { SITE, SITE_NAME } from "@/lib/seo";

export const dynamic = "force-dynamic"; // uses the public address read at request time

/** A plain-text guide for AI search tools: what the site is and where its main pages are. Every claim on the site cites its sources. */
export function GET() {
  const p = (path: string) => `${SITE}${path}`;
  const body = `# ${SITE_NAME}

> A historical research and preservation initiative on Lieutenant General Sagat Singh (1919–2001): his campaigns at Goa (1961), Nathu La (1967) and the Meghna crossing (1971), with the evidence behind every claim. Each claim on the site names its sources and says how well it is supported.

## Main pages
- [Biography](${p("/biography")}): his life, with sources for each statement
- [Campaigns](${p("/campaigns")}): Goa 1961, Nathu La 1967 and the 1971 war
- [Digital archive](${p("/archive")}): catalogued documents, photographs and records
- [Library](${p("/library")}): books, articles, theses and official records about him
- [Videos](${p("/videos")}): documentaries and talks by other people, linked to the originals
- [Recognition register](${p("/recognition")}): memorials, roads and institutions named after him
- [Sources](${p("/sources")}): every source cited, classified as primary, oral history, family testimony, secondary or tertiary
- [Learning centre](${p("/learn")}): classroom material, a quiz and resources for teachers
- [Stories](${p("/stories")}): memoirs and recollections from families and veterans
- [Events](${p("/events")}) and [Chapters](${p("/chapters")})

## About the site
- [About and standards of evidence](${p("/about")}): how claims are judged and how corrections are made
- [Corrections](${p("/about/corrections")})
- [Sitemap](${p("/sitemap.xml")})

## How to cite
Cite the page address and the original source named on that page. Material is credited to its creators; videos and articles by others are linked, not copied.
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
