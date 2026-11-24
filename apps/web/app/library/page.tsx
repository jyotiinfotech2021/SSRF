import type { Metadata } from "next";
import { pageMeta, SITE, abs, itemMeta } from "@/lib/seo";
import ShareBar from "@/components/ShareBar";
import JsonLd from "@/components/JsonLd";
import Link from "next/link";
import { get, me, canContribute, isEditor, type Book, type Campaign } from "@/lib/api";
import { HistoryPanel, Unavailable } from "@/components/ui";
import AutoForm from "@/components/AutoForm";
import ContributeForm from "@/components/ContributeForm";
import { usefulNote, englishTitle } from "@/lib/text";
import CorrectionBox from "@/components/CorrectionBox";
import { StatusForm, DeleteButton } from "@/components/Interact";

const BASE = pageMeta("Library: books and articles about Lt Gen Sagat Singh", "Books, articles, official records and theses about Lt Gen Sagat Singh, each catalogued with its author, nature of source and verification status.", "/library");
/** /library?item=<id> shows that item's title, summary and cover when the link is shared. */
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ item?: string }> }): Promise<Metadata> {
  const { item } = await searchParams;
  if (!item) return BASE;
  const b = (await get<Book[]>("/api/books"))?.find((x) => x.id === item);
  const cover = (b?.data as { cover?: string } | undefined)?.cover ?? "";
  const asset = /^\/_blob\/[0-9a-f]{32}$/.test(cover) ? cover.slice(7) : "";
  return itemMeta(BASE, "/library", b && { title: T(b), description: b.description ?? "", image: asset ? `/library/covers/${asset}.jpg` : undefined });
}
type SP = { searchParams: Promise<{ q?: string; grp?: string; camp?: string; sort?: string; ver?: string }> };

// Groups, labels and cover styles follow the prototype's Library.
const LGROUPS: [string, string, string[]][] = [["books", "Books and biographies", ["Biography", "Book", "Memoir"]], ["articles", "Articles and newspapers", ["Article", "Newspaper"]], ["records", "Official records", ["Official record"]], ["theses", "Theses", ["Thesis"]], ["films", "Films and talks", ["Other", "Lecture or talk"]]];
const lgroup = (k?: string) => (LGROUPS.find((g) => g[2].includes(k ?? "")) ?? LGROUPS[4])[0];
const LTYPE: Record<string, string> = { Biography: "Biography", Book: "Book", Memoir: "Memoir", Article: "Article", Newspaper: "News report", "Official record": "Official record", Thesis: "Thesis", Other: "Film", "Lecture or talk": "Talk" };
const CLOTH = ["#5b1d1a", "#2f3b2a", "#22324a", "#4a3524", "#3b2a3e"];
const T = (b: Book) => englishTitle(b.title, `Hindi-language ${lgroup(b.kind) === "articles" ? "article" : "item"}${(b.data as { publisher?: string }).publisher ? " from " + (b.data as { publisher?: string }).publisher : ""}`);
const hsh = (s: string) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
const shortTitle = (t: string) => String(t || "").split(/:\s/)[0];
const lLinkLabel = (b: Book) => { const own = (b.data as D).linkLabel; if (own) return own; const l = (b.data as { link?: string }).link ?? ""; const g = lgroup(b.kind); return /wikipedia\.org/.test(l) && g === "books" ? "More about the book" : ({ articles: "Read the article", records: "Open the record", films: "More about the film", theses: "Read the thesis" } as Record<string, string>)[g] ?? "View at the publisher"; };
const VCAMP: Record<string, string> = { goa: "Goa 1961", nathula: "Nathu La 1967", meghna: "1971 war" };
type D = { author?: string; creator?: string; publisher?: string; year?: string; link?: string; linkLabel?: string; featured?: boolean; featureOrder?: number };
const byline = (d: D) => d.creator || d.author || "";

