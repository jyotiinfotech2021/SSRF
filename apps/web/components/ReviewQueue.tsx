"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { call } from "@/lib/client";
import { toast } from "./Toast";
import { ASSESS, NATURE, STAGES } from "@/lib/ref";

type Sub = { id: string; ownerId: string; kind: string; status: string; priority: string; assignee?: string; due?: string; createdAt: string; data: Record<string, unknown>; history: { at: string; by: string; status: string; note?: string }[]; coi: string[] };
type Row = { submission: Sub; ownerName?: string; ownerCategory?: string; blocked?: string };
type Editor = { id: string; name: string };
const KIND: Record<string, string> = { story: "Story", book: "Library item", place: "Recognition entry", event: "Event", archive: "Archive item", correction: "Correction", privacy: "Data request", access: "Access request" };
const PUBLISHABLE = ["story", "book", "place", "event", "archive"];

/** Ready-made notes an approver can drop into the note box with one click, then edit. */
const NOTES: Record<string, string[]> = {
  publish: ["Approved. Thank you, this is now published.", "Approved with the evidence level set above."],
  evidence: ["Please add a second independent source for the main claim.", "Please add the page number, date or link for each claim.", "Please add who took the photograph, when, and the rights holder."],
  reject: ["Not accepted: we cannot verify this from a source we can cite.", "Not accepted: this duplicates an entry already on the site."],
  correction: ["Applied. Thank you for the correction.", "Resolved without change: the current text matches the cited source."],
};
const noteChips = (kind: string) => PUBLISHABLE.includes(kind) ? [...NOTES.publish, ...NOTES.evidence, ...NOTES.reject] : kind === "correction" ? NOTES.correction : ["Done. Thank you.", "Declined: we need more detail to act on this."];

const DAY = 86400000, now = () => Date.now();
const iso = (d: number) => new Date(now() - d * DAY).toISOString();
const SAMPLES: Row[] = [
  { submission: { id: "sample-1", ownerId: "sample-owner", kind: "story", status: "approval", priority: "Normal", createdAt: iso(3), coi: [], history: [{ at: iso(3), by: "sample", status: "submitted" }, { at: iso(2), by: "sample", status: "screening", note: "Looks complete." }, { at: iso(1), by: "sample", status: "factcheck", note: "Both dates match the cited book." }], data: { title: "Grandfather and the Nathu La winter", kind: "Memoir", era: "Nathu La 1967", text: "My grandfather served in the division in 1967. He often described the cold at the pass and the long nights on the ridge…", source: "Family recollection; matches A Talent for War (2013), p. 212" } }, ownerName: "Asha Verma (sample)", ownerCategory: "Family and legacy member" },
  { submission: { id: "sample-2", ownerId: "sample-owner", kind: "correction", status: "submitted", priority: "High", createdAt: iso(1), coi: [], history: [{ at: iso(1), by: "sample", status: "submitted" }], data: { target: "campaigns/goa: Panjim, 19 December 1961", text: "The Portuguese surrender in Goa was signed on 19 December 1961, not 18 December.", source: "Operation Vijay (1974), pp. 82–83" } }, ownerName: "R. Singh (sample)", ownerCategory: "Research member" },
  { submission: { id: "sample-3", ownerId: "sample-owner", kind: "access", status: "submitted", priority: "Normal", createdAt: iso(2), coi: [], history: [{ at: iso(2), by: "sample", status: "submitted" }], data: { title: "Oral history interview, tape 2 (restricted)", item: "SSRF-OH-00002", purpose: "Thesis research on the 1971 Meghna crossing, supervised at a university history department." } }, ownerName: "Dr N. Rao (sample)", ownerCategory: "Academic member" },
  { submission: { id: "sample-4", ownerId: "sample-owner", kind: "privacy", status: "submitted", priority: "Normal", createdAt: iso(5), coi: [], history: [{ at: iso(5), by: "sample", status: "submitted" }], data: { type: "anonymise", item: "stories/sample", detail: "Please show my contributions as 'A member' instead of my name." } }, ownerName: "A member (sample)", ownerCategory: "Student member" },
];
const DEMO_RESULT: Record<string, string> = {
  advance: "would move to the next review stage", publish: "would be published on the public site and the contributor notified", evidence: "would be sent back to the contributor asking for evidence", reject: "would be closed as not accepted, with your note sent to the contributor",
  apply: "would be applied to the page and the history updated", resolve: "would be closed with no change to the page", decline: "would be declined with your note", anonymise: "would anonymise the person's contributions", deleteData: "would delete the profile and anonymise contributions",
  withdrawItem: "would unpublish the item", complete: "would be marked completed", coi: "would be passed to another editor",
};

