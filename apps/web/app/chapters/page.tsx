import type { Metadata } from "next";
import { get, type Chapter, type Member, type EventItem } from "@/lib/api";
import { PageHead, Unavailable, Empty, fmtDay } from "@/components/ui";

export const metadata: Metadata = { title: "Chapters", description: "Regional chapters of the foundation and what each is working on." };

export default async function Chapters() {
  const [chapters, members, events] = await Promise.all([get<Chapter[]>("/api/chapters"), get<Member[]>("/api/members"), get<EventItem[]>("/api/events")]);
  return (
    <>
      <PageHead title="Chapters" lead="Chapters run local research, memorial registers, school outreach and oral-history collection." />
      {!chapters && <Unavailable />}
      {chapters && !chapters.length && <Empty>No chapters have been set up yet.</Empty>}
      {chapters?.map((c) => {
        const ms = (members ?? []).filter((m) => m.chapter === c.name || m.chapter === c.id);
        const evs = (events ?? []).filter((e) => (e.data as Record<string, string>).chapter === c.id || (e.data as Record<string, string>).chapter === c.name).slice(0, 3);
        return (
          <article key={c.id} className="chcard" id={c.id}>
            <h2 className="sect">{c.name}</h2>
            <p className="tags"><span className={`tag ${c.active ? "" : "as-unverified"}`}>{c.active ? "Active" : "Not yet active"}</span></p>
            {c.coordinator && <p className="meta">Coordinator: {c.coordinator}</p>}
            <ul>{c.purpose.map((p) => <li key={p}>{p}</li>)}</ul>
            <p className="meta">{ms.length} listed member{ms.length === 1 ? "" : "s"}</p>
            {evs.length > 0 && <ul className="plain">{evs.map((e) => <li key={e.id}>{fmtDay(e.date)}: {e.title}</li>)}</ul>}
          </article>);
      })}
    </>
  );
}
