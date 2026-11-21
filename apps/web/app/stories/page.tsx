import type { Metadata } from "next";
import Link from "next/link";
import { get, me, canContribute, type Story, type Campaign } from "@/lib/api";
import { PageHead, AssessTag, NatureTag, MemberTag, fmtDate, Unavailable, Empty } from "@/components/ui";
import ContributeForm from "@/components/ContributeForm";
import { SaluteButton } from "@/components/Interact";
import { ERAS, KINDS } from "@/lib/ref";

export const metadata: Metadata = { title: "Stories", description: "Articles, memoirs, anecdotes and videos from members, each labelled as first-hand account, family testimony or research." };
type SP = { searchParams: Promise<{ q?: string; kind?: string; era?: string }> };

export default async function Stories({ searchParams }: SP) {
  const sp = await searchParams;
  const [stories, who, camps, mine, counts] = await Promise.all([get<Story[]>("/api/stories"), me(), get<Campaign[]>("/api/campaigns"), get<string[]>("/api/me/salutes"), get<Record<string, number>>("/api/salutes/counts")]);
  const q = (sp.q ?? "").toLowerCase();
  const rows = (stories ?? []).filter((s) => (!sp.kind || s.kind === sp.kind) && (!sp.era || s.era === sp.era) && (!q || `${s.title} ${s.body ?? ""}`.toLowerCase().includes(q)));
  return (
    <>
      <PageHead title="Stories" lead="First-hand recollections are labelled as such. A published story is not a verified fact until its label says so." />
      {!stories && <Unavailable />}
      <form method="get" className="inline-form" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Search stories" aria-label="Search stories" />
        <select name="kind" defaultValue={sp.kind ?? ""} aria-label="Kind"><option value="">All kinds</option>{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
        <select name="era" defaultValue={sp.era ?? ""} aria-label="Period"><option value="">All periods</option>{ERAS.map((k) => <option key={k}>{k}</option>)}</select>
        <button className="btn small" type="submit">Search</button>
      </form>
      {rows.length ? rows.map((s) => (
        <article key={s.id} className="scard">
          <h3><Link href={`/stories/${s.id}`}>{s.title}</Link></h3>
          <p className="meta">{s.kind}{s.era ? ` · ${s.era}` : ""} · by {s.authorName} · {fmtDate(s.createdAt)}</p>
          <p>{(s.body ?? "").slice(0, 280)}{(s.body ?? "").length > 280 ? "…" : ""}</p>
          <p className="tags"><MemberTag /> <NatureTag n={s.nature} /> <AssessTag k={s.assessment} /></p>
          <SaluteButton id={s.id} initial={!!mine?.includes(s.id)} count={counts?.[s.id] ?? 0} signedIn={!!who.id} />
        </article>)) : <Empty>No stories have been published yet.</Empty>}
      <h2 className="sect">Share a story</h2>
      {canContribute(who) ? <ContributeForm kind="story" camps={(camps ?? []).map((c) => ({ id: c.id, name: c.name }))} /> : <p className="notice">{who.id ? "To contribute, ask the foundation to invite you as a contributor." : <>Please <Link href="/account">sign in</Link> to share a story.</>}</p>}
    </>
  );
}
