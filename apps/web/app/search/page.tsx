import type { Metadata } from "next";
import Link from "next/link";
import { get } from "@/lib/api";
import { PageHead, Empty } from "@/components/ui";

export const metadata: Metadata = { title: "Search", robots: { index: false } };
type Res = { type: string; id: string; title: string; snippet?: string; scope?: string };
const HREF: Record<string, (r: Res) => string> = {
  claim: (r) => (r.scope === "life" ? `/biography#${r.id}` : `/campaigns/${r.scope}#${r.id}`), entity: (r) => `/people#${r.id}`, story: (r) => `/stories/${r.id}`,
  book: (r) => `/library#${r.id}`, place: (r) => `/recognition#${r.id}`, event: (r) => `/events#${r.id}`, archive: (r) => `/archive/${r.id}`, member: () => `/members`,
};
const LABEL: Record<string, string> = { claim: "Claim", entity: "Person or unit", story: "Story", book: "Library", place: "Recognition", event: "Event", archive: "Archive", member: "Member" };

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const r = q.trim().length >= 2 ? await get<{ results: Res[] }>(`/api/search?q=${encodeURIComponent(q)}`) : null;
  return (
    <>
      <PageHead title="Search" />
      <form method="get" role="search" className="inline-form"><input name="q" defaultValue={q} aria-label="Search the site" minLength={2} /> <button className="btn small" type="submit">Search</button></form>
      {q.trim().length < 2 ? <p className="meta">Type at least two characters.</p> : !r ? <p className="notice">Search is unavailable right now.</p> : r.results.length ? (
        <ul className="plain">{r.results.map((x) => (
          <li key={x.type + x.id}><span className="tag">{LABEL[x.type]}</span> <Link href={HREF[x.type](x)}>{x.title}</Link>{x.snippet && <div className="meta">{x.snippet.slice(0, 200)}{x.snippet.length > 200 ? "…" : ""}</div>}</li>))}</ul>
      ) : <Empty>Nothing found for &quot;{q}&quot;.</Empty>}
    </>
  );
}
