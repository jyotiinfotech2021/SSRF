"use client";
import { useState } from "react";
import { call } from "@/lib/client";
import { toast } from "./Toast";

export default function SettingsForm({ initial }: { initial: Record<string, string | undefined> }) {
  const [open, setOpen] = useState(false);
  if (!open) return <p><button className="btn small" onClick={() => setOpen(true)}>Edit governance and contact</button></p>;
  const fields: [string, string, boolean][] = [["mission", "Mission", true], ["governance", "Governance", true], ["editors", "Editors", true], ["policy", "Privacy and data policy", true], ["email", "Contact email", false], ["address", "Address", false]];
  return (
    <form className="panel" onSubmit={async (e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget); const body: Record<string, string> = {};
      for (const [k] of fields) body[k] = String(f.get(k) ?? "").trim();
      const r = await call("PUT", "/api/editorial/site/settings", body);
      if (r.ok) { toast("Saved"); window.location.reload(); } else toast(r.error);
    }}>
      {fields.map(([k, label, big]) => <label key={k}>{label}{big ? <textarea name={k} defaultValue={initial[k]} /> : <input name={k} defaultValue={initial[k]} />}</label>)}
      <div className="actions"><button className="btn small" type="submit">Save</button> <button className="link" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}
