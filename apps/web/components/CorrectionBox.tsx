"use client";
import { useState } from "react";
import { call } from "@/lib/client";
import { toast } from "./Toast";

export default function CorrectionBox({ target, title }: { target: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!open) return <button className="link quiet" onClick={() => setOpen(true)}>Suggest a correction</button>;
  return (
    <form className="panel inline" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      const f = new FormData(e.currentTarget);
      const r = await call("POST", "/api/submissions", { kind: "correction", data: { target, title, text: String(f.get("text")), source: String(f.get("source")) } });
      setBusy(false);
      if (r.ok) { toast("Thank you. The editors will review your correction."); setOpen(false); } else toast(r.error);
    }}>
      <label htmlFor={`cx-${target}`}>What is wrong, and what should it say?</label>
      <textarea id={`cx-${target}`} name="text" required maxLength={3000} style={{ minHeight: "5rem" }} />
      <label htmlFor={`cs-${target}`}>Your source <small>(book and page, document, link)</small></label>
      <input id={`cs-${target}`} name="source" required maxLength={500} />
      <div className="actions">
        <button className="btn small" type="submit" disabled={busy}>Send to the editors</button>
        <button className="link" type="button" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
