import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { get, me, canContribute, isEditor, type Book, type Campaign } from "@/lib/api";
import { Unavailable, HistoryPanel } from "@/components/ui";
import { englishTitle, usefulNote } from "@/lib/text";
import AutoForm from "@/components/AutoForm";
import VideoThumb from "@/components/VideoThumb";
import ContributeForm from "@/components/ContributeForm";
import CorrectionBox from "@/components/CorrectionBox";
import { StatusForm, DeleteButton } from "@/components/Interact";

export const metadata: Metadata = pageMeta("Videos and lectures about Lt Gen Sagat Singh", "Documentaries, interviews, talks and commemorations about Lt Gen Sagat Singh, made by other people. Each card opens the original video and credits its creator.", "/videos");
type D = { author?: string; creator?: string; featureOrder?: number; publisher?: string; year?: string; link?: string; duration?: string; vtype?: string; featured?: boolean };
const VTALK = new Set(["Interview", "Speech", "Talk or lecture", "Commemoration"]);
const VCAMP: Record<string, string> = { goa: "Goa 1961", nathula: "Nathu La 1967", meghna: "1971 war" };
const vHost = (u?: string) => { try { const h = new URL(String(u)).hostname.replace(/^www\./, ""); return /youtu/.test(h) ? "YouTube" : ({ "thelallantop.com": "The Lallantop", "thequint.com": "The Quint" } as Record<string, string>)[h] || h; } catch { return ""; } };

function VCard({ b, big, ed, signedIn, camps }: { b: Book; big?: boolean; ed: boolean; signedIn: boolean; camps: Campaign[] }) {
  const d = b.data as D, host = vHost(d.link), cs = b.camps ?? [];
  const title = englishTitle(b.title, `Hindi-language video${(b.data as D).publisher ? " from " + (b.data as D).publisher : ""}`);
  const camp = cs.length === 1 ? VCAMP[cs[0]] ?? camps.find((c) => c.id === cs[0])?.name : cs.length > 1 ? "His career" : "";
  const meta = [d.creator || d.author, d.year, d.duration].filter(Boolean).join(" · ");
  return (
    <article className={`vcard${big ? " big" : ""}`} id={b.id}>
      <VideoThumb link={d.link} title={title} label={camp || d.vtype} duration={d.duration} type={d.vtype} host={host} />
      <div className="vbody">
        <h3><a href={d.link} target="_blank" rel="noopener noreferrer">{title}</a></h3>
        {meta && <p className="vmeta">{meta}</p>}
        {b.description && <p className="vdesc">{b.description}</p>}
        {usefulNote(b.verNote) && <p className="meta">{usefulNote(b.verNote)}</p>}
        <p className="vcredit">Original on <a href={d.link} target="_blank" rel="noopener noreferrer">{host || "source site"}</a>{d.creator || d.author ? `, by ${d.creator || d.author}` : ", credited to the channel that uploaded it"}. Views and credit stay with the creator.</p>
        <div className="actions">{signedIn && <CorrectionBox target={`books/${b.id}`} title={title} />}</div>
        <HistoryPanel target={`books/${b.id}`} />
        {ed && <div className="actions"><StatusForm col="books" id={b.id} status={b.status} note={b.verNote} /><DeleteButton col="books" id={b.id} label="Delete" confirmText="Delete this entry? It can be restored only from a backup." /></div>}
      </div>
    </article>
  );
}

export default async function Videos({ searchParams }: { searchParams: Promise<{ camp?: string }> }) {
  const sp = await searchParams;
  const [books, who, camps] = await Promise.all([get<Book[]>("/api/books"), me(), get<Campaign[]>("/api/campaigns")]);
  const ed = isEditor(who), signedIn = !!who.id, cl = camps ?? [];
  const all = (books ?? []).filter((b) => b.kind === "Documentary or video" && (ed || b.status !== "rejected"));
  const byOrder = (a: Book, b: Book) => ((a.data as D).featureOrder ?? 99) - ((b.data as D).featureOrder ?? 99) || String(a.createdAt).localeCompare(String(b.createdAt));
  const grid = (l: Book[], big?: boolean) => <div className={`vgrid${big ? " big" : ""}`}>{[...l].sort(byOrder).map((b) => <VCard key={b.id} b={b} big={big} ed={ed} signedIn={signedIn} camps={cl} />)}</div>;
  const feat = all.filter((b) => (b.data as D).featured), rest = all.filter((b) => !(b.data as D).featured);
  const talks = rest.filter((b) => VTALK.has((b.data as D).vtype ?? "")), docs = rest.filter((b) => !VTALK.has((b.data as D).vtype ?? ""));
  const groups: [string, Book[]][] = [...cl.map((c): [string, Book[]] => [c.name, docs.filter((b) => (b.camps ?? []).length === 1 && b.camps[0] === c.id)]), ["His life and career", docs.filter((b) => (b.camps ?? []).length !== 1)]];
  return (
    <>
      <h1 className="bio-title">Videos</h1>
      <p className="sub">Documentaries, interviews, talks and commemorations about him, made by other people. Every card opens the original video, so views and credit stay with its creator.</p>
      {!books && <Unavailable />}
      <AutoForm className="bar" action="/videos">
        <select name="camp" defaultValue={sp.camp ?? ""} aria-label="Filter by campaign"><option value="">All campaigns</option>{cl.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <noscript><button className="btn small ghost" type="submit">Apply</button></noscript>
        <span className="meta">{sp.camp ? `${all.filter((b) => (b.camps ?? []).includes(sp.camp!)).length} of ${all.length} videos` : `${all.length} videos`}</span>{sp.camp && <Link className="link" href="/videos">Show all videos</Link>}<span className="grow" />
        <a className="btn small" href="#suggest">Suggest a video</a>
      </AutoForm>
      {books && (sp.camp ? (() => { const l = all.filter((b) => (b.camps ?? []).includes(sp.camp!)); return l.length ? grid(l) : <p className="empty">No videos for this campaign yet.</p>; })() : (
        <>
          {feat.length > 0 && <><h2 className="sect">Featured documentaries</h2>{grid(feat, true)}</>}
          {groups.filter((g) => g[1].length).map(([n, l]) => <section key={n}><h2 className="sect">{n}</h2>{grid(l)}</section>)}
          {talks.length > 0 && <><h2 className="sect">Interviews, speeches, lectures and commemorations</h2>{grid(talks)}</>}
          {!all.length && <p className="empty">No videos have been catalogued yet.</p>}
        </>
      ))}
      <h2 className="sect" id="suggest">Suggest a video</h2>
      {canContribute(who) ? <ContributeForm kind="book" camps={cl.map((c) => ({ id: c.id, name: c.name }))} /> : <p className="notice">{who.id ? "To contribute, ask the foundation to invite you as a contributor." : <>Please <Link href="/login?next=/videos">sign in</Link> to suggest a video.</>}</p>}
    </>
  );
}
