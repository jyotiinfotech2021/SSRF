import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { get } from "@/lib/api";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = pageMeta("Governance of the Sagat Singh Research Foundation", "How the Sagat Singh Research Foundation is governed, who is on its council, and how editorial decisions are made and recorded.", "/about/governance");
type Settings = { governance?: string; council?: string; editors?: string; email?: string };

export default async function Governance() {
  const site = await get<Record<string, Settings>>("/api/site");
  const s = site?.settings ?? {};
  return (
    <>
      <PageHead title="Governance" lead="Who is responsible for the record, and how decisions on it are made." />
      <section id="governing-body">
        <h2 className="sect">Governing body</h2>
        <p>{s.governance || "The governing body consists of the founder, a member of Lt Gen Sagat Singh's family, retired senior officers and others."}</p>
      </section>
      <section id="council">
        <h2 className="sect">Research and Editorial Council</h2>
        <p>{s.council || "Retired senior officers, military historians, specialists in the 1961, 1967 and 1971 campaigns, a representative of the Sagat Singh family, an archivist and an academic editor."}</p>
        {s.editors && <p>{s.editors}</p>}
      </section>
      <section id="decisions">
        <h2 className="sect">How editorial decisions are made</h2>
        <ol>
          <li><b>Every contribution is reviewed before it appears.</b> It moves through initial screening, research review, fact-check and editorial approval. An editor may instead ask the contributor for evidence, or decline it with a reason.</li>
          <li><b>Nobody reviews their own work.</b> The system refuses it. Two editors who are both registered as family members of Sagat Singh are also not allowed to review each other&apos;s contributions.</li>
          <li><b>Interests are declared.</b> Before acting on an item, a reviewer confirms they have no family, authorship or financial interest, or declares a conflict and passes the item on.</li>
          <li><b>Every change is on the record.</b> Edits, decisions, corrections and removals are kept in a revision history showing what changed, when, and why.</li>
          <li><b>Verification needs a second person.</b> The editor who catalogued an entry cannot mark it verified.</li>
        </ol>
        <p>See the <Link href="/about/standards">research standards</Link> for how evidence is classified, and <Link href="/about/corrections">corrections</Link> for how to challenge an entry.</p>
      </section>
      <section id="contact">
        <h2 className="sect">Contact</h2>
        {s.email ? <p><a href={`mailto:${s.email}`}>{s.email}</a></p> : <p className="empty">Contact details have not been published yet. Use <Link href="/account">your account</Link> to send a correction or data request.</p>}
      </section>
    </>
  );
}