// Real cover images the foundation uploaded are kept in /library/covers; the designed cover sits underneath until they load.
function Cover({ b, big, inner }: { b: Book; big?: boolean; inner?: boolean }) {
  const d = b.data as D, g = lgroup(b.kind), v = b.status === "verified", sz = big ? " big" : "";
  const cover = (b.data as { cover?: string }).cover, asset = cover && /^\/_blob\/[0-9a-f]{32}$/.test(cover) ? cover.slice(7) : "";
  if (asset && !inner) return (
    <div className={`lcov real${sz}`}><Cover b={b} big={big} inner />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="lcov-img" src={`/library/covers/${asset}.jpg`} alt={`Cover of ${T(b)}`} loading="lazy" />
      {v && <span className="lseal" title="Verified by SSRF">✓</span>}</div>);
  const seal = v && !inner ? <span className="lseal" title="Verified by SSRF">✓</span> : null;
  if (g === "articles") return <div className={`lcov clip${sz}`}><span className="mast">{d.publisher || byline(d)}</span><span className="rule" /><span className="head">{shortTitle(T(b))}</span><span className="cols" />{seal}</div>;
  if (g === "records") return <div className={`lcov folder${sz}`}><span className="tab">{LTYPE[b.kind ?? ""] || "Record"}</span><span className="org">{byline(d) || d.publisher || ""}</span><span className="head">{shortTitle(T(b))}</span><span className="stamp">{d.year || ""}</span>{seal}</div>;
  if (g === "films") return <div className={`lcov reel${sz}`}><span className="mast">{d.publisher || "Film"}</span><span className="head">{shortTitle(T(b))}</span><span className="by">{d.year || ""}</span>{seal}</div>;
  return <div className={`lcov cloth${g === "theses" ? " thesis" : ""}${sz}${inner ? " under" : ""}`} style={{ ["--cl" as string]: CLOTH[hsh(b.title) % CLOTH.length] }}><span className="spine" /><span className="frame"><span className="head">{shortTitle(T(b))}</span><span className="orn">✦</span><span className="by">{String(byline(d)).replace(/\s*\(Retd\)/, "")}</span></span>{seal}</div>;
}

function Meta({ b }: { b: Book }) {
  const d = b.data as D;
  const rows: [string, string | undefined][] = [["Author", byline(d)], ["Publisher", d.publisher !== byline(d) ? d.publisher : ""], ["Year", d.year], ["Type", LTYPE[b.kind ?? ""] || b.kind]];
  return <dl className="lmeta">{rows.filter((r) => r[1]).map(([k, x]) => <div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{x}</dd></div>)}</dl>;
}

function Card({ b, ed, signedIn }: { b: Book; ed: boolean; signedIn: boolean }) {
  const d = b.data as D, v = b.status === "verified";
  return (
    <article className={`lcard${v ? " verified" : ""}`} id={b.id}>
      {d.link ? <a href={d.link} target="_blank" rel="noopener noreferrer" className="lcov-link"><Cover b={b} /></a> : <Cover b={b} />}
      <div className="lbody">
        <div className="lstat">{v ? <span className="lver">✓ Verified</span> : <span className="lchk">Being checked</span>}{(b.camps ?? []).map((c) => <span key={c} className="lcamp">{VCAMP[c] ?? c}</span>)}</div>
        <h3>{T(b)}</h3>
        <Meta b={b} />
        {b.description && <p className="ldesc">{b.description}</p>}
        {usefulNote(b.verNote) && <p className="meta">{usefulNote(b.verNote)}</p>}
        <div className="lacts">{d.link && <a className="btn small" href={d.link} target="_blank" rel="noopener noreferrer">{lLinkLabel(b)} ↗</a>}<ShareBar url={abs(`/library?item=${b.id}#${b.id}`)} title={T(b)} text={b.description ?? ""} />{signedIn && <CorrectionBox target={`books/${b.id}`} title={T(b)} />}</div>
        <HistoryPanel target={`books/${b.id}`} />
        {ed && <div className="actions"><StatusForm col="books" id={b.id} status={b.status} note={b.verNote} /><DeleteButton col="books" id={b.id} label="Delete" confirmText="Delete this entry? It can be restored only from a backup." /></div>}
      </div>
    </article>
  );
}

