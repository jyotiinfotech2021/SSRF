"use client";
import { useEffect, useState } from "react";
import { call } from "@/lib/client";
import { toast } from "./Toast";
import { ACATS, ACOLL, BKINDS, ERAS, ETYPES, KINDS, PKINDS, RIGHTS } from "@/lib/ref";

type Kind = "story" | "book" | "place" | "event" | "archive";
type Camp = { id: string; name: string };
type F = { name: string; label: string; type?: "text" | "textarea" | "select" | "date" | "url" | "number"; options?: string[]; required?: boolean; max?: number; hint?: string };

const FIELDS: Record<Kind, F[]> = {
  story: [
    { name: "title", label: "Title", required: true, max: 140 },
    { name: "kind", label: "Kind of contribution", type: "select", options: KINDS, required: true },
    { name: "era", label: "Period it concerns", type: "select", options: ERAS },
    { name: "prov", label: "How do you know this?", type: "select", options: ["first", "family", "research"], hint: "first = I was there; family = told to me by family; research = from documents or books" },
    { name: "attribution", label: "Show my name as", type: "select", options: ["named", "initials", "anonymous"] },
    { name: "body", label: "Your account", type: "textarea", required: true, max: 20000 },
    { name: "video", label: "Video link (https://)", type: "url" },
  ],
  book: [
    { name: "title", label: "Title", required: true, max: 200 },
    { name: "kind", label: "Kind of work", type: "select", options: BKINDS, required: true },
    { name: "author", label: "Author or maker", max: 200 },
    { name: "year", label: "Year", max: 10 },
    { name: "link", label: "Link to it (https://)", type: "url" },
    { name: "description", label: "What it says about Sagat Singh, and where", type: "textarea", required: true, max: 4000 },
  ],
  place: [
    { name: "title", label: "Name of the memorial or honour", required: true, max: 200 },
    { name: "kind", label: "Kind", type: "select", options: PKINDS, required: true },
    { name: "location", label: "Where", max: 200 },
    { name: "lat", label: "Latitude", max: 20 },
    { name: "lng", label: "Longitude", max: 20 },
    { name: "description", label: "Description", type: "textarea", required: true, max: 4000 },
    { name: "source", label: "Source (link, https://)", type: "url" },
  ],
  event: [
    { name: "title", label: "Event title", required: true, max: 200 },
    { name: "type", label: "Type", type: "select", options: ETYPES, required: true },
    { name: "date", label: "Date", type: "date", required: true },
    { name: "place", label: "Place", max: 200 },
    { name: "link", label: "Link (https://)", type: "url" },
    { name: "description", label: "Description", type: "textarea", required: true, max: 4000 },
  ],
  archive: [
    { name: "title", label: "Title of the item", required: true, max: 200 },
    { name: "category", label: "Category", type: "select", options: ACATS, required: true },
    { name: "collection", label: "Collection", type: "select", options: ACOLL },
    { name: "approxDate", label: "Date (approximate is fine)", max: 60 },
    { name: "location", label: "Where it was made", max: 200 },
    { name: "creator", label: "Photographer, author or maker", required: true, max: 200 },
    { name: "originalOwner", label: "Original owner", max: 200 },
    { name: "donor", label: "Donor", max: 200 },
    { name: "rights", label: "Rights", type: "select", options: RIGHTS, required: true },
    { name: "access", label: "Access", type: "select", options: ["Public", "Restricted"] },
    { name: "download", label: "Downloads", type: "select", options: ["Not allowed", "Allowed"] },
    { name: "people", label: "People shown or named", max: 300 },
    { name: "units", label: "Units shown or named", max: 300 },
    { name: "description", label: "Description", type: "textarea", required: true, max: 4000 },
  ],
};
export const KIND_LABEL: Record<Kind, string> = { story: "Share a story", book: "Add a library item", place: "Add a recognition entry", event: "Propose an event", archive: "Offer an archive item" };

