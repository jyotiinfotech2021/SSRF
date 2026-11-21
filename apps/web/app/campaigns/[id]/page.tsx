import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { notFound } from "next/navigation";
import Link from "next/link";
import { get, me, type Campaign, type Claim, type Entity, type Cite } from "@/lib/api";
import { MeghnaMap } from "@/components/LearnMaps";
import { PageHead, ClaimCard, Cites, ShortCite, sourceMap, HistoryPanel, CitePanel } from "@/components/ui";

type Params = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const c = await get<Campaign>(`/api/campaigns/${id}`);
  return c ? pageMeta(c.name, String(c.data.lead ?? "").replace(/\s+/g, " ").trim().slice(0, 158) || "The " + c.name + " campaign of Lt Gen Sagat Singh, with chronology, command structure, claims and sources.", "/campaigns/" + id) : { title: "Campaign", robots: { index: false } };
}
const asCites = (keys: unknown): Cite[] => (Array.isArray(keys) ? keys.map((k, i) => ({ id: i, sourceId: String(k), position: i })) : []);
type Row = { d?: string; e?: string; s?: string; m?: boolean };
type Mile = { fig: string; label: string; s?: string; loc?: string };
type Node = { id: string; name: string; parent: string | null; who?: string; his?: boolean; checked?: boolean };

export default async function CampaignPage({ params }: Params) {
  const { id } = await params;
  const [c, claims, entities, sources, who, camps] = await Promise.all([
    get<Campaign>(`/api/campaigns/${id}`), get<Claim[]>(`/api/claims?scope=${id}`), get<Entity[]>("/api/entities"), sourceMap(), me(), get<Campaign[]>("/api/campaigns"),
  ]);
  if (!c) notFound();
  const d = c.data as Record<string, unknown>;
  const text = (k: string) => String(d[k] ?? "");
  const list = (k: string) => (Array.isArray(d[k]) ? (d[k] as unknown[]) : []);
  const section = (title: string, k: string) => text(k) ? (
    <section><h2 className="sect">{title}</h2><p>{text(k)}</p>{asCites(d[k + "Cites"]).length > 0 && <Cites cites={asCites(d[k + "Cites"])} sources={sources} />}<HistoryPanel target={`campaigns/${id}#${k}`} /></section>
  ) : null;
  const related = (entities ?? []).filter((e) => e.camps.includes(id));
  return (
    <>
      <div className="seg-tabs" role="tablist">{camps?.map((x) => <Link key={x.id} role="tab" aria-selected={x.id === id} href={`/campaigns/${x.id}`}>{x.name}</Link>)}</div>
      <PageHead title={c.name} lead={text("lead")} />
      <p className="meta">{text("theatre")} · {text("dates")}</p>
      {section("Background", "background")}
      {id === "meghna" && <section id="map"><h2 className="sect">Map</h2><MeghnaMap /></section>}
      {section("Situation", "situation")}
      {section("Objectives", "objectives")}
      {section("His role", "role")}
      {list("milestones").length > 0 && (<section><h2 className="sect">Milestones</h2><ul className="plain">{(list("milestones") as Mile[]).map((m, i) => <li key={i}><b>{m.fig}</b> {m.label} {m.s ? <span className="meta">(<ShortCite keys={[m.s]} sources={sources} />{m.loc ? `, ${m.loc}` : ""})</span> : null}</li>)}</ul></section>)}
      {list("chronology").length > 0 && (<section><h2 className="sect">Chronology</h2><ol className="chrono">{(list("chronology") as Row[]).map((r, i) => <li key={i} className={r.m ? "milestone" : ""}><b>{r.d}</b> {r.e} {r.s ? <span className="meta">(<ShortCite keys={[r.s]} sources={sources} />)</span> : null}</li>)}</ol></section>)}
      {list("command").length > 0 && (<section><h2 className="sect">Chain of command</h2><ul className="ctree">{(list("command") as Node[]).map((n) => <li key={n.id} style={{ marginLeft: n.parent ? "1.2rem" : 0 }}><b>{n.name}</b>{n.who ? `, ${n.who}` : ""} {n.his && <span className="tag">His formation</span>} {!n.checked && <span className="tag as-unverified">Not yet checked</span>}</li>)}</ul>{text("commandNote") && <p className="meta">{text("commandNote")}</p>}</section>)}
      {section("Significance", "significance")}
      <section><h2 className="sect">Claims</h2>
        {claims?.length ? claims.map((cl) => <ClaimCard key={cl.id} c={cl} sources={sources} signedIn={!!who.id} />) : <p className="empty">No claims have been published for this campaign yet.</p>}
      </section>
      {related.length > 0 && <section><h2 className="sect">People and units</h2><ul className="plain">{related.map((e) => <li key={e.id}><b>{e.name}</b>{e.period ? ` (${e.period})` : ""}: {e.role}</li>)}</ul></section>}
      {(list("disagreements").length > 0 || list("unknowns").length > 0) && (
        <section><h2 className="sect">Open questions</h2>
          {list("disagreements").length > 0 && <><h3>Where accounts differ</h3><ul>{(list("disagreements") as string[]).map((x, i) => <li key={i}>{x}</li>)}</ul></>}
          {list("unknowns").length > 0 && <><h3>Not yet known</h3><ul>{(list("unknowns") as string[]).map((x, i) => <li key={i}>{x}</li>)}</ul></>}
        </section>)}
      {text("mapWanted") && <p className="notice">{text("mapWanted")}</p>}
      <CitePanel title={c.name} path={`/campaigns/${id}`} />
    </>
  );
}
