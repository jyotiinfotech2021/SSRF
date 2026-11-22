/**
 * Members who enrolled with a chapter before this website opened (offline registers).
 * Each chapter starts at DEFAULT_ENROLLED; editors can change it per chapter in the site settings
 * ("Members enrolled before the site opened", one line per chapter: `goa | 50`).
 * The count shown publicly is this number plus the members who joined on the site.
 */
export const DEFAULT_ENROLLED = 50;

type Chapter = { id: string; name: string };

/** Parses `chapter | number` lines. A chapter may be written by its id (goa) or its name (Goa). */
export function enrolledFor(settings: { enrolled?: string } | undefined, c: Chapter): number {
  const lines = String(settings?.enrolled ?? "").split("\n");
  for (const l of lines) {
    const [k, v] = l.split("|").map((x) => x.trim());
    if (!k) continue;
    if (k.toLowerCase() === c.id.toLowerCase() || k.toLowerCase() === c.name.toLowerCase()) {
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_ENROLLED;
    }
  }
  return DEFAULT_ENROLLED;
}