export default function ReviewQueue({ uid }: { uid: string }) {
  const [scope, setScope] = useState("open"); const [kind, setKind] = useState(""); const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null); const [editors, setEditors] = useState<Editor[]>([]);
  const [demo, setDemo] = useState(false);
  const [tick, setTick] = useState(0);
  const load = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    let live = true;
    (async () => {
      const r = await call<{ items: Row[]; editors: Editor[] }>("GET", `/api/editorial/queue?scope=${scope}`);
      if (!live) return;
      if (r.ok) { setRows(r.data.items); setEditors(r.data.editors); } else toast(r.error);
    })();
    return () => { live = false; };
  }, [scope, tick]);

  const source = demo ? SAMPLES : rows;
  const counts = useMemo(() => { const c: Record<string, number> = {}; (source ?? []).forEach((r) => { c[r.submission.kind] = (c[r.submission.kind] ?? 0) + 1; }); return c; }, [source]);
  const shown = useMemo(() => (source ?? []).filter((r) => {
    if (kind && r.submission.kind !== kind) return false;
    const t = q.trim().toLowerCase(); if (!t) return true;
    return (JSON.stringify(r.submission.data) + " " + (r.ownerName ?? "")).toLowerCase().includes(t);
  }), [source, kind, q]);

  return (
    <div className="queue">
      <details className="qhelp">
        <summary>How review works</summary>
        <ol>
          <li><b>Submitted</b>: a member sends a story, library item, correction or request.</li>
          <li><b>Initial screening → Research review → Fact-check → Editorial approval</b>: an editor moves it along with <i>Advance stage</i>, adding a note at each step.</li>
          <li><b>Approve and publish</b> puts it on the public site with the evidence level you choose. <b>Ask for evidence</b> sends it back; <b>Do not accept</b> closes it. Both need a note, which the contributor sees.</li>
          <li>Nobody can review their own contribution, and you confirm you have no conflict of interest before deciding. Every decision is kept in the item&apos;s history.</li>
        </ol>
      </details>

      <div className="qbar">
        <div className="seg-tabs" role="tablist">
          {[["open", "Open"], ["mine", "Assigned to me"], ["closed", "Closed"], ["all", "Everything"]].map(([k, v]) => <button key={k} role="tab" aria-selected={!demo && scope === k} onClick={() => { setDemo(false); setScope(k); }}>{v}</button>)}
          <button role="tab" aria-selected={demo} onClick={() => setDemo((d) => !d)}>{demo ? "Back to the real queue" : "Try sample approvals"}</button>
        </div>
        <input className="qsearch" type="search" placeholder="Search title, text or contributor" aria-label="Search the queue" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {demo && <p className="notice qdemo"><b>Practice mode.</b> These four items are examples. Nothing you click here is saved, published or sent to anyone. Open one, pick a note, and press a button to see what would happen.</p>}

      <div className="qtiles" role="group" aria-label="Filter by type">
        <button className={`qtile${!kind ? " on" : ""}`} aria-pressed={!kind} onClick={() => setKind("")}><b>{(source ?? []).length}</b><span>All</span></button>
        {Object.entries(KIND).map(([k, v]) => <button key={k} className={`qtile${kind === k ? " on" : ""}${counts[k] ? "" : " zero"}`} aria-pressed={kind === k} onClick={() => setKind(kind === k ? "" : k)}><b>{counts[k] ?? 0}</b><span>{v}</span></button>)}
      </div>

      {source === null ? <p className="meta">Loading…</p> : shown.length ? shown.map((r) => <Card key={r.submission.id} r={r} editors={editors} uid={uid} reload={load} demo={demo} />) : <p className="empty">{q || kind ? "Nothing matches. Clear the search or the type filter." : "Nothing here. Try “Everything”, or “Try sample approvals” to practise."}</p>}
    </div>
  );
}

