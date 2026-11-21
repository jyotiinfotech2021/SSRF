import type { Metadata } from "next";
import Link from "next/link";
import { me } from "@/lib/api";
import { PageHead } from "@/components/ui";

export const metadata: Metadata = { title: "Corrections", description: "How to tell the foundation something on this site is wrong, and what happens next." };

export default async function Corrections() {
  const who = await me();
  return (
    <>
      <PageHead title="Corrections" lead="If something here is wrong, or unsupported, tell the editors. Corrections are welcome and are recorded in public." />
      <section id="how">
        <h2 className="sect">How to send one</h2>
        <ol>
          <li>Open the claim, story, library item or archive record you think is wrong.</li>
          <li>Choose <b>Suggest a correction</b>. Say what is wrong and what it should say.</li>
          <li>Give your source: a book and page, a document, or a link. A correction without a source can be considered but is much harder to act on.</li>
        </ol>
        <p>{who.id ? <>You are signed in, so you can do this now.</> : <>You need an account to send a correction. <Link href="/register">Create one</Link> with just an email and password, or <Link href="/login">sign in</Link>.</>}</p>
      </section>
      <section id="next">
        <h2 className="sect">What happens next</h2>
        <ul>
          <li>An editor other than you reviews it against the source. Editors cannot review their own contributions.</li>
          <li>The editor either <b>applies</b> the correction, <b>resolves it without change</b> (with the reason recorded), or <b>declines</b> it with a reason.</li>
          <li>If applied, the old and new text are both kept in the item&apos;s revision history, with the reason. Nothing is silently overwritten.</li>
          <li>You can follow the outcome under <Link href="/account">My account</Link>.</li>
        </ul>
      </section>
      <section id="other">
        <h2 className="sect">Other requests</h2>
        <p>To have your own contributions anonymised, your personal data deleted, or a published item of yours withdrawn, make a data request from <Link href="/account">your account</Link>. See the <Link href="/about/standards">research standards</Link> for how evidence is weighed.</p>
      </section>
    </>
  );
}
