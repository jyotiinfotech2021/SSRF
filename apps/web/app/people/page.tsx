import type { Metadata } from "next";
import { get, type Entity } from "@/lib/api";
import { PageHead, ShortCite, sourceMap, Unavailable, Empty } from "@/components/ui";

export const metadata: Metadata = { title: "People and units", description: "People and military units connected with Lt Gen Sagat Singh's career." };

export default async function People() {
  const [ents, sources] = await Promise.all([get<Entity[]>("/api/entities"), sourceMap()]);
  const group = (t: string) => (ents ?? []).filter((e) => (t === "unit" ? e.type === "unit" : e.type !== "unit"));
  const block = (title: string, rows: Entity[]) => (
    <section><h2 className="sect">{title}</h2>
      {rows.length ? rows.map((e) => (
        <article key={e.id} className="person" id={e.id}>
          <h3>{e.name}{e.period ? <small> {e.period}</small> : null}</h3><p>{e.role}</p>
          <p className="meta">Sources: <ShortCite keys={e.cites} sources={sources} /></p>
        </article>)) : <Empty>None listed yet.</Empty>}
    </section>);
  return (<><PageHead title="People and units" />{!ents && <Unavailable />}{block("People", group("person"))}{block("Military units", group("unit"))}</>);
}
