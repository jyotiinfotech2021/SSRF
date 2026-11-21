"use client";
import { useState } from "react";
import { call } from "@/lib/client";
import { toast } from "./Toast";
import { NATURE } from "@/lib/ref";

export default function AddSource() {
  const [open, setOpen] = useState(false);
  if (!open) return <p><button className="btn" onClick={() => setOpen(true)}>Add a source</button></p>;
  return (
    <form className="panel" onSubmit={async (e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget);
      const g = (k: string) => String(f.get(k) ?? "").trim();
      const r = await call("POST", "/api/editorial/sources", { id: g("id"), author: g("author"), title: g("title"), publisher: g("publisher"), date: g("date"), accessed: g("accessed"), nature: g("nature"), url: g("url"), note: g("note") });
      if (r.ok) { toast("Source added"); window.location.reload(); } else toast(r.error);
    }}>
      <h3>Add a source</h3>
      <label>Short id (used when citing)<input name="id" required maxLength={60} pattern="[a-z0-9-]+" title="lower-case letters, numbers and hyphens" /></label>
      <label>Author<input name="author" required /></label><label>Title<input name="title" required /></label>
      <label>Publisher<input name="publisher" /></label><label>Date<input name="date" /></label><label>Accessed<input name="accessed" /></label>
      <label>Nature<select name="nature" required>{NATURE.map((n) => <option key={n}>{n}</option>)}</select></label>
      <label>Link<input name="url" type="url" /></label><label>Note<textarea name="note" /></label>
      <div className="actions"><button className="btn" type="submit">Add source</button> <button className="link" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}
