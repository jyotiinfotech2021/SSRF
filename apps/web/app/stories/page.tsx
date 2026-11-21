import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { get, me, canContribute, isEditor, type Story, type Campaign } from "@/lib/api";
import { PageHead, AssessTag, NatureTag, MemberTag, fmtDate, Unavailable, Empty } from "@/components/ui";
import ContributeForm from "@/components/ContributeForm";
import { SaluteButton, DeleteButton } from "@/components/Interact";
import CorrectionBox from "@/components/CorrectionBox";
import { StoryFilters, AssessSelect } from "@/components/StoryTools";
import { ERAS, KINDS, NATURE } from "@/lib/ref";

export const metadata: Metadata = { title: "Stories", description: "Articles, memoirs, anecdotes and videos from members, each labelled by the nature of the material and how well its claims are supported." };
type SP = { searchParams: Promise<{ kind?: string; era?: string; material?: string; assess?: string }> };
const WEAK = new Set(["attributed", "unverified", "disputed"]);

export default async function Stories({ searchParams }: SP) {
  const sp = await searchParams;
  const [stories, who, camps, mine, counts] = await Promise.all([get<Story[]>("/api/stories"), me(), get<Campaign[]>("/api/campaigns"), get<string[]>("/api/me/salutes"), get<Record<string, number>>("/api/salutes/counts")]);
  const editor = isEditor(who);
  const rows = (stories ?? []).filter((s) => (!sp.kind || s.kind === sp.kind) && (!sp.era || s.era === sp.era) && (!sp.material || s.nature === sp.material) && (!sp.assess || s.assessment === sp.assess));
  const filtered = !!(sp.kind || sp.era || sp.material || sp.assess);
  return (
    <>
      <PageHead title="Stories" lead="Accounts, memoirs and anecdotes from members. Each is checked by an editor, labelled by the nature of the material and by how well its claims are supported." />
      {!stories && <Unavailable />}
      <div className="story-bar">
        <Suspense fallback={null}><StoryFilters kinds={KINDS} eras={ERAS} natures={NATURE} /></Suspense>
        {canContribute(who) ? <a className="btn" href="#contribute-story">Contribute a story</a> : <Link className="btn" href="/login?next=/stories">Sign in to contribute a story</Link>}
      </div>
      {filtered && <p className="meta">{rows.length} of {stories?.length ?? 0} stories. <Link className="link" href="/stories">Clear filters</Link></p>}

      {rows.length ? rows.map((s) => {
        const video = (s.data as { video?: string }).video;
        return (
          <article key={s.id} className="scard story-item" id={s.id}>
            <p className="tags"><MemberTag /> {s.kind && <span className="tag">{s.kind}</span>} {s.era && <span className="tag">{s.era}</span>} <NatureTag n={s.nature} /> <AssessTag k={s.assessment} /></p>
            <h3><Link href={`/stories/${s.id}`}>{s.title}</Link></h3>
            <p className="meta">{s.authorName}, {fmtDate(s.createdAt)}</p>
            <p>{(s.body ?? "").slice(0, 320)}{(s.body ?? "").length > 320 ? "…" : ""}</p>
            <div className="story-actions">
              {video && <a className="link" href={video} target="_blank" rel="noopener noreferrer">Watch the video</a>}
              <SaluteButton id={s.id} initial={!!mine?.includes(s.id)} count={counts?.[s.id] ?? 0} signedIn={!!who.id} />
              {who.id ? <CorrectionBox target={`stories/${s.id}`} title={s.title} /> : <Link className="link quiet" href={`/login?next=/stories`}>Suggest a correction</Link>}
            </div>
            {WEAK.has(s.assessment ?? "") && !editor && <p className="meta">This account has not been independently confirmed.</p>}
            {editor && (
              <div className="story-editor">
                <AssessSelect id={s.id} value={s.assessment ?? "unverified"} own={s.authorId === who.id} />
                <DeleteButton col="stories" id={s.id} label="Unpublish" confirmText="Unpublish this story? The contributor's submission and its history remain." />
              </div>
            )}
          </article>);
      }) : <Empty>{filtered ? "No stories match these filters." : "No stories have been published yet."}</Empty>}

      <div id="contribute-story">
        {canContribute(who) && <ContributeForm kind="story" camps={(camps ?? []).map((c) => ({ id: c.id, name: c.name }))} openOnHash="#contribute-story" />}
        {who.id && !canContribute(who) && <p className="notice">To contribute, ask the foundation to invite you as a contributor.</p>}
      </div>
    </>
  );
}
