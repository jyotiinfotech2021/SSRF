const DEVA = /[\u0900-\u097F]/;

/**
 * The site is English only. A few catalogued videos carry Hindi titles from their uploaders; the record keeps the original,
 * but pages show the English part of the title, or a plain English label with the creator when there is none.
 */
export function englishTitle(title: string, fallback?: string): string {
  if (!DEVA.test(title)) return title;
  const latin = title.split(/[\u0900-\u097F]+/).map((s) => s.replace(/[|:,\-–()\s]+$/g, "").replace(/^[|:,\-–()\s]+/g, "")).filter((s) => /[A-Za-z]{3}/.test(s));
  const joined = latin.join(" ").replace(/\s+/g, " ").trim();
  return joined.replace(/[A-Za-z]/g, "").length < joined.length && joined.length >= 14 ? joined : fallback || "Hindi-language video";
}

/** The generic note stamped on every catalogued video at set-up says nothing about the item, so it is not shown. */
export const usefulNote = (n?: string | null) => (n && !/^Link, title and creator credit checked during setup/i.test(n) ? n : null);

/** Images uploaded to the prototype are referenced as /_blob/<id>; the copies the foundation supplied live under /recognition. */
export const assetUrl = (u: string) => { const m = /^\/_blob\/([0-9a-f]{32})$/.exec(u); return m ? `/recognition/${m[1]}.jpg` : u; };