function Card({ r, editors, uid, reload, demo }: { r: Row; editors: Editor[]; uid: string; reload: () => void; demo: boolean }) {
  const s = r.submission; const d = s.data; const open = ["submitted", "screening", "research", "factcheck", "approval", "evidence"].includes(s.status);
  const [busy, setBusy] = useState(false); const [outcome, setOutcome] = useState("");
  const str = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  const decide = async (e: React.FormEvent<HTMLFormElement>, action: string) => {
    e.preventDefault(); setBusy(true);
    const f = new FormData(e.currentTarget.form ?? e.currentTarget);
    const note = String(f.get("note") ?? "");
    if (demo) {
      setBusy(false);
      const needNote = ["evidence", "reject", "decline", "resolve"].includes(action) && !note.trim();
      if (needNote) return toast("A note is required here. Pick one of the suggested notes below the box.");
      if (f.get("coi") !== "none" && action !== "coi") return toast("Tick the box to confirm you have no conflict of interest.");
      setOutcome(`Sample only: this ${KIND[s.kind].toLowerCase()} ${DEMO_RESULT[action] ?? "would be updated"}.`);
      return;
    }
    const body = { action, note, noConflict: f.get("coi") === "none", newText: String(f.get("newText") ?? "") || undefined, assessment: String(f.get("assessment") ?? "") || undefined, nature: String(f.get("nature") ?? "") || undefined, camps: f.getAll("camps").map(String) };
    const res = await call<{ message: string }>("POST", `/api/editorial/submissions/${s.id}/decide`, body);
    setBusy(false);
    if (res.ok) { toast(res.data.message); reload(); } else toast(res.error);
  };
  return (
    <article className={`rcard panel${demo ? " rsample" : ""}`} id={s.id}>
      <h3>{str("title") || str("name") || KIND[s.kind]} <span className="tag">{KIND[s.kind]}</span> <span className={`tag st-${s.status}`}>{STAGES[s.status] ?? s.status}</span> {s.priority !== "Normal" && <span className="tag">{s.priority}</span>}{demo && <span className="tag">Sample</span>}</h3>
      <p className="meta">From {r.ownerName ?? "a contributor"}{r.ownerCategory ? ` (${r.ownerCategory})` : ""} · {new Date(s.createdAt).toLocaleDateString("en-IN")}{s.due ? ` · due ${s.due}` : ""}</p>
      {s.kind === "correction" && <><p><b>Target:</b> {str("target")}</p><p><b>Proposed:</b> {str("text")}</p><p><b>Their source:</b> {str("source")}</p></>}
      {s.kind === "privacy" && <><p><b>Request:</b> {str("type")} {str("item")}</p><p>{str("detail")}</p></>}
      {s.kind === "access" && <><p><b>Item:</b> {str("title")} ({str("item")})</p><p><b>Purpose:</b> {str("purpose")}</p></>}
      {PUBLISHABLE.includes(s.kind) && <details open={demo}><summary>Contribution text and fields</summary><dl>{Object.entries(d).filter(([k]) => !k.startsWith("_") && typeof d[k] !== "object").map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>)}</dl></details>}
      <details><summary>History ({s.history.length})</summary><ol>{s.history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleDateString("en-IN")}: {STAGES[h.status] ?? h.status}{h.note ? `. ${h.note}` : ""}</li>)}</ol></details>
      {r.blocked && open && <p className="notice">{r.blocked}</p>}
      {outcome && <p className="notice qoutcome" role="status">{outcome}</p>}
      {open && !outcome && (
        <>
          {!demo && <form className="inline-form assign" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const res = await call("POST", `/api/editorial/submissions/${s.id}/assign`, { assignee: String(f.get("assignee")) || null, due: String(f.get("due")) || null, priority: String(f.get("priority")), stage: String(f.get("stage")) }); if (res.ok) { toast("Assignment saved"); reload(); } else toast(res.error); }}>
            <select name="assignee" aria-label="Assigned to" defaultValue={s.assignee ?? ""}><option value="">Unassigned</option>{editors.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
            <input name="due" type="date" aria-label="Due" defaultValue={s.due ?? ""} />
            <select name="priority" aria-label="Priority" defaultValue={s.priority}>{["Low", "Normal", "High", "Urgent"].map((p) => <option key={p}>{p}</option>)}</select>
            <select name="stage" aria-label="Stage" defaultValue={s.status}>{["submitted", "screening", "research", "factcheck", "approval", ...(s.status === "evidence" ? ["evidence"] : [])].map((p) => <option key={p} value={p}>{STAGES[p]}</option>)}</select>
            <button className="btn small ghost" type="submit">Save</button>
          </form>}
          {s.ownerId === uid ? null : (
            <form className="decide" onSubmit={(e) => e.preventDefault()}>
              {s.kind === "correction" && <label>Corrected text (to apply)<textarea name="newText" defaultValue={str("text")} /></label>}
              {PUBLISHABLE.includes(s.kind) && s.kind !== "event" && (<>
                <label>Evidence classification<select name="assessment" defaultValue="unverified">{Object.entries(ASSESS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                <label>Nature of source<select name="nature" defaultValue="">{["", ...NATURE].map((n) => <option key={n} value={n}>{n || "From the contribution"}</option>)}</select></label>
              </>)}
              <label>Note (required to send back, decline or resolve)<textarea name="note" maxLength={2000} /></label>
              <div className="qchips" aria-label="Suggested notes">
                <span className="meta">Suggested notes:</span>
                {noteChips(s.kind).map((t) => <button key={t} type="button" className="qchip" onClick={(e) => { const ta = e.currentTarget.closest("form")?.elements.namedItem("note") as HTMLTextAreaElement | null; if (ta) { ta.value = ta.value ? ta.value + " " + t : t; ta.focus(); } }}>{t}</button>)}
              </div>
              <label className="check"><input type="checkbox" name="coi" value="none" /> I have no family, authorship or financial interest in this item.</label>
              <div className="actions">
                {PUBLISHABLE.includes(s.kind) && <>
                  {s.status !== "approval" && s.status !== "evidence" && <button className="btn small" disabled={busy} onClick={(e) => decide(e as never, "advance")}>Advance stage</button>}
                  <button className="btn small" disabled={busy} onClick={(e) => decide(e as never, "publish")}>Approve and publish</button>
                  <button className="btn small ghost" disabled={busy} onClick={(e) => decide(e as never, "evidence")}>Ask for evidence</button>
                  <button className="btn small ghost" disabled={busy} onClick={(e) => decide(e as never, "reject")}>Do not accept</button></>}
                {s.kind === "correction" && <>
                  <button className="btn small" disabled={busy} onClick={(e) => decide(e as never, "apply")}>Apply correction</button>
                  <button className="btn small ghost" disabled={busy} onClick={(e) => decide(e as never, "resolve")}>Resolve without change</button>
                  <button className="btn small ghost" disabled={busy} onClick={(e) => decide(e as never, "decline")}>Decline</button></>}
                {s.kind === "privacy" && <>
                  <button className="btn small" disabled={busy} onClick={(e) => decide(e as never, "anonymise")}>Anonymise contributions</button>
                  <button className="btn small ghost" disabled={busy} onClick={(e) => decide(e as never, "deleteData")}>Delete profile and anonymise</button>
                  <button className="btn small ghost" disabled={busy} onClick={(e) => decide(e as never, "withdrawItem")}>Unpublish the item</button>
                  <button className="btn small ghost" disabled={busy} onClick={(e) => decide(e as never, "complete")}>Mark completed</button></>}
                {s.kind === "access" && <>
                  <button className="btn small" disabled={busy} onClick={(e) => decide(e as never, "complete")}>Approve (grant access)</button>
                  <button className="btn small ghost" disabled={busy} onClick={(e) => decide(e as never, "decline")}>Decline</button></>}
                <button className="link" disabled={busy} onClick={(e) => decide(e as never, "coi")}>I have a conflict of interest</button>
              </div>
            </form>)}
          {s.ownerId === uid && <p className="notice">This is your own contribution. Another editor must review it.</p>}
        </>)}
    </article>
  );
}
