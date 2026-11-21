"use client";
import { useState } from "react";
import { call } from "@/lib/client";
import { toast } from "./Toast";

export default function AccessRequest({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="btn small" onClick={() => setOpen(true)}>Request access</button>;
  return (
    <form className="panel inline" onSubmit={async (e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget);
      const r = await call("POST", "/api/submissions", { kind: "access", data: { item: `archive/${id}`, title, purpose: String(f.get("purpose")) } });
      if (r.ok) { toast("Access requested"); setOpen(false); } else toast(r.error);
    }}>
      <label>What will you use it for?<textarea name="purpose" required maxLength={2000} /></label>
      <div className="actions"><button className="btn small" type="submit">Send request</button> <button className="link" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}
