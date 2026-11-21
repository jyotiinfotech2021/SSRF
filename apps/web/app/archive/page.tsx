import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { get, me, canContribute, isEditor, type ArchiveItem, type Campaign } from "@/lib/api";
import { Unavailable, Empty } from "@/components/ui";
import ContributeForm from "@/components/ContributeForm";
import { ACOLL } from "@/lib/ref";
import { ACOLLMETA, ATYPES, AIcon, collMeta } from "@/lib/archive";

export const metadata: Metadata = pageMeta("Digital archive: photographs, letters and records", "Photographs, letters, documents, maps, recordings and newspaper items about Lt Gen Sagat Singh, each with a permanent identifier, origin, credit and rights.", "/archive");
type Item = ArchiveItem & { thumb?: string | null };
type SP = { searchParams: Promise<{ atype?: string; acoll?: string; page?: string }> };

export default async function Archive({ searchParams }: SP) {
  const sp = await searchParams;
  const [items, who, camps] = await Promise.all([get<Item[]>("/api/archive"), me(), get<Campaign[]>("/api/campaigns")]);
  const editor = isEditor(who);
  const vis = (items ?? []).filter((a) => editor || a.status !== "rejected");
  const cnt = (k: "collection" | "category", v: string) => vis.filter((a) => a[k] === v).length;
  const list = vis.filter((a) => (!sp.acoll || a.collection === sp.acoll) && (!sp.atype || a.category === sp.atype)).sort((a, b) => a.id.localeCompare(b.id));
  const photos = vis.filter((a) => a.access !== "Restricted" && a.thumb).slice(-5).reverse();
  const started = ACOLL.filter((c) => cnt("collection", c)).length;
  const page = Math.max(1, +(sp.page ?? 1)); const per = 20; const shown = list.slice(0, page * per);
  const q = (o: Record<string, string | undefined>) => { const u = new URLSearchParams(); const m = { atype: sp.atype, acoll: sp.acoll, ...o }; for (const [k, v] of Object.entries(m)) if (v) u.set(k, v); const s = u.toString(); return s ? `/archive?${s}` : "/archive"; };
  const typeLabel = ATYPES.find((x) => x[0] === sp.atype)?.[1];
  return (
    <>
      <section className="alanding">
        <div className="alanding-inner">
          <div className="alanding-text">
            <p className="eyebrow">SSRF Digital archive</p>
            <h1>Photographs, letters and records of his life</h1>
            <p>Every item carries a permanent identifier, its origin, credit and rights. Originals stay unaltered; what you see are viewing copies.</p>
            <p className="alanding-stats"><b>{vis.length}</b> {vis.length === 1 ? "item" : "items"} catalogued · <b>{started}</b> of {ACOLL.length} collections started</p>
            <div className="entry">
              {canContribute(who) ? <a className="btn" href="#catalogue">{editor ? "Catalogue an item" : "Contribute an item"}</a> : <Link className="btn" href="/login?next=/archive">Sign in to contribute an item</Link>}
            </div>
          </div>
          <div className={`alanding-mosaic n${Math.min(photos.length, 5)}`}>
            {photos.length ? photos.map((a) => (
              <Link key={a.id} href={`/archive/${a.id}`} title={a.title}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.thumb!} alt={a.title} loading="lazy" /><code>{a.id}</code>
              </Link>)) : <div className="mosaic-empty"><AIcon t="Photograph" big /><p>Photographs will appear here as they are catalogued.</p></div>}
          </div>
        </div>
      </section>

      {!items && <Unavailable />}
      <div id="catalogue">{canContribute(who) && <ContributeForm kind="archive" camps={(camps ?? []).map((c) => ({ id: c.id, name: c.name }))} editor={editor} openOnHash="#catalogue" />}</div>

      <div className="atypes" role="group" aria-label="Filter by type">
        <Link className={`atype${!sp.atype ? " on" : ""}`} href={q({ atype: undefined, page: undefined })}>All <i>{vis.length}</i></Link>
        {ATYPES.map(([k, l]) => <Link key={k} className={`atype${sp.atype === k ? " on" : ""}`} href={q({ atype: k, page: undefined })}><AIcon t={k} />{l} <i>{cnt("category", k)}</i></Link>)}
      </div>

      <h3 className="asect">Collections</h3>
      <div className="acolls">
        {Object.keys(ACOLLMETA).map((c) => {
          const [code, col] = collMeta(c), n = cnt("collection", c);
          return (
            <Link key={c} className={`acoll${sp.acoll === c ? " on" : ""}${n ? "" : " empty"}`} style={{ "--cc": col } as React.CSSProperties} href={q({ acoll: sp.acoll === c ? undefined : c, page: undefined })}>
              <i>{code}</i><b>{c.replace(/ Collection$/, "")}</b><span>{n} {n === 1 ? "item" : "items"}</span>
            </Link>);
        })}
      </div>

      <h3 className="asect">{sp.acoll || sp.atype ? <>{typeLabel ?? "Items"}{sp.acoll ? ` in ${sp.acoll}` : ""} <Link className="link" href="/archive">Clear filters</Link></> : "All items"}</h3>
      {list.length ? (
        <>
          <div className="agrid">
            {shown.map((a) => {
              const [code, col] = collMeta(a.collection), r = a.access === "Restricted";
              return (
                <Link key={a.id} className={`acard${r ? " restricted" : ""}`} href={`/archive/${a.id}`} style={{ "--cc": col } as React.CSSProperties}>
                  <div className="acard-img">
                    {a.thumb ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={a.thumb} alt="" loading="lazy" /> : <div className="acard-ph"><AIcon t={a.category} big /><span>{a.category || "Item"}</span></div>}
                    {r && <span className="acard-lock">Restricted</span>}
                    <code className="acard-id">{a.id}</code>
                  </div>
                  <div className="acard-body">
                    <span className="acard-coll"><i>{code}</i>{a.collection ?? ""}</span>
                    <b>{a.title}</b>
                    <span className="acard-meta"><AIcon t={a.category} />{[a.category, (a.data as { approxDate?: string }).approxDate].filter(Boolean).join(" · ")}</span>
                  </div>
                </Link>);
            })}
          </div>
          {shown.length < list.length && <p><Link className="btn ghost small" href={q({ page: String(page + 1) })}>Show {Math.min(per, list.length - shown.length)} more of {list.length - shown.length}</Link></p>}
        </>
      ) : <Empty>{vis.length ? "Nothing matches these filters yet." : "The archive's first items will be family photographs, documents and recorded interviews. If you hold any, contribute them."}</Empty>}
    </>
  );
}
