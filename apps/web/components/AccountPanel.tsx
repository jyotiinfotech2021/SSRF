"use client";
import { useState } from "react";
import { call } from "@/lib/client";
import { toast } from "./Toast";
import { CATEGORIES, STAGES } from "@/lib/ref";

type Sub = { id: string; kind: string; status: string; createdAt: string; data: Record<string, string>; history: { at: string; status: string; note?: string }[] };
type Props = { who: { id: string | null; email?: string; roles?: string[] }; canContribute: boolean; profile: Record<string, unknown> | null; subs: Sub[]; chapters: string[]; camps: { id: string; name: string }[] };
const KIND: Record<string, string> = { story: "Story", book: "Library item", place: "Recognition entry", event: "Event", archive: "Archive item", correction: "Correction", privacy: "Data request", access: "Access request" };
const OPEN = ["submitted", "screening", "research", "factcheck", "approval", "evidence"];

export default function AccountPanel({ who, canContribute, profile, subs, chapters, camps }: Props) {
  const hasProfile = !!profile?.name;
  return (
    <div className="acct">
      <p className="acct-who">
        <span>{who.email}</span>
        <button className="link" onClick={async () => { await call("POST", "/api/auth/logout"); window.location.href = "/"; }}>Sign out</button>
      </p>

      {!hasProfile ? (
        <section className="acct-card">
          <h2>You&apos;re in.</h2>
          <p className="acct-lead">You can already read everything, suggest corrections and register for events. Add your name if you&apos;d like to be a named member. It takes five seconds.</p>
          <ProfileForm profile={profile} chapters={chapters} camps={camps} compact />
        </section>
      ) : (
        <section className="acct-card">
          <h2>Hello, {String(profile!.name)}</h2>
          <p className="acct-lead">{profile!.category ? String(profile!.category) : "Member"}{profile!.listed ? " · listed in the members directory" : ""}</p>
          <details className="acct-more"><summary>Edit my profile</summary><ProfileForm profile={profile} chapters={chapters} camps={camps} /></details>
        </section>
      )}

      {!canContribute && <p className="acct-note">Contributing stories, library items and archive items needs an invitation from the editors.</p>}

      {subs.length > 0 && (
        <section>
          <h2 className="acct-h">My contributions</h2>
          <ul className="plain subs">{subs.map((s) => (
            <li key={s.id}>
              <b>{s.data.title || s.data.name || KIND[s.kind]}</b> <span className="meta">{KIND[s.kind]} · {new Date(s.createdAt).toLocaleDateString("en-IN")}</span> <span className={`tag st-${s.status}`}>{STAGES[s.status] ?? s.status}</span>
              {s.history.filter((h) => h.note).slice(-1).map((h, i) => <div className="snote" key={i}>Editors&apos; note: {h.note}</div>)}
              {OPEN.includes(s.status) && <button className="link quiet" onClick={async () => { if (!confirm("Withdraw this contribution from review?")) return; const r = await call("POST", `/api/submissions/${s.id}/withdraw`); if (r.ok) { toast("Withdrawn"); window.location.reload(); } else toast(r.error); }}>Withdraw</button>}
            </li>))}</ul>
        </section>
      )}

      <details className="acct-more acct-privacy">
        <summary>Privacy and my data</summary>
        <PrivacyForm />
        {hasProfile && <DangerZone />}
      </details>
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
      <label htmlFor="pf-name">Your name</label>
      <input id="pf-name" name="name" required maxLength={120} defaultValue={p.name as string} autoComplete="name" />
      <label className="check"><input type="checkbox" name="adult" required defaultChecked={!!p.adult} /> I am 18 or over</label>

      <details className="acct-extra" open={!compact}>
        <summary>{compact ? "Add more details (optional)" : "More details"}</summary>
        <label htmlFor="pf-title">Title</label><input id="pf-title" name="title" maxLength={80} defaultValue={p.title as string} />
        <label htmlFor="pf-aff">Affiliation</label><input id="pf-aff" name="affiliation" maxLength={160} defaultValue={p.affiliation as string} />
        <label htmlFor="pf-cat">Membership category</label>
        <select id="pf-cat" name="category" defaultValue={(p.category as string) ?? ""}><option value="">Not stated</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        <label htmlFor="pf-ch">Chapter</label>
        <select id="pf-ch" name="chapter" defaultValue={(p.chapter as string) ?? ""}><option value="">None</option>{chapters.map((c) => <option key={c}>{c}</option>)}</select>
        <label htmlFor="pf-con">Your connection to Sagat Singh or his story</label><textarea id="pf-con" name="connection" maxLength={1000} defaultValue={p.connection as string} />
        <label htmlFor="pf-int">Research interests</label><textarea id="pf-int" name="interests" maxLength={1000} defaultValue={p.interests as string} />
        <fieldset className="camps"><legend>Campaigns you care about</legend>{camps.map((c) => <label key={c.id} className="check"><input type="checkbox" name="camps" value={c.id} defaultChecked={(p.camps as string[] | undefined)?.includes(c.id)} /> {c.name}</label>)}</fieldset>
        <label className="check"><input type="checkbox" name="listed" defaultChecked={!!p.listed} /> List me in the public members directory</label>
        <label className="check"><input type="checkbox" name="showChapter" defaultChecked={!!p.showChapter} /> Show my chapter there</label>
        <label className="check"><input type="checkbox" name="showContrib" defaultChecked={!!p.showContrib} /> Show my contributions there</label>
        <label htmlFor="pf-photo">Photograph (under 5 MB)</label><input id="pf-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
        <label className="check"><input type="checkbox" name="photoConsent" defaultChecked={!!p.photoConsent} /> I consent to this photograph being shown publicly in the directory</label>
      </details>

      <button className="auth-submit acct-save" type="submit" disabled={busy}>{busy ? "Saving…" : p.name ? "Save profile" : "Save my name"}</button>
    </form>
  );
}

