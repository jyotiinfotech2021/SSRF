import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { Suspense } from "react";
import { get, me, canContribute, isEditor, type EventItem, type Campaign, type Chapter } from "@/lib/api";
import { fmtDay, Unavailable } from "@/components/ui";
import ContributeForm from "@/components/ContributeForm";
import { AttendButton, DeleteButton } from "@/components/Interact";
import MediaPanel from "@/components/MediaPanel";
import ReportForm from "@/components/ReportForm";
import CorrectionBox from "@/components/CorrectionBox";
import FilterBar from "@/components/FilterBar";
import { ETYPES } from "@/lib/ref";
import JsonLd from "@/components/JsonLd";
import { SITE } from "@/lib/seo";

export const metadata: Metadata = pageMeta("Events and programmes: commemorations and research", "Commemorations, research events and public programmes about Lt Gen Sagat Singh, with reports, proceedings, photographs and press coverage for past events.", "/events");
type Media = { id: string; kind: string; fileId?: string; url?: string; caption?: string; credit?: string; ownerId: string };
type SP = { searchParams: Promise<{ etype?: string; chapter?: string }> };

export default async function Events({ searchParams }: SP) {
  const sp = await searchParams;
  const [events, who, camps, mine, chapters] = await Promise.all([get<EventItem[]>("/api/events"), me(), get<Campaign[]>("/api/campaigns"), get<string[]>("/api/me/attendance"), get<Chapter[]>("/api/chapters")]);
  const today = new Date().toISOString().slice(0, 10);
  const campName = (id: string) => camps?.find((c) => c.id === id)?.name ?? id;
  const all = (events ?? []).filter((e) => (!sp.etype || e.type === sp.etype) && (!sp.chapter || (e.data as { chapter?: string }).chapter === sp.chapter));
  const upcoming = all.filter((e) => (e.date ?? "") >= today).sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const past = all.filter((e) => (e.date ?? "") < today).sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  const ed = isEditor(who);
  const card = async (e: EventItem, isPast: boolean) => {
    const [media, att] = await Promise.all([get<Media[]>(`/api/events/${e.id}/media`), get<{ count: number }>(`/api/events/${e.id}/attendees`)]);
    const d = e.data as Record<string, string>;
    const where = [d.place || d.location, d.organiser ? `Organised by ${d.organiser}` : "", d.coordinator ? `Coordinator: ${d.coordinator}` : ""].filter(Boolean).join(". ");
    const hasReport = !!(d.summary || d.proceedings || d.attendance || d.outcomes || d.recording || d.press);
    return (
      <article key={e.id} className="story event-item" id={e.id}>
        <div className="when">{fmtDay(e.date)}</div>
        <p className="tags">
          {e.type && <span className="tag">{e.type}</span>}{d.chapter && <span className="tag">{d.chapter} chapter</span>}
          {e.camps.map((c) => <span key={c} className="tag">{campName(c)}</span>)}{d.time && <span className="meta"> {d.time}</span>}
        </p>
        <h3>{e.title}</h3>
        {where && <div className="meta">{where}</div>}
        {e.description && <p className="body">{e.description}</p>}
        {d.link && <p><a href={d.link} target="_blank" rel="noopener noreferrer">More details</a></p>}
        {hasReport && (
          <div className="panel event-report">
            <b>Report</b>
            {d.summary && <p>{d.summary}</p>}{d.proceedings && <p><b>Proceedings:</b> {d.proceedings}</p>}{d.attendance && <p><b>Attendance:</b> {d.attendance}</p>}{d.outcomes && <p><b>Outcomes:</b> {d.outcomes}</p>}
            {d.recording && <p><a href={d.recording} target="_blank" rel="noopener noreferrer">Recording</a></p>}{d.press && <p><b>Press:</b> {d.press}</p>}
          </div>)}
        <div className="story-actions">
          {!isPast && <AttendButton id={e.id} initial={!!mine?.includes(e.id)} count={att?.count ?? 0} signedIn={!!who.id} />}
          {ed && isPast && <ReportForm id={e.id} d={d} />}
          {who.id ? <CorrectionBox target={`events/${e.id}`} title={e.title} /> : <Link className="link quiet" href="/login?next=/events">Suggest a correction</Link>}
          {ed && <DeleteButton col="events" id={e.id} label="Delete event" confirmText="Delete this entry? It can be restored only from a backup." />}
        </div>
        <MediaPanel eventId={e.id} media={media ?? []} canAdd={canContribute(who)} uid={who.id} editor={ed} />
      </article>);
  };
  // Event structured data, only for events that have a date and a place (what search engines require).
  const eventLd = (events ?? []).filter((e) => e.date && (e.data as { place?: string }).place).map((e) => {
    const d = e.data as { place?: string; organiser?: string };
    return { "@type": "Event", name: e.title, startDate: e.date, eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: { "@type": "Place", name: d.place }, ...(e.description ? { description: e.description } : {}), ...(d.organiser ? { organizer: { "@type": "Organization", name: d.organiser } } : {}), url: `${SITE}/events#${e.id}` };
  });
  return (
    <>
      {eventLd.length > 0 && <JsonLd data={{ "@context": "https://schema.org", "@graph": eventLd }} />}
      <h1 className="bio-title">Events and programmes</h1>
      <p className="sub">Commemorations, research events and public programmes. When its date passes, an event moves to past events, where its report, proceedings, photographs, credits and press coverage become the permanent record.</p>
      {!events && <Unavailable />}
      <div className="story-bar">
        <Suspense fallback={null}><FilterBar filters={[{ param: "etype", label: "All types", options: ETYPES.map((t) => [t, t]) }, { param: "chapter", label: "All chapters", options: (chapters ?? []).map((c) => [c.name, c.name]) }]} /></Suspense>
        {canContribute(who) ? <a className="btn" href="#add-event">{ed ? "Add an event" : "Propose an event"}</a> : <Link className="btn" href="/login?next=/events">Sign in to propose an event</Link>}
      </div>
      <div id="add-event">{canContribute(who) && <ContributeForm kind="event" camps={(camps ?? []).map((c) => ({ id: c.id, name: c.name }))} editor={ed} openOnHash="#add-event" />}</div>

      <h3 className="sect">Upcoming</h3>
      {upcoming.length ? await Promise.all(upcoming.map((e) => card(e, false))) : <p className="empty">No upcoming events.</p>}
      <h3 className="sect">Past events</h3>
      {past.length ? await Promise.all(past.map((e) => card(e, true))) : <p className="empty">No past events recorded.</p>}
    </>
  );
}
