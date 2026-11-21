import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { get, me, isEditor } from "@/lib/api";
import { AssessTag, NatureTag } from "@/components/ui";
import SettingsForm from "@/components/SettingsForm";
import { ASSESS, ASSESS_HELP, NATURE, NATURE_HELP, VSTAT } from "@/lib/ref";

export const metadata: Metadata = pageMeta("About the Sagat Singh Research Foundation", "What the Sagat Singh Research Foundation does, how evidence is judged, how contributions are reviewed, and how personal data is handled.", "/about");
type Settings = { governance?: string; council?: string; email?: string; address?: string; registration?: string; dataOfficer?: string; social?: string };

export default async function About() {
  const [site, who] = await Promise.all([get<Record<string, Settings>>("/api/site"), me()]);
  const st = site?.settings ?? {};
  const social = (st.social ?? "").split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((x) => x[0] && /^https?:\/\//.test(x[1] ?? ""));
  return (
    <>
      <h1 className="bio-title">About SSRF</h1>
      <p className="sub">The Sagat Singh Research Foundation preserves the evidence of Lt Gen Sagat Singh&apos;s career, researches his campaigns and the people who fought them, and makes that history usable by schools, researchers and the public.</p>

      <h3 className="sect" id="sec-governance">Governance and contact</h3>
      <table className="plain meta-table"><tbody>
        {st.registration && <tr><th>Registered as</th><td>{st.registration}</td></tr>}
        <tr><th>Governing body</th><td>{st.governance || "The governing body consists of the founder, a member of Lt Gen Sagat Singh's family, retired senior officers and others."}</td></tr>
        <tr><th>Research and Editorial Council</th><td>{st.council || "Retired senior officers, military historians, specialists in the 1961, 1967 and 1971 campaigns, a representative of the Sagat Singh family, an archivist and an academic editor."}</td></tr>
        {st.email && <tr><th>Contact</th><td><a href={`mailto:${st.email}`}>{st.email}</a></td></tr>}
        {st.address && <tr><th>Address</th><td>{st.address}</td></tr>}
        {st.dataOfficer && <tr><th>Personal data requests</th><td>{st.dataOfficer}</td></tr>}
        {social.length > 0 && <tr><th>Follow</th><td>{social.map(([n, u], i) => <span key={u}>{i > 0 && " · "}<a href={u} target="_blank" rel="noopener noreferrer">{n}</a></span>)}</td></tr>}
      </tbody></table>
      {!st.email && <p className="meta">Contact details have not been published yet. To reach the editors now, use <Link href="/about/corrections">Suggest a correction</Link> on any entry, or make a request from <Link href="/account">your account</Link>.</p>}
      {isEditor(who) && <SettingsForm initial={st} />}
      <p className="meta">More detail: <Link href="/about/governance">governance and how decisions are made</Link>.</p>

      <h3 className="sect" id="sec-standards">How we judge evidence</h3>
      <p className="prose">Two separate questions are asked of everything on this site: what kind of material is it, and how well is the claim supported? A recorded memory can be genuine and still uncorroborated; an official record can be authentic and still incomplete.</p>
      <table className="plain"><thead><tr><th>Nature of the material</th><th>Means</th></tr></thead>
        <tbody>{NATURE.map((n) => <tr key={n}><td><NatureTag n={n} /></td><td>{NATURE_HELP[n]}</td></tr>)}</tbody></table>
      <table className="plain" style={{ marginTop: "1rem" }}><thead><tr><th>Assessment of the claim</th><th>Means</th></tr></thead>
        <tbody>{Object.keys(ASSESS).map((k) => <tr key={k}><td><AssessTag k={k} /></td><td>{ASSESS_HELP[k]}</td></tr>)}</tbody></table>
      <p className="prose">A family memory or a popular anecdote never becomes a documented fact by being repeated. Where sources disagree, both are shown. Places, library items and archive items carry a single verification status: {Object.values(VSTAT).filter((v) => v !== "Published").join(", ")}. <Link href="/about/standards">Read the research standards in full</Link>.</p>

      <h3 className="sect">How contributions are reviewed</h3>
      <ol className="prose">
        <li>You send a story, an archive item, a library item, a place or an event. It is visible only to you and the editors.</li>
        <li>It is assigned to an editor with a due date and moves through screening, research review, fact-check and editorial approval. Simple items such as event listings may skip stages.</li>
        <li>An editor may ask you for more evidence. You then edit and resubmit, and the original, the comments and each revision are kept.</li>
        <li>No one publishes, labels or verifies their own contribution, and reviewers declare any family, authorship or financial interest and pass the item on.</li>
        <li>Anyone can suggest a correction on any entry. A correction is complete only when the public text has been changed, or the reason for not changing it is recorded. Every change is kept in the entry&apos;s public history.</li>
      </ol>

      <h3 className="sect" id="sec-privacy">Privacy notice</h3>
      <ul className="prose">
        <li><b>Who holds your data.</b> The Sagat Singh Research Foundation{st.email ? <>, contactable at {st.email}</> : null}.</li>
        <li><b>What we hold.</b> The name you choose to show, your membership category, chapter, interests and what you contribute. We never ask for phone numbers, service numbers or identity documents.</li>
        <li><b>Who sees it.</b> Listed profiles are public. If you hide your profile, your details are stored separately and are visible only to you and the foundation&apos;s editors.</li>
        <li><b>How long.</b> Your profile is kept while you are a member. Published contributions are kept as part of the historical record under the archival policy below.</li>
        <li><b>Your choices</b>, from <Link href="/account">My account</Link>: hide your public profile; remove your profile; ask for your name to be removed from published contributions (anonymisation); withdraw a published contribution; or ask for your personal data to be deleted. These are different actions, and each is explained there.</li>
        <li><b>Oral histories and family documents.</b> Consent to public attribution and consent to storage are recorded separately. You can withdraw a recording or document; it is unpublished within 30 days, and kept in restricted storage only if you agree.</li>
        <li><b>Archival policy.</b> Historical material of lasting value may be kept after a contributor leaves, without their name, so the record stays complete. The decision log keeps who made each editorial decision.</li>
        <li>Anyone under 18 should take part through a teacher or parent, not their own account.</li>
      </ul>

      <h3 className="sect" id="sec-corrections">Corrections and copyright</h3>
      <p className="prose">Editors respond to corrections within 14 days. Videos and articles by others are linked, never re-hosted, so credit stays with their makers. Archive items carry their rights status; an item whose rights are unknown is not offered for download. To ask for something to be removed, use &quot;Suggest a correction&quot; on it. <Link href="/about/corrections">How corrections work</Link>.</p>

      <h3 className="sect">Map credits</h3>
      <p className="prose">India boundary: DataMeet (CC BY 4.0). Country outlines and rivers: Natural Earth (public domain). Campaign maps are explanatory sketches by the foundation, not historical maps.</p>

      <h3 className="sect" id="sec-disclaimer">Disclaimer</h3>
      <div className="prose">
        <p>This website is run by the Sagat Singh Research Foundation as a historical research and preservation initiative. It is not an official website of the Indian Army, the Ministry of Defence or the Government of India, and nothing on it speaks for them.</p>
        <p>The foundation takes care to cite its sources and to label every entry by the nature of its evidence and its verification status. History is still being researched. Entries marked unverified, attributed, disputed or under verification are not settled fact, and the foundation does not guarantee that any entry is complete or free of error. If you find a mistake, please use &ldquo;Suggest a correction&rdquo; on the entry or write to the foundation; corrections are logged in the open.</p>
        <p>Accounts, stories and other material contributed by members are the views and recollections of their authors and are not endorsed by the foundation until an editor marks them verified. Photographs and drawings marked &ldquo;artist&apos;s impression&rdquo; or &ldquo;rendering&rdquo; are illustrations, not historical photographs. Maps are explanatory sketches, not survey or operational maps.</p>
        <p>Books, articles, videos and other works by third parties are linked, not reproduced, and remain the property of their creators. The foundation is not responsible for the content of external websites. Names, ranks and honours are given as recorded in the cited sources.</p>
        <p>Nothing on this site is professional, legal or financial advice. Use of the site is at your own risk, and the foundation accepts no liability for loss arising from reliance on its content.</p>
      </div>
    </>
  );
}
