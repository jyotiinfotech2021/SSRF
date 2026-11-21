import type { Metadata } from "next";
import Link from "next/link";
import { get, me, canContribute, isEditor, type EventItem, type Campaign } from "@/lib/api";
import { PageHead, fmtDay, Unavailable, Empty } from "@/components/ui";
import ContributeForm from "@/components/ContributeForm";
import { AttendButton, DeleteButton } from "@/components/Interact";
import MediaPanel from "@/components/MediaPanel";
import ReportForm from "@/components/ReportForm";

export const metadata: Metadata = { title: "Events", description: "Commemorative, research and public-engagement events of the foundation, with reports for past events." };
type Media = { id: string; kind: string; fileId?: string; url?: string; caption?: string; credit?: string; ownerId: string };

export default async function Events() {
  const [events, who, camps, mine] = await Promise.all([get<EventItem[]>("/api/events"), me(), get<Campaign[]>("/api/campaigns"), get<string[]>("/api/me/attendance")]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (events ?? []).filter((e) => (e.date ?? "") >= today);
  const past = (events ?? []).filter((e) => (e.date ?? "") < today).reverse();
  const ed = isEditor(who);
  const card = async (e: EventItem, isPast: boolean) => {
    const [media, att] = await Promise.all([get<Media[]>(`/api/events/${e.id}/media`), get<{ count: number }>(`/api/events/${e.id}/attendees`)]);
    const d = e.data as Record<string, string>;
    return (
      <article key={e.id} className="evcard" id={e.id}>
        <h3>{e.title}</h3>
        <p className="meta">{fmtDay(e.date)} · {e.type}{d.place ? ` · ${d.place}` : ""}</p>
        <p>{e.description}</p>
        {d.link && <p><a href={d.link} target="_blank" rel="noopener noreferrer">More information</a></p>}
        {!isPast && <AttendButton id={e.id} initial={!!mine?.includes(e.id)} count={att?.count ?? 0} signedIn={!!who.id} />}
        {isPast && (d.summary || d.proceedings || d.outcomes) && (
          <details open><summary>Event report</summary>
            {d.summary && <p>{d.summary}</p>}{d.proceedings && <p><b>Proceedings:</b> {d.proceedings}</p>}{d.attendance && <p><b>Attendance:</b> {d.attendance}</p>}{d.outcomes && <p><b>Outcomes:</b> {d.outcomes}</p>}
            {d.recording && <p><a href={d.recording} target="_blank" rel="noopener noreferrer">Recording</a></p>}{d.press && <p><b>Press:</b> {d.press}</p>}
          </details>)}
        <MediaPanel eventId={e.id} media={media ?? []} canAdd={canContribute(who)} uid={who.id} editor={ed} />
        {ed && <div className="actions">{isPast && <ReportForm id={e.id} d={d} />}<DeleteButton col="events" id={e.id} label="Delete" confirmText="Delete this entry? It can be restored only from a backup." /></div>}
      </article>);
  };
  return (
    <>
      <PageHead title="Events" />
      {!events && <Unavailable />}
      <h2 className="sect">Upcoming</h2>
      {upcoming.length ? await Promise.all(upcoming.map((e) => card(e, false))) : <Empty>No upcoming events are listed.</Empty>}
      <h2 className="sect">Past events</h2>
      {past.length ? await Promise.all(past.map((e) => card(e, true))) : <Empty>No past events are recorded yet.</Empty>}
      <h2 className="sect">Propose an event</h2>
      {canContribute(who) ? <ContributeForm kind="event" camps={(camps ?? []).map((c) => ({ id: c.id, name: c.name }))} editor={ed} /> : <p className="notice">{who.id ? "To contribute, ask the foundation to invite you as a contributor." : <>Please <Link href="/account">sign in</Link> to propose an event.</>}</p>}
    </>
  );
}
