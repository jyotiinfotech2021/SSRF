import { cookies } from "next/headers";

const API_URL = process.env.API_URL ?? "http://localhost:5080";

export type Source = { id: string; author: string; title: string; publisher?: string | null; date?: string | null; accessed?: string | null; nature: string; url?: string | null; note?: string | null };
export type Cite = { id: number; sourceId: string; loc?: string | null; position: number };
export type Claim = { id: string; reviewedAt?: string | null; scope: string; heading: string; year?: string | null; text: string; assessment: string; status: string; established?: string | null; unresolved?: string | null; order: number; citations: Cite[] };
export type Campaign = { id: string; name: string; order: number; data: Record<string, unknown> };
export type Entity = { id: string; type: string; name: string; role?: string | null; period?: string | null; camps: string[]; cites: string[] };
export type Chapter = { id: string; name: string; order: number; purpose: string[]; coordinator?: string | null; active: boolean };
export type Item = { id: string; title: string; status: string; reviewedAt?: string | null; authorId?: string | null; authorName?: string | null; nature?: string | null; assessment?: string | null; verNote?: string | null; createdAt: string; camps: string[]; data: Record<string, unknown> };
export type Story = Item & { kind?: string; era?: string; body?: string; provenance?: string };
export type Book = Item & { kind?: string; description?: string };
export type Place = Item & { kind?: string; description?: string; lat?: number | null; lng?: number | null };
export type EventItem = Item & { type?: string; date?: string; description?: string };
export type ArchiveItem = Item & { category?: string; collection?: string; description?: string; rights?: string; access: string; transcript?: string; pageCount: number };
export type Quiz = { id: string; n: number; q: string; options: string[]; answer: number; explain?: string; hint?: string; source?: string; topic?: string; level?: string };
export type Member = { id: string; name: string; title?: string; affiliation?: string; category?: string; chapter?: string; connection?: string; interests?: string; camps: string[]; photo?: string; joinedAt: string };
export type Revision = { id: string; action: string; target: string; title?: string; reason?: string; byId?: string; before?: string; after?: string; at: string };
export type Me = { id: string | null; email?: string; roles?: string[]; legacyUid?: string };

async function headers() {
  const c = (await cookies()).toString();
  return c ? { cookie: c } : undefined;
}

/** Server-side GET. Returns null when the API is unreachable or the record is missing, so pages can show an honest empty state. */
export async function get<T>(path: string): Promise<T | null> {
  try {
    const r = await fetch(API_URL + path, { cache: "no-store", headers: await headers() });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export async function me(): Promise<Me> {
  return (await get<Me>("/api/auth/me")) ?? { id: null };
}
export const isEditor = (m: Me) => !!m.roles?.some((r) => r === "Admin" || r === "Editor");
export const isAdmin = (m: Me) => !!m.roles?.includes("Admin");
export const canContribute = (m: Me) => !!m.roles?.some((r) => ["Admin", "Editor", "Contributor"].includes(r));
