"use client";
import { useState } from "react";
import { call } from "@/lib/client";
import { toast } from "./Toast";

/** Editors: governance and contact details shown on the About page and the footer. */
export default function SettingsForm({ initial }: { initial: Record<string, string | undefined> }) {
  const [open, setOpen] = useState(false);
  if (!open) return <p><button className="btn small ghost" onClick={() => setOpen(true)}>{initial.email ? "Edit governance and contact" : "Add the foundation's contact details"}</button></p>;
  const fields: [string, string, boolean, string?][] = [
    ["governance", "Governing body", true], ["council", "Research and Editorial Council", true],
    ["email", "Contact email", false], ["address", "Postal address", false],
    ["registration", "Registered as", false, "Trust or society, registration number"], ["dataOfficer", "Person responsible for personal data", false],
    ["social", "Social media (one per line: name | full web address)", true, "YouTube | https://www.youtube.com/@..."],
  ];
  return (
    <form className="panel" onSubmit={async (e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget); const body: Record<string, string> = {};
      for (const [k] of fields) body[k] = String(f.get(k) ?? "").trim();
      const r = await call("PUT", "/api/editorial/site/settings", body);
      if (r.ok) { toast("Saved"); window.location.reload(); } else toast(r.error);
    }}>
      {fields.map(([k, label, big, ph]) => <label key={k}>{label}{big ? <textarea name={k} defaultValue={initial[k]} placeholder={ph} style={{ minHeight: "4rem" }} /> : <input name={k} defaultValue={initial[k]} placeholder={ph} type={k === "email" ? "email" : "text"} />}</label>)}
      <div className="actions"><button className="btn small" type="submit">Save</button> <button className="link" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}
