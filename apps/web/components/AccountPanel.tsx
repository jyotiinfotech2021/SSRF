"use client";
import { useState } from "react";
import Link from "next/link";
import { call } from "@/lib/client";
import { toast } from "./Toast";
import { CATEGORIES, STAGES } from "@/lib/ref";

type Sub = { id: string; kind: string; status: string; createdAt: string; data: Record<string, string>; history: { at: string; status: string; note?: string }[] };
type Props = { who: { id: string | null; email?: string; roles?: string[] }; canContribute: boolean; profile: Record<string, unknown> | null; subs: Sub[]; chapters: string[]; camps: { id: string; name: string }[] };
const KIND: Record<string, string> = { story: "Story", book: "Library item", place: "Recognition entry", event: "Event", archive: "Archive item", correction: "Correction", privacy: "Data request", access: "Access request" };
const OPEN = ["submitted", "screening", "research", "factcheck", "approval", "evidence"];

export default function AccountPanel({ who, canContribute, profile, subs, chapters, camps }: Props) {
  const hasProfile = !!profile?.name;
  const [dataReq, setDataReq] = useState(false);
  return (
    <div>
      <p className="meta">Signed in as {who.email}. <button className="link" onClick={async () => { await call("POST", "/api/auth/logout"); window.location.href = "/"; }}>Sign out</button></p>

      <h3 className="sect">My contributions</h3>
      {subs.length === 0 ? (
        <p className="meta">Nothing yet. Contribute from <Link href="/stories">Stories</Link>, the <Link href="/archive">archive</Link>, the <Link href="/library">library</Link>, <Link href="/recognition">recognition</Link> or <Link href="/events">events</Link>.</p>
      ) : (
        <ul className="plain subs">{subs.map((s) => (
          <li key={s.id}>
            <b>{s.data.title || s.data.name || KIND[s.kind]}</b> <span className="meta">{KIND[s.kind]} · {new Date(s.createdAt).toLocaleDateString("en-IN")}</span> <span className={`tag st-${s.status}`}>{STAGES[s.status] ?? s.status}</span>
            {s.history.filter((h) => h.note).slice(-1).map((h, i) => <div className="snote" key={i}>Editors&apos; note: {h.note}</div>)}
            {OPEN.includes(s.status) && <button className="link quiet" onClick={async () => { if (!confirm("Withdraw this contribution from review?")) return; const r = await call("POST", `/api/submissions/${s.id}/withdraw`); if (r.ok) { toast("Withdrawn"); window.location.reload(); } else toast(r.error); }}>Withdraw</button>}
          </li>))}</ul>)}
      {!canContribute && <p className="notice">Contributing stories, library items and archive items needs an invitation from the editors.</p>}

      <h3 className="sect">My profile</h3>
      <ProfileForm profile={profile} chapters={chapters} camps={camps} />

      <h3 className="sect">My data</h3>
      <table className="plain">
        <thead><tr><th>Action</th><th>What happens</th></tr></thead>
        <tbody>
          <tr><td>Hide my public profile</td><td>Untick &quot;List me&quot; above. Your name leaves the members list at once; your details stay visible only to you and the editors.</td></tr>
          <tr><td>Remove my profile</td><td>Deletes your profile, salutes and event registrations now. Your past contributions and the editorial log remain, under your chosen attribution, until you ask for anonymisation or deletion.</td></tr>
          <tr><td>Anonymise me</td><td>Editors replace your name with &quot;A member&quot; on everything you have published. The material stays in the record.</td></tr>
          <tr><td>Withdraw a contribution</td><td>Editors unpublish the item you choose within 30 days.</td></tr>
          <tr><td>Delete my personal data</td><td>Editors delete your profile and anonymise your contributions. Historical material may be kept without your name under the archival policy.</td></tr>
        </tbody>
      </table>
      <div className="actions">
        <button className="btn ghost small" onClick={() => setDataReq((v) => !v)}>Make a data request</button>
        {hasProfile && <button className="link" onClick={async () => { if (!confirm("Remove your profile now? Your salutes and registrations are deleted too. Your past contributions stay until you ask for anonymisation.")) return; const r = await call("DELETE", "/api/me/profile"); if (r.ok) { toast("Profile removed"); window.location.reload(); } else toast(r.error); }}>Remove my profile now</button>}
      </div>
      {dataReq && <PrivacyForm onDone={() => setDataReq(false)} />}
    </div>
  );
}