function PrivacyForm() {
  const [open, setOpen] = useState(false);
  return (
    <section>
      <h3>Data and privacy requests</h3>
      {!open ? <button className="btn ghost small" onClick={() => setOpen(true)}>Make a request</button> : (
        <form className="acct-form" onSubmit={async (e) => {
          e.preventDefault(); const f = new FormData(e.currentTarget);
          const r = await call("POST", "/api/submissions", { kind: "privacy", data: { type: String(f.get("type")), item: String(f.get("item")), detail: String(f.get("detail")) } });
          if (r.ok) { toast("Request sent. Editors respond within 30 days."); setOpen(false); } else toast(r.error);
        }}>
          <label htmlFor="pv-type">What do you need?</label>
          <select id="pv-type" name="type" required><option value="anonymise">Anonymise my contributions</option><option value="deleteData">Delete my profile and personal data</option><option value="withdrawItem">Withdraw one of my published items</option><option value="access">Tell me what you hold about me</option></select>
          <label htmlFor="pv-item">Which item (if any)</label><input id="pv-item" name="item" placeholder="e.g. stories/…" maxLength={200} />
          <label htmlFor="pv-detail">Details</label><textarea id="pv-detail" name="detail" maxLength={2000} />
          <div className="actions"><button className="btn small" type="submit">Send request</button> <button className="link" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
        </form>)}
    </section>
  );
}

function DangerZone() {
  return (
    <section><h3>Leave the foundation</h3>
      <p className="meta">Removes your profile, salutes and event registrations. Your past contributions stay until you ask for anonymisation above.</p>
      <button className="btn ghost small" onClick={async () => { if (!confirm("Remove your profile now? Your salutes and registrations are deleted too. Your past contributions stay until you ask for anonymisation.")) return; const r = await call("DELETE", "/api/me/profile"); if (r.ok) { toast("Profile removed"); window.location.reload(); } else toast(r.error); }}>Remove my profile</button>
    </section>
  );
}
