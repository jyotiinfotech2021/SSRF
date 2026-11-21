"use client";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type FilterDef = { param: string; label: string; options: [string, string][] };

/** Dropdown filters that reload the list as soon as one changes. The choice lives in the address, so a filtered view can be shared. */
export default function FilterBar({ filters }: { filters: FilterDef[] }) {
  const router = useRouter(); const path = usePathname(); const sp = useSearchParams();
  const set = (k: string, v: string) => { const u = new URLSearchParams(sp.toString()); if (v) u.set(k, v); else u.delete(k); router.replace(u.toString() ? `${path}?${u}` : path); };
  return (
    <div className="story-filters">
      {filters.map((f) => (
        <select key={f.param} aria-label={f.label} value={sp.get(f.param) ?? ""} onChange={(e) => set(f.param, e.target.value)}>
          <option value="">{f.label}</option>{f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>))}
    </div>
  );
}