function ProfileForm({ profile, chapters, camps, compact }: { profile: Record<string, unknown> | null; chapters: string[]; camps: { id: string; name: string }[]; compact?: boolean }) {
  const p = (profile ?? {}) as Record<string, string | boolean | string[] | undefined>;
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  return (
    <form id="joinForm" className="acct-form" onSubmit={async (e) => {
      e.preventDefault(); if (busy) return; setBusy(true);
      const f = new FormData(e.currentTarget); const g = (k: string) => String(f.get(k) ?? "").trim() || undefined; const b = (k: string) => f.get(k) === "on";
      let photoFileId = photo;
      const file = f.get("photo");
      if (file instanceof File && file.size > 0) {
        if (!b("photoConsent")) { setBusy(false); return toast("Tick the consent box to add a photograph"); }
        if (file.size > 5 * 1024 * 1024) { setBusy(false); return toast("Please use a photograph under 5 MB"); }
        const up = new FormData(); up.append("file", file); toast("Uploading photograph…");
        const u = await call<{ id: string }>("POST", "/api/files", up); if (!u.ok) { setBusy(false); return toast(u.error); }
        photoFileId = u.data.id; setPhoto(photoFileId);
      }
      const r = await call("PUT", "/api/me/profile", { name: g("name"), title: g("title"), affiliation: g("affiliation"), category: g("category"), chapter: g("chapter"), connection: g("connection"), interests: g("interests"), camps: f.getAll("camps"), listed: b("listed"), showChapter: b("showChapter"), showContrib: b("showContrib"), adult: b("adult"), photoFileId, photoConsent: b("photoConsent") });
      setBusy(false);
      if (r.ok) { toast(p.name ? "Profile saved" : "Welcome. You're a member."); window.location.reload(); } else toast(r.error);
    }}>
      <div className="panel">
        <label htmlFor="pf-name">Name to show <small>(your name, or a name you prefer to use here)</small></label>
        <input id="pf-name" name="name" required maxLength={120} defaultValue={p.name as string} autoComplete="name" />
        <div className="grid2">
          <div><label htmlFor="pf-cat">Membership category</label>
            <select id="pf-cat" name="category" defaultValue={(p.category as string) ?? ""}><option value="">Not stated</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label htmlFor="pf-ch">Chapter</label>
            <select id="pf-ch" name="chapter" defaultValue={(p.chapter as string) ?? ""}><option value="">None</option>{chapters.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label htmlFor="pf-title">Rank or title <small>(optional, e.g. Col (Retd), Dr, Prof)</small></label><input id="pf-title" name="title" maxLength={80} defaultValue={p.title as string} /></div>
          <div><label htmlFor="pf-aff">Unit, institution or affiliation <small>(optional)</small></label><input id="pf-aff" name="affiliation" maxLength={160} defaultValue={p.affiliation as string} /></div>
        </div>
        <label htmlFor="pf-con">Your connection to Sagat Singh <small>(did you serve in his army, or have a link to his story)</small></label>
        <textarea id="pf-con" name="connection" maxLength={1000} defaultValue={p.connection as string} />
        <label htmlFor="pf-int">Areas of interest</label>
        <input id="pf-int" name="interests" maxLength={1000} defaultValue={p.interests as string} />
        <fieldset className="camps"><legend>Related campaigns</legend>{camps.map((c) => <label key={c.id} className="check"><input type="checkbox" name="camps" value={c.id} defaultChecked={(p.camps as string[] | undefined)?.includes(c.id)} /> {c.name}</label>)}</fieldset>
        <fieldset className="camps"><legend>Photograph <small>(optional)</small></legend>
          <input id="pf-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Photograph" />
          <label className="check"><input type="checkbox" name="photoConsent" defaultChecked={!!p.photoConsent} /> I consent to this photograph of myself being shown in the public members directory. I can withdraw consent at any time by unticking this box.</label>
        </fieldset>
        <label className="check"><input type="checkbox" name="listed" defaultChecked={!!p.listed} /> List me in the members directory</label>
        <label className="check"><input type="checkbox" name="showChapter" defaultChecked={!!p.showChapter} /> Show my chapter</label>
        <label className="check"><input type="checkbox" name="showContrib" defaultChecked={!!p.showContrib} /> Show how many contributions I have published</label>
        <label className="check"><input type="checkbox" name="adult" required defaultChecked={!!p.adult} /> I am 18 or over</label>
        <p className="meta">See our <Link href="/about#sec-privacy">privacy notice</Link> for how your information is used.</p>
        <div className="actions"><button className="btn" type="submit" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button></div>
      </div>
    </form>
  );
}

function PrivacyForm({ onDone }: { onDone: () => void }) {
  return (
    <form className="panel" onSubmit={async (e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget);
      const r = await call("POST", "/api/submissions", { kind: "privacy", data: { type: String(f.get("type")), item: String(f.get("item")), detail: String(f.get("detail")) } });
      if (r.ok) { toast("Request sent. Editors respond within 30 days."); onDone(); } else toast(r.error);
    }}>
      <label htmlFor="pv-type">What do you need?</label>
      <select id="pv-type" name="type" required><option value="anonymise">Anonymise my contributions</option><option value="deleteData">Delete my profile and personal data</option><option value="withdrawItem">Withdraw one of my published items</option><option value="access">Tell me what you hold about me</option></select>
      <label htmlFor="pv-item">Which item (if any)</label><input id="pv-item" name="item" placeholder="e.g. stories/…" maxLength={200} />
      <label htmlFor="pv-detail">Details</label><textarea id="pv-detail" name="detail" maxLength={2000} />
      <div className="actions"><button className="btn small" type="submit">Send request</button> <button className="link" type="button" onClick={onDone}>Cancel</button></div>
    </form>
  );
}
