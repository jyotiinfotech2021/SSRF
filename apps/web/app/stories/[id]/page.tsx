import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { get, me, isEditor, type Story } from "@/lib/api";
import { AssessTag, NatureTag, MemberTag, HistoryPanel, CitePanel, fmtDate } from "@/components/ui";
import CorrectionBox from "@/components/CorrectionBox";
import { SaluteButton, DeleteButton, EditText } from "@/components/Interact";

type Params = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params; const s = await get<Story>(`/api/stories/${id}`);
  return s ? { title: s.title, description: (s.body ?? "").slice(0, 160) } : { title: "Story" };
}

export default async function StoryPage({ params }: Params) {
  const { id } = await params;
  const [s, who, mine, count] = await Promise.all([get<Story>(`/api/stories/${id}`), me(), get<string[]>("/api/me/salutes"), get<{ count: number }>(`/api/stories/${id}/salutes`)]);
  if (!s) notFound();
  const d = s.data as Record<string, string>;
  return (
    <article>
      <p><Link href="/stories">← Stories</Link></p>
      <h1>{s.title}</h1>
      <p className="meta">{s.kind}{s.era ? ` · ${s.era}` : ""} · by {s.authorName} · {fmtDate(s.createdAt)}</p>
      <p className="tags"><MemberTag /> <NatureTag n={s.nature} /> <AssessTag k={s.assessment} /></p>
      <div className="prose">{(s.body ?? "").split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>
      {d.video && <p><a href={d.video} target="_blank" rel="noopener noreferrer">Watch the video</a></p>}
      <SaluteButton id={s.id} initial={!!mine?.includes(s.id)} count={count?.count ?? 0} signedIn={!!who.id} />
      <HistoryPanel target={`stories/${s.id}`} />
      {who.id ? <CorrectionBox target={`stories/${s.id}`} title={s.title} /> : null}
      {isEditor(who) && <div className="panel"><h3>Editors</h3><EditText col="stories" id={s.id} value={s.body ?? ""} label="story text" /><DeleteButton col="stories" id={s.id} label="Unpublish this story" confirmText="Unpublish this story? The contributor's submission and its history remain." /></div>}
      <CitePanel title={s.title} path={`/stories/${s.id}`} />
    </article>
  );
}
