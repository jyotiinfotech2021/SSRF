"use client";
import { useCallback, useEffect, useState } from "react";
import { call } from "@/lib/client";
import { toast } from "./Toast";
import { ASSESS, NATURE, STAGES } from "@/lib/ref";

type Sub = { id: string; ownerId: string; kind: string; status: string; priority: string; assignee?: string; due?: string; createdAt: string; data: Record<string, unknown>; history: { at: string; by: string; status: string; note?: string }[]; coi: string[] };
type Row = { submission: Sub; ownerName?: string; ownerCategory?: string; blocked?: string };
type Editor = { id: string; name: string };
const KIND: Record<string, string> = { story: "Story", book: "Library item", place: "Recognition entry", event: "Event", archive: "Archive item", correction: "Correction", privacy: "Data request", access: "Access request" };
const PUBLISHABLE = ["story", "book", "place", "event", "archive"];

export default function ReviewQueue({ uid }: { uid: string }) {
  const [scope, setScope] = useState("open"); const [kind, setKind] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null); const [editors, setEditors] = useState<Editor[]>([]);
  const [tick, setTick] = useState(0);
  const load = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    let live = true;
    (async () => {
      const r = await call<{ items: Row[]; editors: Editor[] }>("GET", `/api/editorial/queue?scope=${scope}${kind ? `&kind=${kind}` : ""}`);
      if (!live) return;
      if (r.ok) { setRows(r.data.items); setEditors(r.data.editors); } else toast(r.error);
    })();
    return () => { live = false; };
  }, [scope, kind, tick]);
  return (
    <div>
      <div className="seg-tabs" role="tablist">
        {[["open", "Open"], ["mine", "Assigned to me"], ["closed", "Closed"], ["all", "Everything"]].map(([k, v]) => <button key={k} role="tab" aria-selected={scope === k} onClick={() => setScope(k)}>{v}</button>)}
      </div>
      <label>Type<select value={kind} onChange={(e) => setKind(e.target.value)}><option value="">All</option>{Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      {rows === null ? <p className="meta">Loading…</p> : rows.length ? rows.map((r) => <Card key={r.submission.id} r={r} editors={editors} uid={uid} reload={load} />) : <p className="empty">Nothing here. Try &quot;Everything&quot;.</p>}
    </div>
  );
}

function Card({ r, editors, uid, reload }: { r: Row; editors: Editor[]; uid: string; reload: () => void }) {
  const s = r.submission; const d = s.data; const open = ["submitted", "screening", "research", "factcheck", "approval", "evidence"].includes(s.status);
  const [busy, setBusy] = useState(false);
  const str = (k: string) => (typeof d[k] === "string" ? (d[k] as string) : "");
  const decide = async (e: React.FormEvent<HTMLFormElement>, action: string) => {
    e.preventDefault(); setBusy(true);
    const f = new FormData(e.currentTarget.form ?? e.currentTarget);
    const body = { action, note: String(f.get("note") ?? ""), noConflict: f.get("coi") === "none", newText: String(f.get("newText") ?? "") || undefined, assessment: String(f.get("assessment") ?? "") || undefined, nature: String(f.get("nature") ?? "") || undefined, camps: f.getAll("camps").map(String) };
    const res = await call<{ message: string }>("POST", `/api/editorial/submissions/${s.id}/decide`, body);
    setBusy(false);
    if (res.ok) { toast(res.data.message); reload(); } else toast(res.error);
  };
  return (
    <article className="rcard panel" id={s.id}>
      <h3>{str("title") || str("name") || KIND[s.kind]} <span className="tag">{KIND[s.kind]}</span> <span className={`tag st-${s.status}`}>{STAGES[s.status] ?? s.status}</span> {s.priority !== "Normal" && <span className="tag">{s.priority}</span>}</h3>
      <p className="meta">From {r.ownerName ?? "a contributor"}{r.ownerCategory ? ` (${r.ownerCategory})` : ""} · {new Date(s.createdAt).toLocaleDateString("en-IN")}{s.due ? ` · due ${s.due}` : ""}</p>
      {s.kind === "correction" && <><p><b>Target:</b> {str("target")}</p><p><b>Proposed:</b> {str("text")}</p><p><b>Their source:</b> {str("source")}</p></>}
      {s.kind === "privacy" && <><p><b>Request:</b> {str("type")} {str("item")}</p><p>{str("detail")}</p></>}
      {s.kind === "access" && <><p><b>Item:</b> {str("title")} ({str("item")})</p><p><b>Purpose:</b> {str("purpose")}</p></>}
      {PUBLISHABLE.includes(s.kind) && <details><summary>Contribution text and fields</summary><dl>{Object.entries(d).filter(([k]) => !k.startsWith("_") && typeof d[k] !== "object").map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>)}</dl></details>}
      <details><summary>History ({s.history.length})</summary><ol>{s.history.map((h, i) => <li key={i}>{new Date(h.at).toLocaleDateString("en-IN")}: {STAGES[h.status] ?? h.status}{h.note ? `. ${h.note}` : ""}</li>)}</ol></details>
      {r.blocked && open && <p className="notice">{r.blocked}</p>}
      {open && (
        <>
          <form className="inline-form assign" onSubmit={async (e) => { e.preventDefault(); const f = new FormData(e.currentTarget); const res = await call("POST", `/api/editorial/submissions/${s.id}/assign`, { assignee: String(f.get("assignee")) || null, due: String(f.get("due")) || null, priority: String(f.get("priority")), stage: String(f.get("stage")) }); if (res.ok) { toast("Assignment saved"); reload(); } else toast(res.error); }}>
            <select name="assignee" aria-label="Assigned to" defaultValue={s.assignee ?? ""}><option value="">Unassigned</option>{editors.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select>
            <input name="due" type="date" aria-label="Due" defaultValue={s.due ?? ""} />
            <select name="priority" aria-label="Priority" defaultValue={s.priority}>{["Low", "Normal", "High", "Urgent"].map((p) => <option key={p}>{p}</option>)}</select>
            <select name="stage" aria-label="Stage" defaultValue={s.status}>{["submitted", "screening", "research", "factcheck", "approval", ...(s.status === "evidence" ? ["evidence"] : [])].map((p) => <option key={p} value={p}>{STAGES[p]}</option>)}</select>
            <button className="btn small ghost" type="submit">Save</button>
          </form>
          {s.ownerId === uid ? null : (
            <form className="decide" onSubmit={(e) => e.preventDefault()}>
              {s.kind === "correction" && <label>Corrected text (to apply)<textarea name="newText" defaultValue={str("text")} /></label>}
              {PUBLISHABLE.includes(s.kind) && s.kind !== "event" && (<>
                <label>Evidence classification<select name="assessment" defaultValue="unverified">{Object.entries(ASSESS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                <label>Nature of source<select name="nature" defaultValue="">{["", ...NATURE].map((n) => <option key={n} value={n}>{n || "From the contribution"}</option>)}</select></label>
              </>)}
              <label>Note (required to send back, decline or resolve)<textarea name="note" maxLength={2000} /></label>
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
