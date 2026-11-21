"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { call } from "@/lib/client";
import { toast } from "./Toast";
import { ASSESS } from "@/lib/ref";

/** The four story filters. Each change reloads the list straight away; the choice lives in the address, so it can be shared. */
export function StoryFilters({ kinds, eras, natures }: { kinds: string[]; eras: string[]; natures: string[] }) {
  const router = useRouter(); const path = usePathname(); const sp = useSearchParams();
  const set = (k: string, v: string) => { const u = new URLSearchParams(sp.toString()); if (v) u.set(k, v); else u.delete(k); router.replace(u.toString() ? `${path}?${u}` : path); };
  const sel = (k: string, label: string, opts: [string, string][]) => (
    <select aria-label={label} value={sp.get(k) ?? ""} onChange={(e) => set(k, e.target.value)}>
      <option value="">{label}</option>{opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  );
  return (
    <div className="story-filters">
      {sel("kind", "All types", kinds.map((x) => [x, x]))}
      {sel("era", "All periods", eras.map((x) => [x, x]))}
      {sel("material", "Any material", natures.map((x) => [x, x]))}
      {sel("assess", "Any assessment", Object.entries(ASSESS))}
    </div>
  );
}

/** Editors: change how well the story's claims are supported. The change is logged with its reason. */
export function AssessSelect({ id, value, own }: { id: string; value: string; own: boolean }) {
  const [v, setV] = useState(value || "unverified");
  return (
    <select className="assess-select" aria-label="Evidence classification" value={v} disabled={own} title={own ? "Another editor must classify your own story" : "Change the evidence classification"} onChange={async (e) => {
      const next = e.target.value; const reason = window.prompt("Reason for changing the classification (kept in the revision history):", ""); if (!reason) return;
      const r = await call("PUT", `/api/editorial/assess/stories/${id}`, { assessment: next, reason });
      if (r.ok) { setV(next); toast("Classification saved"); window.location.reload(); } else toast(r.error);
    }}>
      {Object.entries(ASSESS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
    </select>
  );
}
