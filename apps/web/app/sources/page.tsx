import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { get, me, isEditor, type Source, type Claim, type Campaign } from "@/lib/api";
import AutoForm from "@/components/AutoForm";
import { Unavailable } from "@/components/ui";
import AddSource from "@/components/AddSource";
import { NATURE, NATURE_HELP } from "@/lib/ref";

export const metadata: Metadata = pageMeta("Sources cited on the Sagat Singh Research Foundation site", "Every source cited here, classified as primary, oral history, family testimony, secondary research or tertiary, with a link to the original where one exists.", "/sources");
type SP = { searchParams: Promise<{ q?: string; nature?: string; sort?: string }> };
const NATCOL: Record<string, string> = { "Primary source": "#762633", "Oral history": "#6b3f5e", "Family testimony": "#8C7438", "Secondary research": "#3d5a80", "Tertiary source": "#6a6a60" };

export default async function Sources({ searchParams }: SP) {
  const sp = await searchParams;
  const [src, claims, camps, who] = await Promise.all([get<Source[]>("/api/sources"), get<Claim[]>("/api/claims"), get<Campaign[]>("/api/campaigns"), me()]);
  const q = (sp.q ?? "").trim().toLowerCase();
  // How often each source is cited: by biography entries, by campaign findings and by campaign dossiers.
  const usage = (id: string) => {
    const u = { Biography: 0, Campaigns: 0, Register: 0 };
    for (const c of claims ?? []) if (c.citations.some((x) => x.sourceId === id)) u[c.scope === "life" ? "Biography" : "Campaigns"]++;
    for (const c of camps ?? []) {
      const d = c.data as Record<string, unknown>;
      const keys = [...Object.keys(d).filter((f) => f.endsWith("Cites")).flatMap((f) => (Array.isArray(d[f]) ? (d[f] as string[]) : [])), ...((d.chronology as { s?: string }[]) ?? []).map((r) => r.s), ...((d.command as { cite?: string }[]) ?? []).map((n) => n.cite)];
      if (keys.includes(id)) u.Campaigns++;
    }
    return u;
  };
  const all = (src ?? []).map((s) => { const u = usage(s.id); return { ...s, u, n: u.Biography + u.Campaigns + u.Register }; });
  const max = Math.max(1, ...all.filter((s) => s.nature !== "Tertiary source").map((s) => s.n));
  const sorters: Record<string, (a: (typeof all)[0], b: (typeof all)[0]) => number> = {
    cited: (a, b) => b.n - a.n || String(a.title).localeCompare(String(b.title)),
    title: (a, b) => String(a.title).localeCompare(String(b.title)),
    nature: (a, b) => NATURE.indexOf(a.nature) - NATURE.indexOf(b.nature) || b.n - a.n,
  };
  const list = all.filter((s) => (!sp.nature || s.nature === sp.nature) && (!q || [s.id, s.title, s.author, s.publisher, s.date, s.note].join(" ").toLowerCase().includes(q))).sort(sorters[sp.sort ?? "nature"] ?? sorters.nature);
  const cnt = (n: string) => all.filter((s) => s.nature === n).length;
  const href = (nature?: string) => { const u = new URLSearchParams(); if (sp.q) u.set("q", sp.q); if (nature) u.set("nature", nature); if (sp.sort) u.set("sort", sp.sort); const s = u.toString(); return "/sources" + (s ? "?" + s : ""); };
  return (
    <>
      <section className="llanding"><div className="llanding-inner">
        <p className="eyebrow">SSRF Sources and evidence</p>
        <h1>Every source the foundation cites</h1>
        <p>Each source is classified by the nature of the material, so readers can see what kind of evidence stands behind every entry. The short ID on each card is the reference editors use in citations.</p>
        <form className="lsearch" role="search" method="get" action="/sources">
          <input name="q" type="search" defaultValue={sp.q ?? ""} placeholder="Search by title, author, publisher or source ID" aria-label="Search sources" />
          {sp.nature && <input type="hidden" name="nature" value={sp.nature} />}
          <button className="btn" type="submit">Search</button>
        </form>
      </div></section>
      {!src && <Unavailable />}
      <h2 className="sect">Evidence classification</h2>
      <div className="nats">{NATURE.map((n) => (
        <Link key={n} className={`natcard${sp.nature === n ? " on" : ""}`} style={{ ["--nc" as string]: NATCOL[n] }} href={href(sp.nature === n ? undefined : n)}>
          <span className="snat">{n}</span><p>{NATURE_HELP[n]}</p><i>{cnt(n)} {cnt(n) === 1 ? "source" : "sources"}</i>
        </Link>))}</div>
      <AutoForm className="bar" action="/sources" style={{ marginTop: "1rem" }}>
        {sp.q && <input type="hidden" name="q" value={sp.q} />}{sp.nature && <input type="hidden" name="nature" value={sp.nature} />}
        <select name="sort" defaultValue={sp.sort ?? "nature"} aria-label="Sort"><option value="nature">By classification</option><option value="cited">Most cited first</option><option value="title">Title A–Z</option></select>
        <noscript><button className="btn small ghost" type="submit">Apply</button></noscript>
        {(sp.nature || q) && <Link className="link" href="/sources">Clear search and filter</Link>}
        <span className="meta">{list.length} of {all.length} sources</span>
      </AutoForm>
      {list.length ? (
        <div className="sgrid">{list.map((s) => {
          const key = s.nature !== "Tertiary source" && s.n >= Math.max(3, Math.ceil(max * 0.5)), bars = Math.min(5, Math.round((5 * s.n) / max)), blob = s.url?.startsWith("/_blob/");
          return (
            <article key={s.id} className={`scard${key ? " key" : ""}${s.n ? "" : " unused"}`} id={s.id} style={{ ["--nc" as string]: NATCOL[s.nature] || "#6a6a60" }}>
              <div className="scard-top"><span className="snat">{s.nature || "Not classified"}</span><code className="sid" title="Source ID used in citations">{s.id}</code></div>
              <h3>{s.url && !blob ? <a href={s.url} target="_blank" rel="noopener noreferrer">{s.title || s.id}</a> : s.title || s.id}</h3>
              <p className="sauth">{[s.author, s.publisher !== s.author ? s.publisher : ""].filter(Boolean).join(" · ")}{s.date && s.date !== "Not stated" && s.date !== "None" && <span> · {s.date}</span>}</p>
              <div className="suse">
                <span className="smeter" aria-hidden="true">{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= bars ? "on" : undefined} />)}</span>
                <b>{s.n ? `Cited ${s.n} ${s.n === 1 ? "time" : "times"}` : "Not yet cited"}</b>{key && <span className="skey">Key source</span>}
                {s.n > 0 && <span className="swhere">{Object.entries(s.u).filter((x) => x[1]).map(([k, x]) => `${k} ${x}`).join(" · ")}</span>}
              </div>
              {s.note && <div className="snote"><span>Research note</span>{s.note}</div>}
              {s.url && !blob && <p className="sopen"><a href={s.url} target="_blank" rel="noopener noreferrer">Open the source ↗</a>{s.accessed && <span className="meta"> Accessed {s.accessed}</span>}</p>}
              {blob && <p className="meta">The original file is held by the foundation and is being re-uploaded; it is not yet available online.</p>}
            </article>); })}</div>
      ) : <p className="empty">No source matches. Try another word or clear the filter.</p>}
      {isEditor(who) && <AddSource />}
    </>
  );
}
