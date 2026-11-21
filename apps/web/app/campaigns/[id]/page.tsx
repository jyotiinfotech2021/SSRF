import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { notFound } from "next/navigation";
import Link from "next/link";
import { get, me, type Campaign, type Claim, type Entity, type Cite, type Story, type Book, type Place, type EventItem, type ArchiveItem, type Source } from "@/lib/api";
import CampaignMap, { hasCampaignMap, campaignFocus, campaignFocusBox } from "@/components/CampaignMap";
import { ClaimCard, Cites, ShortCite, sourceMap, HistoryPanel, CitePanel, NatureTag, AssessTag, StatusTag, fmtDay } from "@/components/ui";
import CorrectionBox from "@/components/CorrectionBox";

type Params = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const c = await get<Campaign>(`/api/campaigns/${id}`);
  return c ? pageMeta(c.name, String(c.data.lead ?? "").replace(/\s+/g, " ").trim().slice(0, 158) || "The " + c.name + " campaign of Lt Gen Sagat Singh, with chronology, command structure, claims and sources.", "/campaigns/" + id) : { title: "Campaign", robots: { index: false } };
}
const asCites = (keys: unknown): Cite[] => (Array.isArray(keys) ? keys.map((k, i) => ({ id: i, sourceId: String(k), position: i })) : []);
type Row = { d?: string; e?: string; s?: string; m?: boolean };
type Mile = { fig: string; label: string; s?: string; loc?: string };
type Node = { id: string; name: string; parent: string | null; who?: string; his?: boolean; checked?: boolean; cite?: string };
type Dec = { d: string; c: string; s?: string };

const RANKFULL: Record<string, string> = { Brig: "Brigadier", "Maj Gen": "Major General", "Lt Gen": "Lieutenant General", Gen: "General" };
const echelon = (n: string) => /Headquarters$/.test(n) ? "Army HQ" : /Command$/.test(n) ? "Command" : /Corps$/.test(n) ? "Corps" : /Division$/.test(n) ? "Division" : /Brigade$/.test(n) ? "Brigade" : /Para|Infantry|Regiment|Rifles|Battalion|LI\b/.test(n) ? "Battalion" : "";
const TOC: [string, string][] = [["background", "Background"], ["map", "Map"], ["objectives", "Objectives"], ["situation", "Situation"], ["findings", "What the sources say"], ["chronology", "Chronology"], ["command", "Command structure"], ["units", "Order of battle"], ["role", "His role"], ["decisions", "Decisions"], ["eyewitness", "Eyewitness accounts"], ["records", "Official and archival sources"], ["disagreements", "Disagreements"], ["significance", "Why it mattered"]];

function Org({ nodes, parent, sources }: { nodes: Node[]; parent: string | null; sources: Map<string, Source> }) {
  void sources;
  const kids = nodes.filter((n) => (n.parent ?? null) === parent);
  if (!kids.length) return null;
  return (
    <ul>{kids.map((n) => (
      <li key={n.id}>
        <div className={`oc-node${n.his ? " his" : ""}`}>
          {echelon(n.name) && <span className="oc-lvl">{echelon(n.name)}</span>}
          <b>{n.name}</b>
          {n.who && n.who !== "To be confirmed" ? <span className="oc-who">{n.who}</span> : n.who ? <span className="oc-who muted">Commander to be confirmed</span> : null}
          {n.his && <span className="oc-his">His command</span>}
        </div>
        <Org nodes={nodes} parent={n.id} sources={sources} />
      </li>))}
    </ul>
  );
}

