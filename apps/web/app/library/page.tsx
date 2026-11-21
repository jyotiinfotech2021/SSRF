import type { Metadata } from "next";
import Link from "next/link";
import { get, me, canContribute, isEditor, type Book, type Campaign } from "@/lib/api";
import { PageHead, StatusTag, NatureTag, HistoryPanel, Unavailable, Empty } from "@/components/ui";
import ContributeForm from "@/components/ContributeForm";
import { StatusForm, DeleteButton } from "@/components/Interact";
import { BKINDS } from "@/lib/ref";

export const metadata: Metadata = { title: "Library", description: "Books, articles, official records, theses and other published works about Lt Gen Sagat Singh." };
type SP = { searchParams: Promise<{ q?: string; kind?: string }> };

export default async function Library({ searchParams }: SP) {
  const sp = await searchParams;
  const [books, who, camps] = await Promise.all([get<Book[]>("/api/books"), me(), get<Campaign[]>("/api/campaigns")]);
  const q = (sp.q ?? "").toLowerCase();
  // The Videos page lists "Documentary or video"; the Library lists everything else.
  const rows = (books ?? []).filter((b) => b.kind !== "Documentary or video" && (!sp.kind || b.kind === sp.kind) && (!q || `${b.title} ${b.description ?? ""} ${JSON.stringify(b.data)}`.toLowerCase().includes(q)));
  const ed = isEditor(who);
  return (
    <>
      <PageHead title="Library" lead="Published works about Sagat Singh. An entry is listed as soon as it is catalogued and carries a verification status." />
      {!books && <Unavailable />}
      <form method="get" className="inline-form" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Search the library" aria-label="Search the library" />
        <select name="kind" defaultValue={sp.kind ?? ""} aria-label="Kind"><option value="">All kinds</option>{BKINDS.filter((k) => k !== "Documentary or video").map((k) => <option key={k}>{k}</option>)}</select>
        <button className="btn small" type="submit">Search</button>
      </form>
      {rows.length ? rows.map((b) => {
        const d = b.data as Record<string, string>;
        return (
          <article key={b.id} className="card" id={b.id}>
            <h3>{b.title}</h3>
            <p className="meta">{b.kind}{d.author ? ` · ${d.author}` : ""}{d.year ? ` · ${d.year}` : ""}</p>
            <p>{b.description}</p>
            {d.link && <p><a href={d.link} target="_blank" rel="noopener noreferrer">Open the work</a></p>}
            <p className="tags"><StatusTag s={b.status} /> <NatureTag n={b.nature} /></p>
            {b.verNote && <p className="meta">{b.verNote}</p>}
            <HistoryPanel target={`books/${b.id}`} />
            {ed && <div className="actions"><StatusForm col="books" id={b.id} status={b.status} note={b.verNote} /><DeleteButton col="books" id={b.id} label="Delete" confirmText="Delete this entry? It can be restored only from a backup." /></div>}
          </article>);
      }) : <Empty>No library items match.</Empty>}
      <h2 className="sect">Add a library item</h2>
      {canContribute(who) ? <ContributeForm kind="book" camps={(camps ?? []).map((c) => ({ id: c.id, name: c.name }))} /> : <p className="notice">{who.id ? "To contribute, ask the foundation to invite you as a contributor." : <>Please <Link href="/account">sign in</Link> to add an item.</>}</p>}
    </>
  );
}
