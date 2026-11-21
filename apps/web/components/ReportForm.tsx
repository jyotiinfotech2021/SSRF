"use client";
import { useState } from "react";
import { call } from "@/lib/client";
import { toast } from "./Toast";

export default function ReportForm({ id, d }: { id: string; d: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="link quiet" onClick={() => setOpen(true)}>Write or edit the report</button>;
  return (
    <form className="panel inline" onSubmit={async (e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget); const g = (k: string) => String(f.get(k) ?? "").trim();
      const r = await call("PUT", `/api/editorial/events/${id}/report`, { summary: g("summary"), proceedings: g("proceedings"), attendance: g("attendance"), recording: g("recording"), outcomes: g("outcomes"), press: g("press") });
      if (r.ok) { toast("Report saved"); window.location.reload(); } else toast(r.error);
    }}>
      <label>Summary<textarea name="summary" defaultValue={d.summary} /></label><label>Proceedings<textarea name="proceedings" defaultValue={d.proceedings} /></label>
      <label>Attendance<input name="attendance" defaultValue={d.attendance} /></label><label>Recording link<input name="recording" type="url" defaultValue={d.recording} /></label>
      <label>Outcomes<textarea name="outcomes" defaultValue={d.outcomes} /></label><label>Press coverage<input name="press" defaultValue={d.press} /></label>
      <div className="actions"><button className="btn small" type="submit">Save report</button> <button className="link" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}
