import Link from "next/link";
import { get, type Campaign, type Claim, type EventItem, type Story, type ArchiveItem, type Place, type Quiz } from "@/lib/api";
import { fmtDay, Unavailable, Empty } from "@/components/ui";
import { Mark } from "@/components/Mark";
import QuizApp from "@/components/QuizApp";
import JsonLd from "@/components/JsonLd";
import { SITE, SUBJECT } from "@/lib/seo";


type Portrait = { url?: string; caption?: string; credit?: string; archiveId?: string };
type Img = { url: string; caption?: string; wide?: boolean; fit?: string };
type Feature = Place & { data: { featured?: boolean; featureOrder?: number; homeBlurb?: string; imagesNote?: string; images?: Img[]; archiveId?: string } };

export default async function Home() {
  const [camps, events, stories, archive, site, life, places, quiz, settings] = await Promise.all([
    get<Campaign[]>("/api/campaigns"), get<EventItem[]>("/api/events"), get<Story[]>("/api/stories"), get<ArchiveItem[]>("/api/archive"),
    get<Record<string, unknown>>("/api/site"), get<Claim[]>("/api/claims?scope=life"), get<Feature[]>("/api/places"), get<Quiz[]>("/api/quiz"), get<Record<string, unknown>>("/api/site"),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (events ?? []).filter((e) => (e.date ?? "") >= today).slice(0, 3);
  const portrait = site?.portrait as Portrait | undefined;
  const st = (settings?.settings ?? {}) as { governance?: string; council?: string };
  const features = (places ?? []).filter((p) => p.data?.featured && p.data.images?.length).sort((a, b) => (a.data.featureOrder ?? 9) - (b.data.featureOrder ?? 9));
  const recentArch = [...(archive ?? [])].filter((a) => a.status !== "rejected").sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);
  const recentStories = (stories ?? []).slice(0, 2);
  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Person", "@id": `${SITE}/#subject`, name: SUBJECT.name, honorificPrefix: SUBJECT.honorificPrefix, honorificSuffix: SUBJECT.honorificSuffix, jobTitle: SUBJECT.jobTitle,
        birthDate: SUBJECT.birthDate, birthPlace: { "@type": "Place", name: SUBJECT.birthPlace }, deathDate: SUBJECT.deathDate, deathPlace: { "@type": "Place", name: SUBJECT.deathPlace },
        description: "Indian Army general who led paratroopers into Goa in 1961, held Nathu La in 1967 and took IV Corps across the Meghna to Dhaka in 1971.", url: `${SITE}/biography`, mainEntityOfPage: `${SITE}/biography` }} />
      <section className="hero has-portrait hero-band hero-cine">
        <div className="hero-inner">
          <div className="hero-text">
            <div className="hero-mark"><Mark /><div className="hero-mark-text"><b>SSRF</b><span>Sagat Singh Research Foundation</span></div></div>
            <p className="hk-rank">Lieutenant General</p>
            <h1>Sagat Singh</h1>
            <p className="hk-hon">PVSM, Padma Bhushan</p>
            <p className="hk-years">1919–2001</p>
            <hr className="hk-rule" />
            <p className="lede">He led the paratroopers into Goa, held Nathu La against the Chinese and took his corps across the Meghna to Dhaka.</p>
            <p className="mission">The Sagat Singh Research Foundation preserves the evidence of his career, researches his campaigns and makes that history usable by schools, researchers and the public. Every claim on this site says what supports it.</p>
            <div className="entry"><Link className="btn" href="/campaigns">Explore his history</Link><Link className="btn ghost" href="/archive">Research the archive</Link><Link className="btn ghost" href="/account">Contribute</Link></div>
          </div>
          {portrait?.url && (
            <figure className="portrait">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={portrait.url} alt={`${portrait.caption ?? "Lt Gen Sagat Singh"} (${portrait.credit ?? "portrait"})`} width={1000} height={1176} fetchPriority="high" decoding="async" />
              <figcaption>{portrait.caption}{portrait.credit ? <span>{portrait.credit}</span> : null}</figcaption>
            </figure>
          )}
        </div>
      </section>

      <div className="ops" aria-label="His life at a glance">
        {(life ?? []).map((c) => <Link key={c.id} href={`/biography#${c.id}`}><b>{c.year}</b><span>{c.heading}</span></Link>)}
      </div>

      {features.length > 0 && <h2 className="sect">Proposed in Bikaner</h2>}
      {features.map((f) => (
        <section key={f.id} className="feature-museum">
          <h3>{f.title}</h3>
          <p>{f.data.homeBlurb ?? f.description} <Link href="/recognition">See the full details</Link>{f.data.archiveId ? <> or <Link href={`/archive/${f.data.archiveId}`}>open the full document</Link></> : null}.</p>
          <div className="concept">
            <p className="concept-note"><b>Artists&apos; renderings, not photographs.</b> {f.data.imagesNote}</p>
            <div className="concept-grid">
              {f.data.images!.map((i) => (
                <figure key={i.url} className={i.wide ? "wide" : undefined}>
                  <a href={i.url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={i.url} alt={`${i.caption ?? f.title} (artist's rendering)`} loading="lazy" className={i.fit === "contain" ? "fit" : undefined} />
                  </a>
                  <figcaption>{i.caption}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ))}

      <h2 className="sect">Campaigns</h2>
      {!camps && <Unavailable />}
      {camps?.length ? (
        <div className="cards">{camps.map((c) => (
          <Link key={c.id} href={`/campaigns/${c.id}`} className="card"><b>{c.name}</b><span>{String(c.data.lead ?? "")}</span></Link>))}
        </div>
      ) : <Empty>No campaigns have been published yet.</Empty>}

      {(recentArch.length > 0 || recentStories.length > 0) && (
        <>
          <h2 className="sect">From the archive and research</h2>
          <ul className="rel">
            {recentArch.map((a) => <li key={a.id}><Link href={`/archive/${a.id}`}>{a.title}</Link> <span className="meta">{a.id}, {a.category}</span></li>)}
            {recentStories.map((s) => <li key={s.id}><Link href={`/stories/${s.id}`}>{s.title}</Link> <span className="meta">{s.authorName}</span></li>)}
          </ul>
        </>
      )}
      {upcoming.length > 0 && (<><h2 className="sect">Upcoming events</h2><ul className="rel">{upcoming.map((e) => <li key={e.id}><Link href="/events">{e.title}</Link> <span className="meta">{fmtDay(e.date)}{(e.data as { place?: string }).place ? `, ${(e.data as { place?: string }).place}` : ""}</span></li>)}</ul></>)}

      <h2 className="sect">Learning</h2>
      <QuizApp all={quiz ?? []} editor={false} />

      <h2 className="sect">What the foundation needs</h2>
      <ul className="prose">
        <li><b>Oral histories</b> from veterans of 1961, 1967 and 1971, and from their families. <Link href="/account">Contribute an account</Link>.</li>
        <li><b>Documents and photographs</b>: orders, letters, war diaries, maps and personal photographs, scanned or described. <Link href="/archive">Add to the archive</Link>.</li>
        <li><b>Page references</b> from <i>A Talent for War</i> for the few accounts still awaiting a second source.</li>
        <li><b>Memorials and honours</b> missing from the <Link href="/recognition">recognition register</Link>, Goa above all.</li>
      </ul>
      <h2 className="sect">Governing body</h2>
      <p className="prose">{st.governance || "The governing body consists of the founder, a member of Lt Gen Sagat Singh's family, retired senior officers and others."}</p>
      <h2 className="sect">Research and Editorial Council</h2>
      <p className="prose">{st.council || "Retired senior officers, military historians, specialists in the 1961, 1967 and 1971 campaigns, a representative of the Sagat Singh family, an archivist and an academic editor."}</p>
    </>
  );
}
