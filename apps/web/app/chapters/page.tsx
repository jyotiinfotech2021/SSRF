import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { get, type Chapter, type Member, type EventItem, type Story, type ArchiveItem } from "@/lib/api";
import { Unavailable, fmtDate } from "@/components/ui";
import { INDIA, inP } from "@/lib/indiaMap";

export const metadata: Metadata = pageMeta("Regional chapters of the Sagat Singh Research Foundation", "Regional chapters of the foundation and what each is working on: local research, memorial registers, school outreach and oral-history collection.", "/chapters");

// City positions for the map and a location line per chapter. Chapters abroad have no pin.
const LOC: Record<string, { place: string; lat?: number; lng?: number }> = {
  goa: { place: "Panaji, Goa", lat: 15.49, lng: 73.83 },
  rajasthan: { place: "Bikaner and Jaipur, Rajasthan", lat: 28.02, lng: 73.31 },
  delhi: { place: "New Delhi and the National Capital Region", lat: 28.61, lng: 77.21 },
  "pune-mumbai": { place: "Pune and Mumbai, Maharashtra", lat: 18.75, lng: 73.4 },
  bengaluru: { place: "Bengaluru, Karnataka", lat: 12.97, lng: 77.59 },
  northeast: { place: "Guwahati, Shillong and Gangtok", lat: 26.14, lng: 91.74 },
  overseas: { place: "Bangladesh and abroad" },
};

export default async function Chapters() {
  const [chapters, members, events, stories, archive] = await Promise.all([get<Chapter[]>("/api/chapters"), get<Member[]>("/api/members"), get<EventItem[]>("/api/events"), get<Story[]>("/api/stories"), get<ArchiveItem[]>("/api/archive")]);
  const chs = [...(chapters ?? [])].sort((a, b) => (a.order || 99) - (b.order || 99));
  const today = new Date().toISOString().slice(0, 10);
  const stats = (c: Chapter) => {
    const mem = (members ?? []).filter((m) => m.chapter === c.name || m.chapter === c.id), ids = new Set(mem.map((m) => m.id));
    const ev = (events ?? []).filter((e) => { const ch = (e.data as { chapter?: string }).chapter; return ch === c.id || ch === c.name; });
    const up = ev.filter((e) => (e.date ?? "") >= today).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const past = ev.filter((e) => (e.date ?? "") < today).sort((a, b) => String(b.date).localeCompare(String(a.date)));
    const st = (stories ?? []).filter((s) => s.authorId && ids.has(s.authorId) && s.status !== "rejected").length;
    const ar = (archive ?? []).filter((a) => a.authorId && ids.has(a.authorId)).length;
    return { n: mem.length, up, past, st, ar };
  };
  const all = chs.map((c) => ({ c, s: stats(c) }));
  const tot = all.reduce((t, x) => ({ n: t.n + x.s.n, ev: t.ev + x.s.up.length + x.s.past.length, st: t.st + x.s.st + x.s.ar }), { n: 0, ev: 0, st: 0 });
  const pins = chs.filter((c) => LOC[c.id]?.lat);
  return (
    <>
      <section className="llanding"><div className="llanding-inner chhead">
        <div>
          <p className="eyebrow">SSRF Chapters</p>
          <h1>Chapters across India and abroad</h1>
          <p>Each chapter has a defined research and outreach purpose, a coordinator and its own programmes, from oral-history collection to school outreach and seminars.</p>
          <p className="alanding-stats"><b>{chs.length}</b> chapters · <b>{tot.n}</b> members · <b>{tot.ev}</b> events · <b>{tot.st}</b> research contributions</p>
        </div>
        <figure className="imap">
          <svg viewBox={`0 0 ${INDIA.W} ${INDIA.H}`} role="img" aria-label="Map of India showing chapter locations">
            <path d={INDIA.d} className="imap-land" />
            {pins.map((c) => { const l = LOC[c.id], [x, y] = inP(l.lat!, l.lng!), east = l.lng! > 88 || c.id === "rajasthan";
              return <a key={c.id} href={`#ch-${c.id}`}><g className="ipin active" transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}><circle r="15" className="ipin-halo" /><circle r="7" /><text x={east ? -16 : 16} y="6" textAnchor={east ? "end" : "start"}>{c.name}</text></g></a>; })}
          </svg>
          <figcaption>Chapter locations. Members abroad belong to the Overseas chapter. Boundary: DataMeet India composite map (CC BY 4.0).</figcaption>
        </figure>
      </div></section>
      {!chapters && <Unavailable />}
      <div className="chgrid">
        {all.map(({ c, s }) => (
          <article className="chcard" id={`ch-${c.id}`} key={c.id}>
            <header><div><h3>{c.name}</h3><p className="chloc">{LOC[c.id]?.place ?? ""}</p></div></header>
            <dl className="chfacts">
              <dt>Purpose</dt><dd><ul>{c.purpose.map((p) => <li key={p}>{p}</li>)}</ul></dd>
              <dt>Coordinator</dt><dd>{c.coordinator ? c.coordinator : <span className="meta">Being appointed</span>}</dd>
            </dl>
            <div className="chstats">
              <div><b>{s.n}</b><span>{s.n === 1 ? "member" : "members"}</span></div>
              <div><b>{s.up.length + s.past.length}</b><span>events</span></div>
              <div><b>{s.st}</b><span>stories</span></div>
              <div><b>{s.ar}</b><span>archive items</span></div>
            </div>
            {s.up.length || s.past.length ? (
              <div className="chact"><h4>Activities</h4>
                {s.up.length > 0 && <><p className="chlab">Upcoming</p><ul>{s.up.slice(0, 3).map((e) => <li key={e.id}><Link href="/events">{e.title}</Link> <span className="meta">{fmtDate(e.date)}</span></li>)}</ul></>}
                {s.past.length > 0 && <><p className="chlab">Recent</p><ul>{s.past.slice(0, 2).map((e) => <li key={e.id}><Link href="/events">{e.title}</Link> <span className="meta">{fmtDate(e.date)}</span></li>)}</ul></>}
              </div>
            ) : <p className="chnone">Its programmes will be listed here as they are added to the Events page.</p>}
            <div className="actions"><Link href={`/members?chapter=${encodeURIComponent(c.name)}`}>See members</Link></div>
          </article>))}
      </div>
    </>
  );
}
