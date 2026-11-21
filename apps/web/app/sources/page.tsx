import type { Metadata } from "next";
import { get, me, isEditor, type Source } from "@/lib/api";
import { PageHead, NatureTag, Unavailable, Empty } from "@/components/ui";
import AddSource from "@/components/AddSource";
import { NATURE } from "@/lib/ref";

export const metadata: Metadata = { title: "Sources", description: "Every source cited on the site, classified by nature, with access dates." };
type SP = { searchParams: Promise<{ q?: string; nature?: string }> };

export default async function Sources({ searchParams }: SP) {
  const sp = await searchParams;
  const [all, who] = await Promise.all([get<Source[]>("/api/sources"), me()]);
  const q = (sp.q ?? "").toLowerCase();
  const rows = (all ?? []).filter((s) => (!sp.nature || s.nature === sp.nature) && (!q || `${s.title} ${s.author} ${s.publisher ?? ""} ${s.id}`.toLowerCase().includes(q)));
  return (
    <>
      <PageHead title="Sources" lead="Wikipedia and other general references are ranked below primary documents and are never the only support for a claim." />
      {!all && <Unavailable />}
      <form method="get" className="inline-form" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Search sources" aria-label="Search sources" />
        <select name="nature" defaultValue={sp.nature ?? ""} aria-label="Nature"><option value="">All kinds</option>{NATURE.map((n) => <option key={n}>{n}</option>)}</select>
        <button className="btn small" type="submit">Search</button>
      </form>
      {rows.length ? <ol className="cites">{rows.map((s) => (
        <li key={s.id} id={s.id}>
          <b>{s.author}</b>, <i>{s.title}</i>{s.publisher && s.publisher !== s.author ? `, ${s.publisher}` : ""}{s.date && s.date !== "Not stated" ? `, ${s.date}` : ""}. <NatureTag n={s.nature} /> {s.url && !s.url.startsWith("/_blob/") && <><a href={s.url} target="_blank" rel="noopener noreferrer">Open</a>{s.accessed ? `, accessed ${s.accessed}` : ""}.</>}
          {s.url?.startsWith("/_blob/") && <span className="meta"> The original file is held by the foundation and is being re-uploaded; it is not yet available online.</span>}
          {s.note && <div className="meta">{s.note}</div>}<div className="meta sid">id: {s.id}</div>
        </li>))}</ol> : <Empty>No sources match.</Empty>}
      {isEditor(who) && <AddSource />}
    </>
  );
}
