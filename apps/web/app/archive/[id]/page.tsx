import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { get, me, isEditor, canContribute, type ArchiveItem } from "@/lib/api";
import { StatusTag, NatureTag, HistoryPanel, CitePanel, fmtDate } from "@/components/ui";
import CorrectionBox from "@/components/CorrectionBox";
import AccessRequest from "@/components/AccessRequest";
import { EditText, StatusForm, DeleteButton } from "@/components/Interact";

type File = { id: string; name: string; contentType: string; size: number; sha256: string; restricted: boolean };
type Params = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const r = await get<{ item: ArchiveItem }>(`/api/archive/${id}`);
  return r ? { title: `${r.item.title} (${id})`, description: (r.item.description ?? "").slice(0, 160) } : { title: "Archive item" };
}

export default async function ArchiveItemPage({ params }: Params) {
  const { id } = await params;
  const [r, who] = await Promise.all([get<{ item: ArchiveItem; files: File[]; fileCount: number }>(`/api/archive/${id}`), me()]);
  if (!r) notFound();
  const { item: a, files } = r; const ed = isEditor(who);
  const d = a.data as Record<string, string>;
  const facts: [string, string | undefined][] = [["Catalogue number", a.id], ["Category", a.category], ["Collection", a.collection], ["Date", d.approxDate], ["Place", d.location], ["Creator", d.creator], ["Original owner", d.originalOwner], ["Donor", d.donor], ["Rights", a.rights], ["Access", a.access], ["People", d.people], ["Units", d.units]];
  return (
    <>
      <p><Link href="/archive">← Digital archive</Link></p>
      <h1>{a.title}</h1>
      <p className="tags"><StatusTag s={a.status} /> <NatureTag n={a.nature} /></p>
      {a.verNote && <p className="meta">{a.verNote}</p>}
      <dl className="aitem-facts">{facts.filter((f) => f[1]).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
      <p>{a.description}</p>
      {a.access === "Restricted" && !ed ? (
        <div className="vw-lockpanel"><h3>Restricted item</h3><p>The catalogue record is public. The file itself is available to researchers on request.</p>
          {canContribute(who) || who.id ? <AccessRequest id={a.id} title={a.title} /> : <p><Link href="/account">Sign in</Link> to request access.</p>}</div>
      ) : files.length > 0 ? (
        <section><h2 className="sect">Files</h2>
          <ul className="plain">{files.map((f) => (
            <li key={f.id}>
              {f.contentType.startsWith("image/") && <>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`/api/files/${f.id}`} alt={a.title} style={{ maxWidth: "100%", display: "block" }} /></>}
              <a href={`/api/files/${f.id}`} target="_blank" rel="noopener noreferrer">{f.name}</a> <span className="meta">{f.contentType}, {(f.size / 1024).toFixed(0)} KB, SHA-256 {f.sha256.slice(0, 12)}…</span>
            </li>))}
          </ul></section>
      ) : <p className="meta">No digital file is attached to this record yet.</p>}
      {a.transcript && <section><h2 className="sect">Transcript</h2><pre className="transcript">{a.transcript}</pre></section>}
      <p className="meta">Catalogued {fmtDate(a.createdAt)}{a.authorName ? ` by ${a.authorName}` : ""}.</p>
      <HistoryPanel target={`archive/${a.id}`} />
      {who.id ? <CorrectionBox target={`archive/${a.id}`} title={a.title} /> : null}
      {ed && (<div className="panel"><h3>Editors</h3>
        <StatusForm col="archive" id={a.id} status={a.status} note={a.verNote} />
        <EditText col="archive" id={a.id} value={a.description ?? ""} label="description" />
        <EditText col="archive-transcript" id={a.id} value={a.transcript ?? ""} label="transcript" />
        <DeleteButton col="archive" id={a.id} label="Delete this record" confirmText="Delete this entry? It can be restored only from a backup." /></div>)}
      <CitePanel title={a.title} path={`/archive/${a.id}`} />
    </>
  );
}
