import type { Metadata } from "next";
import { pageMeta, SITE, abs } from "@/lib/seo";
import ShareBar from "@/components/ShareBar";
import JsonLd from "@/components/JsonLd";
import { notFound } from "next/navigation";
import Link from "next/link";
import { get, me, isEditor, type Story } from "@/lib/api";
import { AssessTag, NatureTag, MemberTag, HistoryPanel, CitePanel, fmtDate } from "@/components/ui";
import CorrectionBox from "@/components/CorrectionBox";
import { SaluteButton, DeleteButton, EditText } from "@/components/Interact";

type Params = { params: Promise<{ id: string }> };
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params; const s = await get<Story>(`/api/stories/${id}`);
  const d = s ? (s.body ?? "").replace(/\s+/g, " ").trim().slice(0, 158) : "";
  return s ? pageMeta(s.title, d.length >= 70 ? d : (d + " A story by " + (s.authorName ?? "a member") + " about Lt Gen Sagat Singh, labelled by the nature of the material and how well its claims are supported.").slice(0, 158), "/stories/" + id) : { title: "Story", robots: { index: false } };
}

export default async function StoryPage({ params }: Params) {
  const { id } = await params;
  const [s, who, mine, count] = await Promise.all([get<Story>(`/api/stories/${id}`), me(), get<string[]>("/api/me/salutes"), get<{ count: number }>(`/api/stories/${id}/salutes`)]);
  if (!s) notFound();
  const d = s.data as Record<string, string>;
  return (
    <article>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: s.title.slice(0, 110), datePublished: s.createdAt, inLanguage: "en-IN", mainEntityOfPage: `${SITE}/stories/${s.id}`,
        author: { "@type": "Person", name: s.authorName || "A member" }, publisher: { "@id": `${SITE}/#organization` }, about: { "@id": `${SITE}/#subject` }, articleBody: (s.body ?? "").slice(0, 5000) }} />
      <p><Link href="/stories">← Stories</Link></p>
      <h1>{s.title}</h1>
      <p className="meta">{s.kind}{s.era ? ` · ${s.era}` : ""} · by {s.authorName} · {fmtDate(s.createdAt)}</p>
      <p className="tags"><MemberTag /> <NatureTag n={s.nature} /> <AssessTag k={s.assessment} /></p>
      <div className="sharerow"><ShareBar url={abs(`/stories/${s.id}`)} title={s.title} text={(s.body ?? "").slice(0, 200)} /></div>
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
