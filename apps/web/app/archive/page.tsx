import type { Metadata } from "next";
import Link from "next/link";
import { get, me, canContribute, isEditor, type ArchiveItem, type Campaign } from "@/lib/api";
import { PageHead, StatusTag, NatureTag, Unavailable, Empty } from "@/components/ui";
import ContributeForm from "@/components/ContributeForm";
import { ACATS, ACOLL } from "@/lib/ref";

export const metadata: Metadata = { title: "Digital archive", description: "Photographs, documents, letters, maps, recordings and newspaper items, catalogued with rights and provenance." };
type SP = { searchParams: Promise<{ q?: string; cat?: string; coll?: string; page?: string }> };

export default async function Archive({ searchParams }: SP) {
  const sp = await searchParams;
  const [items, who, camps] = await Promise.all([get<ArchiveItem[]>("/api/archive"), me(), get<Campaign[]>("/api/campaigns")]);
  const q = (sp.q ?? "").toLowerCase();
  const rows = (items ?? []).filter((a) => (!sp.cat || a.category === sp.cat) && (!sp.coll || a.collection === sp.coll) &&
    (!q || `${a.title} ${a.id} ${a.description ?? ""} ${JSON.stringify(a.data)}`.toLowerCase().includes(q)));
  const page = Math.max(1, +(sp.page ?? 1)); const per = 20;
  const shown = rows.slice((page - 1) * per, page * per);
  const qs = (p: number) => { const u = new URLSearchParams(); if (sp.q) u.set("q", sp.q); if (sp.cat) u.set("cat", sp.cat); if (sp.coll) u.set("coll", sp.coll); u.set("page", String(p)); return `?${u}`; };
  return (
    <>
      <PageHead title="Digital archive" lead="The catalogue record is public. Restricted items are available to researchers on request." />
      {!items && <Unavailable />}
      <form method="get" className="inline-form" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Search the catalogue" aria-label="Search the catalogue" />
        <select name="cat" defaultValue={sp.cat ?? ""} aria-label="Category"><option value="">All categories</option>{ACATS.map((c) => <option key={c}>{c}</option>)}</select>
        <select name="coll" defaultValue={sp.coll ?? ""} aria-label="Collection"><option value="">All collections</option>{ACOLL.map((c) => <option key={c}>{c}</option>)}</select>
        <button className="btn small" type="submit">Search</button>
      </form>
      <p className="meta">{rows.length} item{rows.length === 1 ? "" : "s"}</p>
      {shown.length ? shown.map((a) => (
        <article key={a.id} className="acard">
          <h3><Link href={`/archive/${a.id}`}>{a.title}</Link></h3>
          <p className="meta">{a.id} · {a.category} · {a.collection}{a.access === "Restricted" ? " · Restricted" : ""}</p>
          <p>{a.description}</p>
          <p className="tags"><StatusTag s={a.status} /> <NatureTag n={a.nature} /></p>
        </article>)) : <Empty>No archive items match.</Empty>}
      <p className="actions">{page > 1 && <Link className="btn ghost small" href={qs(page - 1)}>Previous</Link>} {page * per < rows.length && <Link className="btn ghost small" href={qs(page + 1)}>Next</Link>}</p>
      <h2 className="sect">Offer an item</h2>
      {canContribute(who) ? <ContributeForm kind="archive" camps={(camps ?? []).map((c) => ({ id: c.id, name: c.name }))} editor={isEditor(who)} /> : <p className="notice">{who.id ? "To contribute, ask the foundation to invite you as a contributor." : <>Please <Link href="/account">sign in</Link> to offer an item.</>}</p>}
    </>
  );
}