export default function ContributeForm({ kind, camps, editor, openOnHash }: { kind: Kind; camps: Camp[]; editor?: boolean; openOnHash?: string }) {
  const [open, setOpen] = useState(false);
  // A hero button elsewhere on the page can link to #catalogue to open this form directly.
  useEffect(() => {
    if (!openOnHash) return;
    const check = () => { if (window.location.hash === openOnHash) setOpen(true); };
    check(); window.addEventListener("hashchange", check); return () => window.removeEventListener("hashchange", check);
  }, [openOnHash]);
  const [busy, setBusy] = useState(false);
  if (!open) return <button className="btn" onClick={() => setOpen(true)}>{KIND_LABEL[kind]}</button>;
  return (
    <form className="panel" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      const fd = new FormData(e.currentTarget);
      const data: Record<string, unknown> = {};
      for (const [k, v] of fd.entries()) if (k !== "camps" && k !== "files" && typeof v === "string") data[k] = v.trim();
      data.camps = fd.getAll("camps");
      if (kind === "story") { data.consent = fd.get("consent") === "on"; data.editOk = fd.get("editOk") === "on"; }
      if (kind === "archive") {
        const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
        const ids: { fileId: string; name: string; sha256: string; type: string; size: number }[] = [];
        for (const file of files) {
          const up = new FormData(); up.append("file", file);
          toast(`Uploading ${file.name}…`);
          const r = await call<{ id: string; sha256: string; name: string; contentType: string; size: number }>("POST", "/api/files", up);
          if (!r.ok) { toast(r.error); setBusy(false); return; }
          ids.push({ fileId: r.data.id, name: r.data.name, sha256: r.data.sha256, type: r.data.contentType, size: r.data.size });
        }
        data.files = ids;
        if (editor) {
          const r = await call<{ id: string }>("POST", "/api/editorial/archive", { ...data, fileIds: ids.map((x) => x.fileId) });
          setBusy(false);
          if (r.ok) { toast(`Catalogued as ${r.data.id}`); setOpen(false); window.location.reload(); } else toast(r.error);
          return;
        }
      }
      if (kind === "event" && editor) {
        const r = await call("POST", "/api/editorial/events", data);
        setBusy(false);
        if (r.ok) { toast("Event saved"); setOpen(false); window.location.reload(); } else toast(r.error);
        return;
      }
      const r = await call("POST", "/api/submissions", { kind, data });
      setBusy(false);
      if (r.ok) { toast("Sent to the editors for review"); setOpen(false); } else toast(r.error);
    }}>
      <h3>{KIND_LABEL[kind]}</h3>
      <p className="meta">Contributions go to the foundation&apos;s editors before they appear. You can follow yours under My account.</p>
      {FIELDS[kind].map((f) => (
        <div key={f.name}>
          <label htmlFor={`f-${kind}-${f.name}`}>{f.label}{f.hint ? <small> ({f.hint})</small> : null}</label>
          {f.type === "textarea" ? <textarea id={`f-${kind}-${f.name}`} name={f.name} required={f.required} maxLength={f.max} style={{ minHeight: "8rem" }} />
            : f.type === "select" ? <select id={`f-${kind}-${f.name}`} name={f.name} required={f.required} defaultValue=""><option value="" disabled={!!f.required}>{f.required ? "Choose…" : "Not stated"}</option>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
            : <input id={`f-${kind}-${f.name}`} name={f.name} type={f.type ?? "text"} required={f.required} maxLength={f.max} pattern={f.type === "url" ? "https://.*" : undefined} title={f.type === "url" ? "Links must start with https://" : undefined} />}
        </div>
      ))}
      {kind === "archive" && (<><label htmlFor="f-files">Files <small>(photos, PDF, MP3, MP4; up to 20 MB each)</small></label><input id="f-files" name="files" type="file" multiple accept="image/*,application/pdf,audio/mpeg,video/mp4,text/plain" /></>)}
      {camps.length > 0 && <fieldset className="camps"><legend>Related campaigns</legend>{camps.map((c) => <label key={c.id} className="check"><input type="checkbox" name="camps" value={c.id} /> {c.name}</label>)}</fieldset>}
      {kind === "story" && (<>
        <label className="check"><input type="checkbox" name="consent" required /> I have the right to share this, and I understand the editors may check it against sources before it is published.</label>
        <label className="check"><input type="checkbox" name="editOk" /> Editors may correct spelling and obvious slips.</label>
      </>)}
      <div className="actions"><button className="btn" type="submit" disabled={busy}>{busy ? "Sending…" : editor && (kind === "archive" || kind === "event") ? "Save" : "Send to the editors"}</button> <button className="link" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}
