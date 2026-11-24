import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta, abs } from "@/lib/seo";
import ShareBar from "@/components/ShareBar";
import { get, me, canContribute, isEditor, type Place, type Campaign } from "@/lib/api";
import { HistoryPanel, Unavailable, Cites, sourceMap } from "@/components/ui";
import ContributeForm from "@/components/ContributeForm";
import CorrectionBox from "@/components/CorrectionBox";
import { StatusForm, DeleteButton } from "@/components/Interact";
import { assetUrl } from "@/lib/text";
import { PKINDS } from "@/lib/ref";
import { INDIA, inP } from "@/lib/indiaMap";

export const metadata: Metadata = pageMeta("Recognition register: statues, memorials and honours", "Statues, busts, memorials, honours and observances recognising Lt Gen Sagat Singh, each with its source and a verification status.", "/recognition");
type SP = { searchParams: Promise<{ state?: string; kind?: string; st?: string; place?: string }> };
type PD = { source?: string; location?: string; city?: string; state?: string; district?: string; date?: string; inauguratedBy?: string; accessibility?: string; details?: string[]; cites?: { s: string; loc?: string }[]; images?: { url: string; caption?: string; wide?: boolean }[]; imagesNote?: string; homeBlurb?: string; featured?: boolean };

const PICON: Record<string, string> = { Statue: "M12 3a2.2 2.2 0 1 1 0 4.4A2.2 2.2 0 0 1 12 3zM9 9h6l1 6h-2l-.5 4h-3L10 15H8z M6 21h12", Bust: "M9 7.5a3 3 0 1 0 6 0a3 3 0 1 0-6 0M6 17c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5M7 17h10v4H7z", "Named after him": "M12 3v18M6 6h11l2 2.5L17 11H6zM18 13H7l-2 2.5L7 18h11z", Memorial: "M9 21V7l3-4 3 4v14M6 21h12M10.5 11h3", Observance: "M4 5h16v15H4zM4 9.5h16M8.5 3v4M15.5 3v4M9 14l2 2 4-4", Honour: "M7 15a5 5 0 1 0 10 0a5 5 0 1 0-10 0M9 3l3 6 3-6", "Museum or display": "M3 9l9-5 9 5M5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18", Proposal: "M4 20h16M6 20V9l6-5 6 5v11M10 20v-6h4v6", Other: "M12 3l2.6 5.4 5.9.9-4.3 4.1 1 5.9L12 16.5 6.8 19.3l1-5.9L3.5 9.3l5.9-.9z" };
const Icon = ({ k, cls }: { k?: string; cls?: string }) => <svg className={cls || "aicon"} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"><path d={PICON[k ?? ""] ?? PICON.Other} /></svg>;
const pStat = (p: Place) => (p.kind === "Proposal" ? "proposed" : p.status === "verified" ? "verified" : "checking");
const PSTAT: Record<string, [string, string]> = { verified: ["Verified", "#303B30"], checking: ["Under verification", "#B09555"], proposed: ["Proposed", "#762633"] };
const place = (p: Place) => { const d = p.data as PD; const city = d.city || (d.location ?? "").split(",")[0].trim(); return { city, state: d.state || "Other" }; };
const pos = (p: Place): [number, number] | null => (p.lat != null && p.lng != null ? [p.lat, p.lng] : null);

