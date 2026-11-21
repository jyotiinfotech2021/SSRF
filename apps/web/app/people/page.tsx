import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { get, me, type Entity, type Campaign } from "@/lib/api";
import { ShortCite, sourceMap, Unavailable, HistoryPanel, EditorialTag } from "@/components/ui";
import CorrectionBox from "@/components/CorrectionBox";

export const metadata: Metadata = pageMeta("People and military units in Sagat Singh's career", "People and military units connected with Lt Gen Sagat Singh's career, from the Bikaner Ganga Risala to the 3rd Gorkha Rifles and the formations he commanded.", "/people");

export default async function People() {
  const [ents, sources, camps, who] = await Promise.all([get<Entity[]>("/api/entities"), sourceMap(), get<Campaign[]>("/api/campaigns"), me()]);
  const campName = (id: string) => camps?.find((c) => c.id === id)?.name ?? id;
  const units = (ents ?? []).filter((e) => e.type === "unit").sort((a, b) => String(a.period).localeCompare(String(b.period)));
  const people = (ents ?? []).filter((e) => e.type !== "unit");
  const card = (e: Entity) => (
    <article className="story" id={e.id} key={e.id}>
      <div><EditorialTag />{e.period && <span className="tag">{e.period}</span>}</div>
      <h3>{e.name}</h3>
      <p>{e.role}</p>
      <p className="meta">{e.camps.length > 0 && <>Campaigns: {e.camps.map((c, i) => <span key={c}>{i > 0 && ", "}<Link href={`/campaigns/${c}`}>{campName(c)}</Link></span>)}. </>}Sources: <ShortCite keys={e.cites} sources={sources} /></p>
      <HistoryPanel target={`entities/${e.id}`} />
      <div className="actions">{who.id ? <CorrectionBox target={`entities/${e.id}`} title={e.name} /> : <span className="meta"><Link href="/login?next=/people">Sign in</Link> to suggest a correction.</span>}</div>
    </article>);
  return (
    <>
      <h1 className="bio-title">People and units</h1>
      <p className="sub">The formations he served in and commanded, and the people whose decisions crossed his. Profiles of living people are added only with their consent.</p>
      {!ents && <Unavailable />}
      <h2 className="sect">Units and formations</h2>
      {units.length ? units.map(card) : <p className="empty">None listed yet.</p>}
      <h2 className="sect">People</h2>
      {people.length ? people.map(card) : <p className="empty">None listed yet.</p>}
    </>
  );
}
