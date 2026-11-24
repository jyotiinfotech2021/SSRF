import type { Metadata } from "next";
import { pageMeta, SITE, SUBJECT } from "@/lib/seo";
import JsonLd from "@/components/JsonLd";
import Link from "next/link";
import { get, me, isEditor, type Claim } from "@/lib/api";
import { AssessTag, Cites, HistoryPanel, CitePanel, sourceMap, Unavailable, Empty, fmtDate } from "@/components/ui";
import CorrectionBox from "@/components/CorrectionBox";
import PageShare from "@/components/PageShare";

export const metadata: Metadata = pageMeta("Biography of Lt Gen Sagat Singh (1919–2001)", "The documented life of Lt Gen Sagat Singh as a timeline of ten milestones, from Bikaner to the Meghna crossing, each with its sources.", "/biography");

const WEAK = new Set(["attributed", "unverified", "disputed"]);
const settled = (c: Claim) => c.status === "settled" || c.status === "resolved";

export default async function Biography({ searchParams }: { searchParams: Promise<{ research?: string }> }) {
  const sp = await searchParams;
  const [claims, sources, who] = await Promise.all([get<Claim[]>("/api/claims?scope=life"), sourceMap(), me()]);
  const editor = isEditor(who);
  const research = editor && sp.research === "1"; // editors can reveal research notes; the public view never shows them
  const life = [...(claims ?? [])].sort((a, b) => a.order - b.order);
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ProfilePage", url: `${SITE}/biography`, name: "Biography of Lt Gen Sagat Singh", isPartOf: { "@id": `${SITE}/#website` },
        mainEntity: { "@type": "Person", "@id": `${SITE}/#subject`, name: SUBJECT.name, honorificPrefix: SUBJECT.honorificPrefix, honorificSuffix: SUBJECT.honorificSuffix, jobTitle: SUBJECT.jobTitle, birthDate: SUBJECT.birthDate, birthPlace: { "@type": "Place", name: SUBJECT.birthPlace }, deathDate: SUBJECT.deathDate, deathPlace: { "@type": "Place", name: SUBJECT.deathPlace } } }} />
      <h1 className="bio-title">Biography</h1>
      <p className="sub">His life in {life.length || "ten"} milestones. Every entry is sourced: open &quot;Sources&quot; under any entry to see them.</p>
      <PageShare inline />
      {editor && <p className="meta"><Link className="link" href={research ? "/biography" : "/biography?research=1"}>{research ? "Hide research notes (show the public view)" : "Show research notes (editors only)"}</Link></p>}
      {!claims && <Unavailable />}
      {claims && !life.length && <Empty>No biography milestones have been published yet.</Empty>}
      {life.length > 0 && (
        <ol className="timeline">
          {life.map((c) => (
            <li className="claim" id={c.id} key={c.id}>
              <div className="yr">{c.year}</div>
              <h3>{c.heading} {WEAK.has(c.assessment) && <AssessTag k={c.assessment} />}</h3>
              <p>{c.text}</p>
              <details className="evdet">
                <summary className="link evbtn">Sources</summary>
                <div className="evpanel">
                  <Cites cites={c.citations} sources={sources} />
                  {c.unresolved && (research || (WEAK.has(c.assessment) && !settled(c))) && (<><h4>{research ? "Research note" : "Still to confirm"}</h4><p>{c.unresolved}</p></>)}
                  {research && (
                    <p className="meta"><AssessTag k={c.assessment} /> <b>Research status:</b> {settled(c) ? "Settled" : "Open"}.{c.reviewedAt ? ` Last reviewed ${fmtDate(c.reviewedAt)}.` : ""}</p>
                  )}
                  <HistoryPanel target={`claims/${c.id}`} />
                  <div className="actions">{who.id ? <CorrectionBox target={`claims/${c.id}`} title={`${c.year ? c.year + " " : ""}${c.heading}`} /> : <span className="meta"><Link href="/login?next=/biography">Sign in</Link> to suggest a correction.</span>}</div>
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
      <CitePanel title="Lt Gen Sagat Singh: biography" path="/biography" />
    </>
  );
}