function Card({ p, ed, signedIn, sources }: { p: Place; ed: boolean; signedIn: boolean; sources: Map<string, import("@/lib/api").Source> }) {
  const d = p.data as PD, st = pStat(p), [sl, sc] = PSTAT[st], img = d.images?.[0], loc = place(p);
  const facts: [string, string | undefined][] = [[p.kind === "Honour" ? "Conferred by" : "Inaugurated by", d.inauguratedBy], ["Date", d.date], ["Public access", d.accessibility]];
  const shownFacts = facts.filter((r) => r[1] && !/^(Unknown|Not applicable until built|Not built. Proposal stage.|Plan received)/.test(r[1]!) && !/to be confirmed/i.test(r[1]!));
  const cites = (d.cites ?? []).map((c, i) => ({ id: i, sourceId: c.s, loc: c.loc ?? null, position: i }));
  const mapUrl = p.lat != null && p.lng != null && !["Observance", "Honour", "Proposal"].includes(p.kind ?? "") ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}` : "";
  return (
    <article className={`rcard ${st}`} id={p.id} style={{ ["--sc" as string]: sc }}>
      <div className="rcard-body">
        <div className="rhead2">
          {img ? <a className="rthumb" href={assetUrl(img.url)} target="_blank" rel="noopener noreferrer">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={assetUrl(img.url)} alt={p.title} loading="lazy" /><span className="rimg-note">Rendering</span></a> : <span className="ricon"><Icon k={p.kind} /></span>}
          <div>
            <p className="rtype">{p.kind === "Proposal" ? "Proposed project" : p.kind} <span className="rstat">{st === "verified" ? "✓ " : ""}{sl}</span></p>
            <h3>{p.title.split(" / ")[0].replace(/ (proposed)$/, "")}</h3>
            {(loc.city || d.location) && <p className="rloc"><svg className="aicon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z" /><circle cx="12" cy="10" r="2.2" /></svg>{[loc.city, loc.state !== "Other" ? loc.state : ""].filter(Boolean).join(", ")}</p>}
          </div>
        </div>
        {(p.description || d.homeBlurb) && <p className="rdesc">{p.description || d.homeBlurb}</p>}
        {shownFacts.length > 0 && <dl className="rfacts">{shownFacts.map(([k, v]) => <span key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></span>)}</dl>}
        {p.verNote && <p className="meta">{p.verNote}</p>}
        {(d.details?.length ?? 0) > 0 && <details className="evdet"><summary className="link evbtn">More details</summary><div className="evpanel">{d.details!.map((t, i) => <p key={i}>{t}</p>)}</div></details>}
        {(d.images?.length ?? 0) > 1 && (
          <details className="evdet"><summary className="link evbtn">All {d.images!.length} images</summary>
            <div className="concept"><p className="concept-note"><b>Artists&apos; renderings, not photographs.</b> {d.imagesNote}</p>
              <div className="concept-grid">{d.images!.map((i) => <figure key={i.url} className={i.wide ? "wide" : undefined}><a href={assetUrl(i.url)} target="_blank" rel="noopener noreferrer">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={assetUrl(i.url)} alt={`${i.caption ?? p.title} (artist's rendering)`} loading="lazy" /></a><figcaption>{i.caption}</figcaption></figure>)}</div></div>
          </details>)}
        {(cites.length > 0 || d.source) && <details className="evdet"><summary className="link evbtn">Sources</summary><div className="evpanel">{cites.length ? <Cites cites={cites} sources={sources} /> : <p><a href={d.source} target="_blank" rel="noopener noreferrer">{d.source}</a></p>}</div></details>}
        <HistoryPanel target={`places/${p.id}`} />
        <div className="actions"><ShareBar url={abs(`/recognition#${p.id}`)} title={p.title.split(" / ")[0].replace(/ (proposed)$/, "")} text={p.description || d.homeBlurb || ""} />{mapUrl && <a href={mapUrl} target="_blank" rel="noopener noreferrer">Open in maps ↗</a>}{signedIn && <CorrectionBox target={`places/${p.id}`} title={p.title} />}</div>
        {ed && <div className="actions"><StatusForm col="places" id={p.id} status={p.status} note={p.verNote} /><DeleteButton col="places" id={p.id} label="Delete" confirmText="Delete this entry? It can be restored only from a backup." /></div>}
      </div>
    </article>
  );
}

