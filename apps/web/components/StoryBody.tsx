"use client";
import { useState, type ReactNode } from "react";

/** The story text, clipped to three lines with a "Read in full" toggle that also reveals the sources and edit history, as in the prototype. */
export default function StoryBody({ body, sources, history, children }: { body: string; sources?: string; history?: ReactNode; children?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const long = body.length > 220 || !!sources;
  return (
    <>
      <div className={`body${open ? "" : " clip"}`}>{body}</div>
      {open && sources && <p className="meta"><b>Sources:</b> {sources}</p>}
      {open && history}
      <div className="actions">
        {long && <button className="link" type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)}>{open ? "Show less" : "Read in full"}</button>}
        {children}
      </div>
    </>
  );
}
