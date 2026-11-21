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
