"use client";
import { useState } from "react";
import { call } from "@/lib/client";
import { toast } from "./Toast";

export function SaluteButton({ id, initial, count, signedIn }: { id: string; initial: boolean; count: number; signedIn: boolean }) {
  const [on, setOn] = useState(initial); const [n, setN] = useState(count);
  return (
    <button className={`salute${on ? " on" : ""}`} aria-pressed={on} disabled={!signedIn} title={signedIn ? "" : "Sign in to salute"} onClick={async () => {
      const r = await call<{ saluted: boolean }>("POST", `/api/stories/${id}/salute`);
      if (!r.ok) return toast(r.error);
      setOn(r.data.saluted); setN((x) => x + (r.data.saluted ? 1 : -1));
    }}>Salute · {n}</button>
  );
}

export function AttendButton({ id, initial, count, signedIn }: { id: string; initial: boolean; count: number; signedIn: boolean }) {
  const [on, setOn] = useState(initial); const [n, setN] = useState(count);
  return (
    <button className="btn small" aria-pressed={on} disabled={!signedIn} title={signedIn ? "" : "Sign in to register"} onClick={async () => {
      const r = await call<{ registered: boolean }>("POST", `/api/events/${id}/attend`);
      if (!r.ok) return toast(r.error);
      setOn(r.data.registered); setN((x) => x + (r.data.registered ? 1 : -1));
      toast(r.data.registered ? "You're registered" : "Registration cancelled");
    }}>{on ? "Registered. Cancel" : "Register interest"} · {n}</button>
  );
}

export function DeleteButton({ col, id, label, confirmText }: { col: string; id: string; label: string; confirmText: string }) {
  return <button className="link quiet" onClick={async () => {
    if (!confirm(confirmText)) return;
    const r = await call("DELETE", `/api/editorial/${col}/${id}`);
    if (r.ok) { toast("Done"); window.location.reload(); } else toast(r.error);
  }}>{label}</button>;
}

export function StatusForm({ col, id, status, note }: { col: string; id: string; status: string; note?: string | null }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="link quiet" onClick={() => setOpen(true)}>Set verification status</button>;
  return (
    <form className="panel inline" onSubmit={async (e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget);
      const r = await call("PUT", `/api/editorial/status/${col}/${id}`, { status: f.get("status"), verNote: f.get("verNote") });
      if (r.ok) { toast("Status saved"); window.location.reload(); } else toast(r.error);
    }}>
      <label>Verification status<select name="status" defaultValue={status}>{[["checking", "Under verification"], ["evidence", "Evidence requested"], ["verified", "Verified"], ["rejected", "Rejected"], ["recheck", "Needs re-verification"]].map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label>Note for the record<input name="verNote" defaultValue={note ?? ""} maxLength={500} /></label>
      <div className="actions"><button className="btn small" type="submit">Save</button> <button className="link" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}

export function EditText({ col, id, field, value, label }: { col: string; id: string; field?: string; value: string; label: string }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="link quiet" onClick={() => setOpen(true)}>Edit {label}</button>;
  return (
    <form className="panel inline" onSubmit={async (e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget);
      const path = col === "campaigns" ? `/api/editorial/campaigns/${id}/${field}` : col === "archive-transcript" ? `/api/editorial/archive/${id}/transcript` : `/api/editorial/text/${col}/${id}`;
      const r = await call("PUT", path, { value: String(f.get("value")), reason: String(f.get("reason")) });
      if (r.ok) { toast("Revision saved"); window.location.reload(); } else toast(r.error);
    }}>
      <label>Text<textarea name="value" defaultValue={value} required style={{ minHeight: "7rem" }} /></label>
      <label>Reason for the change (kept in the revision history)<input name="reason" required maxLength={500} /></label>
      <div className="actions"><button className="btn small" type="submit">Save revision</button> <button className="link" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}
