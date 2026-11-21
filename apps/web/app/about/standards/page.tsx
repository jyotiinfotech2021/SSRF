import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { PageHead, AssessTag } from "@/components/ui";
import { ASSESS, ASSESS_HELP, NATURE, NATURE_HELP, STAGES } from "@/lib/ref";

export const metadata: Metadata = pageMeta("Research standards: how evidence is classified", "How the foundation classifies evidence, ranks sources, separates first-hand accounts from documented fact, and protects sensitive information.", "/about/standards");

export default function Standards() {
  return (
    <>
      <PageHead title="Research standards" lead="What a label on this site means, and what has to be true before it is applied." />
      <section id="evidence">
        <h2 className="sect">Evidence classifications</h2>
        <p>Every historical claim carries one of five classifications. A claim is never shown without its sources.</p>
        <dl className="standards">
          {Object.keys(ASSESS).map((k) => (<div key={k}><dt><AssessTag k={k} /></dt><dd>{ASSESS_HELP[k]}.</dd></div>))}
        </dl>
      </section>
      <section id="sources">
        <h2 className="sect">Kinds of source</h2>
        <dl className="standards">{NATURE.map((n) => <div key={n}><dt><b>{n}</b></dt><dd>{NATURE_HELP[n]}.</dd></div>)}</dl>
        <p>Citations are listed with primary sources first. General reference works such as Wikipedia are ranked last and are not relied on alone for a claim. A citation that an editor has marked incorrect is hidden from the public view but stays in the history.</p>
      </section>
      <section id="firsthand">
        <h2 className="sect">First-hand accounts and documented fact</h2>
        <p>Memoirs, anecdotes and family testimony are valuable, and they are kept apart from independently documented facts. A story from a member is labelled as a member contribution with its nature (for example oral history or family testimony) and starts as a single-source or unconfirmed account. It becomes &ldquo;confirmed&rdquo; only when independent sources support it.</p>
        <p>Where credible sources disagree, the entry says so and shows both. A discrepancy found in a source, such as a different birth year, is recorded on that entry and not silently corrected.</p>
      </section>
      <section id="verification">
        <h2 className="sect">Review stages</h2>
        <p>Contributions pass through: {["submitted", "screening", "research", "factcheck", "approval"].map((k) => STAGES[k]).join(", ")}. They may be sent back for evidence, accepted, or not accepted, always with a recorded reason. See <Link href="/about/governance">governance</Link> for the conflict-of-interest rules.</p>
        <p>Library, recognition and archive entries are listed as soon as they are catalogued, with a status of <i>under verification</i>. Only entries a second editor has checked are marked <i>verified</i>.</p>
      </section>
      <section id="privacy">
        <h2 className="sect">Sensitive information</h2>
        <p>Private member details are never shown to other members. Archive items can be marked restricted: the catalogue record stays public, and the file is available to researchers on request. Anyone can ask for their contributions to be anonymised, for their personal data to be deleted, or for a published item to be withdrawn, from <Link href="/account">their account</Link>. Editors respond within 30 days.</p>
      </section>
    </>
  );
}
