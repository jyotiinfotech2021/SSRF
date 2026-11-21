"use client";
import { useState } from "react";
import { call } from "@/lib/client";
import { toast } from "./Toast";

type Media = { id: string; kind: string; fileId?: string; url?: string; caption?: string; credit?: string; ownerId: string };

export default function MediaPanel({ eventId, media, canAdd, uid, editor }: { eventId: string; media: Media[]; canAdd: boolean; uid: string | null; editor: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="media">
      {media.length > 0 && <div className="gallery">{media.map((m) => (
        <figure key={m.id}>
          {m.kind === "image" && m.fileId && <img src={`/api/files/${m.fileId}`} alt={m.caption ?? ""} loading="lazy" style={{ maxWidth: "100%" }} />}
          {m.kind === "video" && m.fileId && <video controls preload="none" src={`/api/files/${m.fileId}`} style={{ maxWidth: "100%" }} />}
          {m.kind === "link" && m.url && <a href={m.url} target="_blank" rel="noopener noreferrer">{m.caption}</a>}
          <figcaption>{m.caption}{m.credit ? ` Credit: ${m.credit}` : ""}
            {(m.ownerId === uid || editor) && <button className="link quiet" onClick={async () => { if (!confirm("Remove this item from the event?")) return; const r = await call("DELETE", `/api/media/${m.id}`); if (r.ok) window.location.reload(); else toast(r.error); }}>Remove</button>}
          </figcaption>
        </figure>))}</div>}
      {canAdd && !open && <button className="link" onClick={() => setOpen(true)}>Add photos or a video link</button>}
      {open && (
        <form className="panel inline" onSubmit={async (e) => {
          e.preventDefault(); const f = new FormData(e.currentTarget);
          const credit = String(f.get("credit") ?? "").trim(); const caption = String(f.get("caption") ?? "").trim(); const url = String(f.get("url") ?? "").trim();
          if (!credit) return toast("Add the photographer or source first, so the credit stays with the file");
          const files = f.getAll("file").filter((x): x is File => x instanceof File && x.size > 0);
          if (url) { const r = await call("POST", `/api/events/${eventId}/media`, { url, caption, credit }); if (!r.ok) return toast(r.error); }
          for (const file of files) {
            const up = new FormData(); up.append("file", file);
            toast(`Uploading ${file.name}…`);
            const u = await call<{ id: string }>("POST", "/api/files", up); if (!u.ok) { toast(u.error); continue; }
            const r = await call("POST", `/api/events/${eventId}/media`, { fileId: u.data.id, caption, credit }); if (!r.ok) toast(r.error);
          }
          toast("Added"); window.location.reload();
        }}>
          <label>Photographer or source (required)<input name="credit" required maxLength={200} /></label>
          <label>Caption<input name="caption" maxLength={300} /></label>
          <label>Video link (https://)<input name="url" type="url" pattern="https://.*" /></label>
          <label>Or upload photos or a short video (up to 20 MB each)<input name="file" type="file" multiple accept="image/*,video/mp4" /></label>
          <div className="actions"><button className="btn small" type="submit">Add</button> <button className="link" type="button" onClick={() => setOpen(false)}>Cancel</button></div>
        </form>)}
    </div>
  );
}