export default async function Recognition({ searchParams }: SP) {
  const sp = await searchParams;
  const [places, who, camps, sources] = await Promise.all([get<Place[]>("/api/places"), me(), get<Campaign[]>("/api/campaigns"), sourceMap()]);
  const ed = isEditor(who), signedIn = !!who.id;
  const all = (places ?? []).filter((p) => ed || p.status !== "rejected");
  const states = [...new Set(all.map((p) => place(p).state))].sort((a, b) => all.filter((p) => place(p).state === b).length - all.filter((p) => place(p).state === a).length);
  const list = all.filter((p) => (!sp.state || place(p).state === sp.state) && (!sp.kind || p.kind === sp.kind) && (!sp.st || pStat(p) === sp.st) && (!sp.place || place(p).city === sp.place));
  const cnt = (s: string) => all.filter((p) => pStat(p) === s).length;
  const goa = all.some((p) => place(p).state === "Goa" && pStat(p) === "verified");
  const kinds = PKINDS.filter((k) => all.some((p) => p.kind === k));
  const q = (o: Record<string, string | undefined>) => { const u = new URLSearchParams(); const m = { state: sp.state, kind: sp.kind, st: sp.st, place: sp.place, ...o }; for (const [k, v] of Object.entries(m)) if (v) u.set(k, v); const s = u.toString(); return "/recognition" + (s ? "?" + s : ""); };
  const order = (p: Place) => ({ verified: 0, checking: 1, proposed: 2 }[pStat(p)]);
  const groups = [...new Set(list.map((p) => place(p).state))].sort((a, b) => states.indexOf(a) - states.indexOf(b));
  const pins = all.map((p) => ({ p, at: pos(p) })).filter((x) => x.at);
  return (
    <>
      <section className="llanding rlanding"><div className="llanding-inner rhead">
        <div>
          <p className="eyebrow">SSRF Recognition register</p>
          <h1>Where he is remembered</h1>
          <p>Statues, busts, places named after him, memorials, honours and days observed in his honour, with the evidence for each. Select a place on the map to see its entries.</p>
          <div className="rstats">{(["verified", "checking", "proposed"] as const).map((s) => <Link key={s} className={`rstatb ${s}${sp.st === s ? " on" : ""}`} href={q({ st: sp.st === s ? undefined : s })} style={{ ["--sc" as string]: PSTAT[s][1] }}><b>{cnt(s)}</b><span>{PSTAT[s][0]}</span></Link>)}</div>
          {!goa && <p className="rgoa"><b>Goa has no verified memorial to him yet.</b> The state whose capital his brigade reached on 19 December 1961 has no public statue, road or building named for him that the foundation has found.</p>}
        </div>
        <figure className="imap rmap">
          <svg viewBox={`0 0 ${INDIA.W} ${INDIA.H}`} role="img" aria-label="Map of recognition sites"><path d={INDIA.d} className="imap-land" />
            {pins.map(({ p, at }, i) => { const [x, y] = inP(at![0], at![1]), east = at![1] > 86 || i % 2 === 1, dy = 6 + (i % 3 === 2 ? 20 : i % 3 === 0 ? -10 : 6);
              return <a key={p.id} href={q({ place: sp.place === place(p).city ? undefined : place(p).city })} aria-label={`${place(p).city}: show entries`}><g className={`rpin ${pStat(p)}${sp.place === place(p).city ? " on" : ""}`} transform={`translate(${x.toFixed(0)} ${y.toFixed(0)})`}><circle r="16" className="rpin-halo" /><circle r="8" className="rpin-dot" /><text className="rpin-l" x={east ? -12 : 12} y={dy} textAnchor={east ? "end" : "start"}>{place(p).city}</text></g></a>; })}
          </svg>
          <figcaption><span className="lg verified" />Verified <span className="lg checking" />Under verification <span className="lg proposed" />Proposed. Positions are approximate. Boundary: DataMeet India composite map (CC BY 4.0).</figcaption>
        </figure>
      </div></section>
      {!places && <Unavailable />}
      <div className="rfilters">
        <div className="rfrow"><span className="rflab">Region</span><Link className={`atype${!sp.state ? " on" : ""}`} href={q({ state: undefined })}>All <i>{all.length}</i></Link>{states.map((s) => <Link key={s} className={`atype${sp.state === s ? " on" : ""}`} href={q({ state: sp.state === s ? undefined : s })}>{s} <i>{all.filter((p) => place(p).state === s).length}</i></Link>)}</div>
        <div className="rfrow"><span className="rflab">Type</span>{kinds.map((k) => <Link key={k} className={`atype${sp.kind === k ? " on" : ""}`} href={q({ kind: sp.kind === k ? undefined : k })}><Icon k={k} />{k} <i>{all.filter((p) => p.kind === k).length}</i></Link>)}</div>
        <div className="bar">{(sp.state || sp.kind || sp.st || sp.place) && <Link className="link" href="/recognition">Clear all filters</Link>}<span className="meta">{list.length} of {all.length} entries</span><span className="grow" /><a className="btn small" href="#add">Add an entry</a></div>
      </div>
      {places && (list.length ? groups.map((g) => (
        <section key={g}><h2 className="sect rstate">{g} <span>{list.filter((p) => place(p).state === g).length}</span></h2>
          <div className="rgrid">{list.filter((p) => place(p).state === g).sort((a, b) => order(a) - order(b)).map((p) => <Card key={p.id} p={p} ed={ed} signedIn={signedIn} sources={sources} />)}</div></section>
      )) : <p className="empty">No entries match these filters.</p>)}
      <h2 className="sect" id="add">Add an entry</h2>
      {canContribute(who) ? <ContributeForm kind="place" camps={(camps ?? []).map((c) => ({ id: c.id, name: c.name }))} /> : <p className="notice">{who.id ? "To contribute, ask the foundation to invite you as a contributor." : <>Please <Link href="/login?next=/recognition">sign in</Link> to add an entry.</>}</p>}
    </>
  );
}
