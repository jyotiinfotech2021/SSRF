import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { get, me, type Member, type Chapter, type Campaign } from "@/lib/api";
import AutoForm from "@/components/AutoForm";
import { Unavailable } from "@/components/ui";

export const metadata: Metadata = pageMeta("Members of the Sagat Singh Research Foundation", "Members of the Sagat Singh Research Foundation who chose to be listed: researchers, veterans, family members, students and supporters.", "/members");
type SP = { searchParams: Promise<{ grp?: string; chapter?: string }> };

const MGROUPS: [string, string, string, string[]][] = [
  ["founding", "Founding members", "#762633", ["Founding member"]], ["veterans", "Veterans", "#303B30", ["Veteran member"]], ["family", "Family members", "#8C7438", ["Family and legacy member"]],
  ["researchers", "Researchers", "#3d5a80", ["Research member"]], ["academics", "Academics and institutions", "#2f6f6a", ["Academic member", "Institutional member"]],
  ["students", "Students", "#6b3f5e", ["Student member"]], ["supporters", "Supporters and volunteers", "#5a5a50", ["Patron or supporter", "Volunteer member"]],
];
const mgroup = (c?: string) => MGROUPS.find((g) => g[3].includes(c ?? "")) ?? MGROUPS[6];
const VCAMP: Record<string, string> = { goa: "Goa 1961", nathula: "Nathu La 1967", meghna: "1971 war" };
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

function Card({ m, you, camps }: { m: Member; you: boolean; camps: Campaign[] }) {
  const [, , col] = mgroup(m.category), tags = String(m.interests ?? "").split(/[,;]\s*/).map((x) => x.trim()).filter(Boolean);
  return (
    <article className="mcard" style={{ ["--mc" as string]: col }}>
      <div className="mhead">
        {m.photo ? /* eslint-disable-next-line @next/next/no-img-element */ <img className="mphoto" src={m.photo} alt={m.name} loading="lazy" /> : <span className="mseal" aria-hidden="true">{initials(m.name)}</span>}
        <div>
          <p className="mcat">{m.category || "Member"}</p>
          <h3>{m.title && <span className="mtitle">{m.title} </span>}{m.name}{you && <small> (you)</small>}</h3>
          {(m.affiliation || m.chapter) && <p className="maff">{[m.affiliation, m.chapter ? `${m.chapter} chapter` : ""].filter(Boolean).join(" · ")}</p>}
        </div>
      </div>
      {m.connection && <p className="mconn">{m.connection}</p>}
      {(tags.length > 0 || (m.camps ?? []).length > 0) && (
        <dl className="mint">
          {(m.camps ?? []).length > 0 && <><dt>Research focus</dt><dd>{m.camps.map((c) => <span key={c} className="mtag camp">{VCAMP[c] ?? camps.find((x) => x.id === c)?.name ?? c}</span>)}</dd></>}
          {tags.length > 0 && <><dt>Interests</dt><dd>{tags.map((t) => <span key={t} className="mtag">{t}</span>)}</dd></>}
        </dl>)}
    </article>
  );
}

export default async function Members({ searchParams }: SP) {
  const sp = await searchParams;
  const [members, chapters, camps, who] = await Promise.all([get<Member[]>("/api/members"), get<Chapter[]>("/api/chapters"), get<Campaign[]>("/api/campaigns"), me()]);
  const all = members ?? [], cl = camps ?? [];
  const list = all.filter((m) => (!sp.grp || mgroup(m.category)[0] === sp.grp) && (!sp.chapter || m.chapter === sp.chapter)).sort((a, b) => a.name.localeCompare(b.name));
  const gcount = (k: string) => all.filter((m) => mgroup(m.category)[0] === k).length;
  const filtered = !!(sp.grp || sp.chapter);
  const href = (grp?: string) => { const u = new URLSearchParams(); if (grp) u.set("grp", grp); if (sp.chapter) u.set("chapter", sp.chapter); const s = u.toString(); return "/members" + (s ? "?" + s : ""); };
  return (
    <>
      <section className="llanding mlanding"><div className="llanding-inner">
        <p className="eyebrow">SSRF Members</p>
        <h1>The foundation&apos;s members</h1>
        <p>Veterans, families, researchers, academics, students and supporters who work with the foundation and have chosen to be listed. Photographs appear only where a member has consented. Members who keep their profile private are not shown.</p>
        <p className="alanding-stats"><b>{all.length}</b> listed {all.length === 1 ? "member" : "members"} · <b>{chapters?.length ?? 0}</b> chapters</p>
      </div></section>
      {!members && <Unavailable />}
      <div className="mgroups">{MGROUPS.map(([k, l, c]) => <Link key={k} className={`mgrp${sp.grp === k ? " on" : ""}`} style={{ ["--mc" as string]: c }} href={href(sp.grp === k ? undefined : k)}><b>{l}</b><span>{gcount(k)}</span></Link>)}</div>
      <AutoForm className="bar" action="/members">
        {sp.grp && <input type="hidden" name="grp" value={sp.grp} />}
        <select name="chapter" defaultValue={sp.chapter ?? ""} aria-label="Chapter"><option value="">All chapters</option>{chapters?.map((c) => <option key={c.id}>{c.name}</option>)}</select>
        <noscript><button className="btn small ghost" type="submit">Apply</button></noscript>
        {filtered && <Link className="link" href="/members">Show all members</Link>}
        <span className="grow" />
        {who.id ? <Link className="btn small ghost" href="/account">Edit my profile</Link> : <Link className="btn small" href="/register">Become a member</Link>}
      </AutoForm>
      {members && !list.length && <p className="empty">{all.length ? "No listed members match." : "No members have chosen to be listed yet."}</p>}
      {list.length > 0 && (filtered
        ? <div className="mgrid">{list.map((m) => <Card key={m.id} m={m} you={m.id === who.id} camps={cl} />)}</div>
        : MGROUPS.map(([k, l, c]) => { const g = list.filter((m) => mgroup(m.category)[0] === k);
          return g.length ? <section key={k}><h2 className="sect msect" style={{ ["--mc" as string]: c }}>{l}</h2><div className="mgrid">{g.map((m) => <Card key={m.id} m={m} you={m.id === who.id} camps={cl} />)}</div></section> : null; }))}
    </>
  );
}
