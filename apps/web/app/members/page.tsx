import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { get, type Member } from "@/lib/api";
import { PageHead, Unavailable, Empty, fmtDate } from "@/components/ui";
import { CATEGORIES } from "@/lib/ref";

export const metadata: Metadata = pageMeta("Members of the Sagat Singh Research Foundation", "Members of the Sagat Singh Research Foundation who chose to be listed: researchers, veterans, family members, students and supporters.", "/members");
type SP = { searchParams: Promise<{ q?: string; cat?: string }> };

export default async function Members({ searchParams }: SP) {
  const sp = await searchParams;
  const members = await get<Member[]>("/api/members");
  const q = (sp.q ?? "").toLowerCase();
  const rows = (members ?? []).filter((m) => (!sp.cat || m.category === sp.cat) && (!q || `${m.name} ${m.affiliation ?? ""} ${m.interests ?? ""}`.toLowerCase().includes(q)));
  return (
    <>
      <PageHead title="Members" lead="Only members who chose to be listed appear here, and only with the details they chose to show." />
      {!members && <Unavailable />}
      <form method="get" className="inline-form" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Search members" aria-label="Search members" />
        <select name="cat" defaultValue={sp.cat ?? ""} aria-label="Category"><option value="">All categories</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <button className="btn small" type="submit">Search</button>
      </form>
      {rows.length ? <div className="grid2">{rows.map((m) => (
        <article key={m.id} className="mcard">
          {m.photo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={m.photo} alt="" width={64} height={64} style={{ borderRadius: "50%", objectFit: "cover" }} /> : <span className="avatar" aria-hidden="true">{m.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</span>}
          <h3>{m.name}</h3>
          <p className="meta">{[m.title, m.affiliation].filter(Boolean).join(", ")}</p>
          <p className="meta">{m.category}{m.chapter ? ` · ${m.chapter} chapter` : ""} · member since {fmtDate(m.joinedAt)}</p>
          {m.connection && <p>{m.connection}</p>}
        </article>))}</div> : <Empty>No members are listed yet.</Empty>}
      <p className="notice">Want to be listed? <Link href="/account">Join the community</Link>.</p>
    </>
  );
}