export default async function Library({ searchParams }: SP) {
  const sp = await searchParams;
  const [books, who, camps] = await Promise.all([get<Book[]>("/api/books"), me(), get<Campaign[]>("/api/campaigns")]);
  const ed = isEditor(who), signedIn = !!who.id;
  const all = (books ?? []).filter((b) => b.kind !== "Documentary or video" && (ed || b.status !== "rejected"));
  const q = (sp.q ?? "").trim().toLowerCase();
  const sorters: Record<string, (a: Book, b: Book) => number> = {
    new: (a, b) => String((b.data as D).year || "0").localeCompare(String((a.data as D).year || "0")),
    old: (a, b) => String((a.data as D).year || "9999").localeCompare(String((b.data as D).year || "9999")),
    title: (a, b) => a.title.localeCompare(b.title),
  };
  const list = all.filter((b) => { const d = b.data as D;
    return (!q || [b.title, byline(d), d.publisher, b.description, d.year].join(" ").toLowerCase().includes(q)) && (!sp.grp || lgroup(b.kind) === sp.grp) && (!sp.camp || (b.camps ?? []).includes(sp.camp)) && (!sp.ver || b.status === "verified"); })
    .sort((a, b) => Number(b.status === "verified") - Number(a.status === "verified") || (sorters[sp.sort ?? "new"] ?? sorters.new)(a, b));
  const filtered = !!(q || sp.grp || sp.camp || sp.ver);
  const feat = list.filter((b) => (b.data as D).featured).sort((a, b) => ((a.data as D).featureOrder ?? 9) - ((b.data as D).featureOrder ?? 9));
  const gcount = (k: string) => all.filter((b) => lgroup(b.kind) === k).length;
  const href = (grp?: string) => { const u = new URLSearchParams(); if (sp.q) u.set("q", sp.q); if (grp) u.set("grp", grp); if (sp.camp) u.set("camp", sp.camp); if (sp.sort) u.set("sort", sp.sort); if (sp.ver) u.set("ver", sp.ver); const s = u.toString(); return "/library" + (s ? "?" + s : ""); };
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: "Library: books and articles about Lt Gen Sagat Singh", numberOfItems: all.length,
        itemListElement: all.map((b, i) => { const d = b.data as D;
          return { "@type": "ListItem", position: i + 1, item: { "@type": b.kind === "Biography" || b.kind === "Book" ? "Book" : b.kind === "Article" || b.kind === "Newspaper" ? "Article" : "CreativeWork", name: T(b),
            ...(byline(d) ? { author: { "@type": "Person", name: byline(d) } } : {}), ...(d.year ? { datePublished: d.year } : {}), ...(d.link ? { url: d.link } : {}), about: { "@id": `${SITE}/#subject` } } }; }) }} />
      <section className="llanding"><div className="llanding-inner">
        <p className="eyebrow">SSRF Research library</p>
        <h1>Books, articles and records on his campaigns</h1>
        <p>Published works, official records and reporting on Lt Gen Sagat Singh, with full bibliographic details. Each entry links to the publisher or original source.</p>
        <form className="lsearch" role="search" method="get" action="/library">
          <input name="q" type="search" defaultValue={sp.q ?? ""} placeholder="Search by title, author, publisher or year" aria-label="Search the library" />
          {sp.grp && <input type="hidden" name="grp" value={sp.grp} />}
          <button className="btn" type="submit">Search</button>
        </form>
      </div></section>
      {!books && <Unavailable />}
      <AutoForm className="lfilters" action="/library">
        <div className="atypes" role="group" aria-label="Filter by type">
          <Link className={`atype${!sp.grp ? " on" : ""}`} href={href()}>All <i>{all.length}</i></Link>
          {LGROUPS.filter((g) => gcount(g[0])).map(([k, l]) => <Link key={k} className={`atype${sp.grp === k ? " on" : ""}`} href={href(k)}>{l} <i>{gcount(k)}</i></Link>)}
        </div>
        <div className="bar">
          {sp.grp && <input type="hidden" name="grp" value={sp.grp} />}{sp.q && <input type="hidden" name="q" value={sp.q} />}
          <select name="camp" defaultValue={sp.camp ?? ""} aria-label="Filter by campaign"><option value="">All campaigns</option>{camps?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <select name="sort" defaultValue={sp.sort ?? "new"} aria-label="Sort"><option value="new">Newest first</option><option value="old">Oldest first</option><option value="title">Title A–Z</option></select>
          <label className="lverchk"><input type="checkbox" name="ver" value="1" defaultChecked={!!sp.ver} /> Verified only</label>
          <noscript><button className="btn small ghost" type="submit">Apply</button></noscript>
          <span className="grow" />
          <a className="btn small" href="#suggest">Suggest a publication</a>
        </div>
      </AutoForm>
      <p className="meta">Looking for documentaries and interviews? They are on the <Link href="/videos">Videos</Link> page.</p>
      {books && (filtered ? (
        <>
          <h2 className="asect">{list.length} {list.length === 1 ? "result" : "results"} <Link className="link" href="/library">Clear search and filters</Link></h2>
          {list.length ? <div className="lgrid">{list.map((b) => <Card key={b.id} b={b} ed={ed} signedIn={signedIn} />)}</div> : <p className="empty">Nothing matches. Try another word or clear the filters.</p>}
        </>
      ) : <>
        {feat.length > 0 && <><h2 className="sect">Featured publication</h2>{feat.map((b) => { const d = b.data as D; return (
          <section className="lfeat" key={b.id} id={b.id}>
            {d.link ? <a href={d.link} target="_blank" rel="noopener noreferrer" className="lcov-link"><Cover b={b} big /></a> : <Cover b={b} big />}
            <div className="lbody">
              <div className="lstat">{b.status === "verified" ? <span className="lver">✓ Verified</span> : <span className="lchk">Being checked</span>}<span className="lcamp">The standard biography</span></div>
              <h3>{T(b)}</h3><Meta b={b} />
              {b.description && <p className="ldesc">{b.description}</p>}
              {usefulNote(b.verNote) && <p className="meta">{usefulNote(b.verNote)}</p>}
              <div className="lacts">{d.link && <a className="btn" href={d.link} target="_blank" rel="noopener noreferrer">{lLinkLabel(b)} ↗</a>}<ShareBar url={abs(`/library?item=${b.id}#${b.id}`)} title={T(b)} text={b.description ?? ""} />{signedIn && <CorrectionBox target={`books/${b.id}`} title={T(b)} />}</div>
              <HistoryPanel target={`books/${b.id}`} />
            </div>
          </section>); })}</>}
        {LGROUPS.map(([k, l]) => { const g = list.filter((b) => lgroup(b.kind) === k && !(b.data as D).featured);
        return g.length ? <section key={k}><h2 className="sect">{l}</h2><div className="lgrid">{g.map((b) => <Card key={b.id} b={b} ed={ed} signedIn={signedIn} />)}</div></section> : null; })}
      </>)}
      <h2 className="sect" id="suggest">Suggest a publication</h2>
      {canContribute(who) ? <ContributeForm kind="book" camps={(camps ?? []).map((c) => ({ id: c.id, name: c.name }))} /> : <p className="notice">{who.id ? "To contribute, ask the foundation to invite you as a contributor." : <>Please <Link href="/login?next=/library">sign in</Link> to suggest a publication.</>}</p>}
    </>
  );
}
