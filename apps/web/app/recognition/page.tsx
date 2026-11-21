import type { Metadata } from "next";
import Link from "next/link";
import { get, me, canContribute, isEditor, type Place, type Campaign } from "@/lib/api";
import { PageHead, StatusTag, HistoryPanel, Unavailable, Empty } from "@/components/ui";
import ContributeForm from "@/components/ContributeForm";
import { StatusForm, DeleteButton } from "@/components/Interact";
import { PKINDS } from "@/lib/ref";

export const metadata: Metadata = { title: "Recognition register", description: "Statues, busts, memorials, honours and observances recognising Lt Gen Sagat Singh, each with a verification status." };
type SP = { searchParams: Promise<{ q?: string; kind?: string; state?: string }> };

export default async function Recognition({ searchParams }: SP) {
  const sp = await searchParams;
  const [places, who, camps] = await Promise.all([get<Place[]>("/api/places"), me(), get<Campaign[]>("/api/campaigns")]);
  const q = (sp.q ?? "").toLowerCase();
  const rows = (places ?? []).filter((p) => (!sp.kind || p.kind === sp.kind) && (!sp.state || p.status === sp.state) && (!q || `${p.title} ${p.description ?? ""} ${JSON.stringify(p.data)}`.toLowerCase().includes(q)));
  const ed = isEditor(who);
  return (
    <>
      <PageHead title="Recognition register" lead="Entries are listed as soon as they are catalogued. Only entries marked Verified have been confirmed by a second editor." />
      {!places && <Unavailable />}
      <form method="get" className="inline-form" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Search the register" aria-label="Search the register" />
        <select name="kind" defaultValue={sp.kind ?? ""} aria-label="Kind"><option value="">All kinds</option>{PKINDS.map((k) => <option key={k}>{k}</option>)}</select>
        <select name="state" defaultValue={sp.state ?? ""} aria-label="Status"><option value="">Any status</option><option value="verified">Verified</option><option value="checking">Under verification</option></select>
        <button className="btn small" type="submit">Search</button>
      </form>
      {rows.length ? rows.map((p) => {
        const d = p.data as Record<string, string>;
        return (
          <article key={p.id} className="rcard" id={p.id}>
            <h3>{p.title}</h3>
            <p className="meta">{p.kind}{d.location ? ` · ${d.location}` : ""}{p.lat != null && p.lng != null ? ` · ${p.lat}, ${p.lng}` : ""}</p>
            <p>{p.description}</p>
            {d.source && <p><a href={d.source} target="_blank" rel="noopener noreferrer">Source</a></p>}
            <p className="tags"><StatusTag s={p.status} /></p>{p.verNote && <p className="meta">{p.verNote}</p>}
            <HistoryPanel target={`places/${p.id}`} />
            {ed && <div className="actions"><StatusForm col="places" id={p.id} status={p.status} note={p.verNote} /><DeleteButton col="places" id={p.id} label="Delete" confirmText="Delete this entry? It can be restored only from a backup." /></div>}
          </article>);
      }) : <Empty>No entries match.</Empty>}
      <h2 className="sect">Add an entry</h2>
      {canContribute(who) ? <ContributeForm kind="place" camps={(camps ?? []).map((c) => ({ id: c.id, name: c.name }))} /> : <p className="notice">{who.id ? "To contribute, ask the foundation to invite you as a contributor." : <>Please <Link href="/account">sign in</Link> to add an entry.</>}</p>}
    </>
  );
}
