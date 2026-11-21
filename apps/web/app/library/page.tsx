import type { Metadata } from "next";
import { pageMeta, SITE } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import Link from "next/link";
import { get, me, canContribute, isEditor, type Book, type Campaign } from "@/lib/api";
import { PageHead, StatusTag, NatureTag, HistoryPanel, Unavailable, Empty } from "@/components/ui";
import ContributeForm from "@/components/ContributeForm";
import { StatusForm, DeleteButton } from "@/components/Interact";
import { BKINDS } from "@/lib/ref";

export const metadata: Metadata = pageMeta("Library: books and articles about Lt Gen Sagat Singh", "Books, articles, official records and theses about Lt Gen Sagat Singh, each catalogued with its author, nature of source and verification status.", "/library");
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
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: "Library: books and articles about Lt Gen Sagat Singh", numberOfItems: rows.length,
        itemListElement: rows.map((b, i) => { const d = b.data as { author?: string; year?: string; link?: string };
          return { "@type": "ListItem", position: i + 1, item: { "@type": b.kind === "Biography" || b.kind === "Book" ? "Book" : b.kind === "Article" || b.kind === "Newspaper" ? "Article" : "CreativeWork", name: b.title,
            ...(d.author ? { author: { "@type": "Person", name: d.author } } : {}), ...(d.year ? { datePublished: d.year } : {}), ...(d.link ? { url: d.link } : {}), about: { "@id": `${SITE}/#subject` } } }; }) }} />
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