export default async function CampaignPage({ params }: Params) {
  const { id } = await params;
  const [c, claims, entities, sources, who, camps, stories, books, places, events, archive] = await Promise.all([
    get<Campaign>(`/api/campaigns/${id}`), get<Claim[]>(`/api/claims?scope=${id}`), get<Entity[]>("/api/entities"), sourceMap(), me(), get<Campaign[]>("/api/campaigns"),
    get<Story[]>("/api/stories"), get<Book[]>("/api/books"), get<Place[]>("/api/places"), get<EventItem[]>("/api/events"), get<ArchiveItem[]>("/api/archive"),
  ]);
  if (!c) notFound();
  const d = c.data as Record<string, unknown>;
  const text = (k: string) => { const v = String(d[k] ?? ""); return /^Not yet researched/.test(v) ? "" : v; };
  const list = (k: string) => (Array.isArray(d[k]) ? (d[k] as unknown[]) : []);
  const has = (x: { camps: string[]; status?: string }) => (x.camps ?? []).includes(id) && x.status !== "rejected";
  const idx = (camps ?? []).findIndex((x) => x.id === id), total = camps?.length ?? 0;
  const cl = [...(claims ?? [])].sort((a, b) => a.order - b.order);
  const eye = (stories ?? []).filter((s) => has(s) && ["Oral history", "Family testimony"].includes(s.nature ?? ""));
  const arch = (archive ?? []).filter((a) => has(a));
  const eyeArch = arch.filter((a) => a.category === "Oral history"), archOther = arch.filter((a) => a.category !== "Oral history");
  const prim = (books ?? []).filter((b) => has(b) && b.nature === "Primary source");
  const libs = (books ?? []).filter(has), recs = (places ?? []).filter(has), evs = (events ?? []).filter(has);
  const chron = list("chronology") as Row[], command = list("command") as Node[], units = list("units") as string[], decisions = list("decisions") as Dec[], miles = list("milestones") as Mile[];
  const usedSrc = [...new Set([...cl.flatMap((x) => x.citations.map((y) => y.sourceId)), ...chron.map((r) => r.s).filter(Boolean) as string[], ...command.map((n) => n.cite).filter(Boolean) as string[]])];
  const related = (entities ?? []).filter((e) => e.camps.includes(id));
  const his = command.find((n) => n.his), rk = his?.who && Object.keys(RANKFULL).sort((a, b) => b.length - a.length).find((r) => his.who!.startsWith(r + " "));
  const yr = text("year") || (String(d.era ?? c.name).match(/(19|20)\d\d/) ?? [""])[0];
  const facts: [string, string | undefined][] = [["Theatre", text("theatre")], ["His command", his?.name], ["His rank", rk ? RANKFULL[rk] : undefined], ["Dates", text("dates")]];
  const focus = campaignFocus(id), box = campaignFocusBox(id);
  const mapOk = hasCampaignMap(id);
  const shown: Record<string, boolean> = {
    background: !!text("background"), map: mapOk, objectives: !!text("objectives"), situation: !!text("situation"), findings: cl.length > 0, chronology: chron.length > 0,
    command: command.length > 0, units: units.length > 0, role: !!text("role"), decisions: decisions.length > 0, eyewitness: eye.length + eyeArch.length > 0,
    records: true, disagreements: list("disagreements").length > 0, significance: !!text("significance"),
  };
  const textSection = (k: string, title: string) => shown[k] ? (
    <section className="dos" id={`s-${k}`}><h4>{title}</h4><p>{text(k)}</p>
      {asCites(d[k + "Cites"]).length > 0 && <p className="meta">Sources: <ShortCite keys={asCites(d[k + "Cites"]).map((x) => x.sourceId)} sources={sources} /></p>}
      <HistoryPanel target={`campaigns/${id}#${k}`} /></section>) : null;
  const listSection = (k: string, title: string, items: unknown[]) => shown[k] ? (
    <section className="dos" id={`s-${k}`}><h4>{title}</h4><ul>{items.map((x, i) => <li key={i}>{String(x)}</li>)}</ul><HistoryPanel target={`campaigns/${id}#${k}`} /></section>) : null;
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: c.name, description: text("lead"), about: { "@type": "Event", name: c.name }, author: { "@type": "Organization", name: "Sagat Singh Research Foundation" }, mainEntityOfPage: `/campaigns/${id}` };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      <h2>Campaigns</h2>
      <p className="sub">The three campaigns that defined his career, each with its sources.</p>
      <div className="seg-tabs" role="tablist">{camps?.map((x) => <Link key={x.id} role="tab" aria-selected={x.id === id} href={`/campaigns/${x.id}`}>{x.name}</Link>)}</div>

      <header className="cbanner">
        {focus && box && <svg className="cb-shape" viewBox={`0 0 ${box.W} ${box.H}`} preserveAspectRatio="xMaxYMid meet" aria-hidden="true"><path d={focus} /></svg>}
        {yr && <span className="cb-year" aria-hidden="true">{yr}</span>}
        <div className="cb-inner">
          <p className="cb-eye">Campaign {idx + 1} of {total}{d.era ? ` · ${String(d.era)}` : ""}</p>
          <h1 className="cb-title">{c.name}</h1>
          <p className="cb-lead">{text("lead")}</p>
          <dl className="cb-facts">{facts.filter((f) => f[1]).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
        </div>
      </header>

      {miles.length > 0 && (
        <section className="callouts" aria-label="Operational milestones">{miles.map((m, i) => (
          <div className="callout" key={i}><b>{m.fig}</b><p>{m.label}</p><span className="meta">{m.s ? <ShortCite keys={[m.s]} sources={sources} /> : null}{m.loc ? `, ${m.loc}` : ""}</span></div>))}</section>)}

      <article className="dossier camp-dossier">
        <nav className="toc" aria-label="On this page">{TOC.filter(([k]) => shown[k]).map(([k, l]) => <a key={k} href={`#s-${k}`}>{l}</a>)}</nav>
        {textSection("background", "Historical and geopolitical background")}
        {mapOk && <section className="dos" id="s-map"><h4>The campaign area</h4><CampaignMap id={id} name={c.name} /></section>}
        {textSection("objectives", "Strategic objectives")}
        {textSection("situation", "Operational situation")}
        <section className="dos" id="s-findings"><h4>What the sources say</h4>
          {cl.length ? <div className="claims-list">{cl.map((x) => <ClaimCard key={x.id} c={x} sources={sources} signedIn={!!who.id} />)}</div> : <p className="meta">No findings have been published for this campaign yet.</p>}</section>
        {shown.chronology && (
          <section className="dos" id="s-chronology"><h4>Chronology of operations</h4>
            <ol className="vchron" style={{ ["--n" as string]: chron.length }}>{chron.map((r, i) => (
              <li key={i} className={r.m ? "ms" : ""}><span className="vc-dot" aria-hidden="true" /><time>{r.d}</time><p>{r.e}</p>{r.s && <span className="vc-src"><ShortCite keys={[r.s]} sources={sources} /></span>}</li>))}</ol>
            <HistoryPanel target={`campaigns/${id}#chronology`} /></section>)}
        {shown.command && (
          <section className="dos" id="s-command"><h4>Command structure</h4>
            <div className="orgchart"><Org nodes={command} parent={null} sources={sources} /></div>
            {(() => { const srcs = [...new Set(command.filter((n) => n.checked && n.cite).map((n) => n.cite!))]; return srcs.length ? <p className="meta">Sources: <ShortCite keys={srcs} sources={sources} /></p> : null; })()}</section>)}
        {listSection("units", "Order of battle and units", units)}
        {related.length > 0 && <p className="meta">Profiles: {related.map((e, i) => <span key={e.id}>{i > 0 && " · "}<Link href={`/people#${e.id}`}>{e.name}</Link></span>)}</p>}
        {textSection("role", "Sagat Singh's role")}
        {shown.decisions && (
          <section className="dos" id="s-decisions"><h4>Major decisions and their consequences</h4>
            <table className="plain"><thead><tr><th>Decision</th><th>Consequence</th><th>Source</th></tr></thead>
              <tbody>{decisions.map((r, i) => <tr key={i}><td>{r.d}</td><td>{r.c}</td><td>{r.s ? <ShortCite keys={[r.s]} sources={sources} /> : null}</td></tr>)}</tbody></table>
            <HistoryPanel target={`campaigns/${id}#decisions`} /></section>)}
        {shown.eyewitness && (
          <section className="dos" id="s-eyewitness"><h4>Eyewitness accounts</h4>
            <ul className="rel">
              {eye.map((s) => <li key={s.id}><Link href={`/stories#${s.id}`}>{s.title}</Link> <NatureTag n={s.nature} /> <AssessTag k={s.assessment} /></li>)}
              {eyeArch.map((a) => <li key={a.id}><Link href={`/archive/${a.id}`}>{a.title}</Link> <span className="meta">{a.id}</span></li>)}
            </ul></section>)}
        <section className="dos" id="s-records"><h4>Sources</h4>
          {archOther.length > 0 && <><p><b>In the SSRF archive</b></p><ul className="rel">{archOther.map((a) => <li key={a.id}><Link href={`/archive/${a.id}`}>{a.title}</Link> <span className="meta">{a.id}, {a.category}</span></li>)}</ul></>}
          {prim.length > 0 && <><p><b>Primary sources in the library</b></p><ul className="rel">{prim.map((b) => { const l = (b.data as { link?: string }).link; return <li key={b.id}>{l ? <a href={l} target="_blank" rel="noopener noreferrer">{b.title}</a> : b.title}</li>; })}</ul></>}
          <p><b>Sources cited on this page</b></p>
          <Cites cites={asCites(usedSrc)} sources={sources} />
        </section>
        {listSection("disagreements", "Historiographical disagreements", list("disagreements"))}
        {textSection("significance", "Why this campaign mattered")}
        {(libs.length > 0 || recs.length > 0 || evs.length > 0) && (
          <section className="dos"><h4>Related in the library, register and events</h4>
            <div className="grid-rel">
              {libs.length > 0 && <div><b>Library and videos</b><ul className="rel">{libs.map((x) => { const dd = x.data as { link?: string; author?: string }; return <li key={x.id}>{dd.link ? <a href={dd.link} target="_blank" rel="noopener noreferrer">{x.title}</a> : x.title} <span className="meta">{dd.author ?? ""}</span></li>; })}</ul></div>}
              {recs.length > 0 && <div><b>Recognition</b><ul className="rel">{recs.map((x) => <li key={x.id}>{x.title} <StatusTag s={x.status} /></li>)}</ul></div>}
              {evs.length > 0 && <div><b>Events</b><ul className="rel">{evs.map((x) => <li key={x.id}>{x.title} <span className="meta">{fmtDay(x.date)}</span></li>)}</ul></div>}
            </div></section>)}
        <div className="actions">{who.id ? <CorrectionBox target={`campaigns/${id}`} title={c.name} /> : <span className="meta"><Link href={`/login?next=/campaigns/${id}`}>Sign in</Link> to suggest a correction.</span>}</div>
        <CitePanel title={c.name} path={`/campaigns/${id}`} />
      </article>
    </>
  );
}
