import type { Metadata } from "next";
import { get, me, isEditor } from "@/lib/api";
import { PageHead } from "@/components/ui";
import SettingsForm from "@/components/SettingsForm";

export const metadata: Metadata = { title: "About SSRF", description: "Who runs the Sagat Singh Research Foundation, how content is verified, and how to contact the editors." };
type Settings = { mission?: string; governance?: string; editors?: string; email?: string; address?: string; policy?: string };

export default async function About() {
  const [site, who] = await Promise.all([get<Record<string, Settings>>("/api/site"), me()]);
  const s = site?.settings ?? {};
  const para = (t?: string) => (t ?? "").split(/\n+/).filter(Boolean).map((x, i) => <p key={i}>{x}</p>);
  return (
    <>
      <PageHead title="About the foundation" />
      <section id="standards"><h2 className="sect">Our approach to history</h2>
        <p>Every historical statement on this site is a separate claim with its own sources. Each claim has an evidence classification: documented, confirmed by several sources, single source, unconfirmed account, or sources differ. First-hand recollections are labelled apart from independently documented fact. Anyone signed in can suggest a correction; editors review it, and every change is kept in a public revision history.</p>
        <p>Contributions never appear until an editor other than the contributor has reviewed them. Reviewers declare any family, authorship or financial interest, and an item is passed to someone else if there is one.</p>
      </section>
      {s.mission && <section><h2 className="sect">Mission</h2>{para(s.mission)}</section>}
      {s.governance && <section id="governance"><h2 className="sect">Governance</h2>{para(s.governance)}</section>}
      {s.editors && <section><h2 className="sect">Editors</h2>{para(s.editors)}</section>}
      {s.policy && <section><h2 className="sect">Privacy and data</h2>{para(s.policy)}</section>}
      <section><h2 className="sect">Contact</h2>{s.email || s.address ? <p>{s.email && <a href={`mailto:${s.email}`}>{s.email}</a>}{s.address ? <><br />{s.address}</> : null}</p> : <p className="empty">Contact details have not been published yet.</p>}</section>
      {isEditor(who) && <SettingsForm initial={s} />}
    </>
  );
}
