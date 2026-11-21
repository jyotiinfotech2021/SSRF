"use client";

export type ApiResult<T = unknown> = { ok: true; data: T } | { ok: false; error: string; status: number };

/** Browser-side API call. Same-origin (proxied by Next), carries the auth cookie and the CSRF header. */
export async function call<T = unknown>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    const r = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: { "X-Requested-With": "ssrf-web", ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}) },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
    const text = await r.text();
    const json = text ? safe(text) : null;
    if (!r.ok) {
      const j = json as { error?: string; errors?: string[] } | null;
      const msg = j?.error ?? j?.errors?.join(" ") ?? (r.status === 403 ? "Your access level doesn't allow that." : r.status === 401 ? "Please sign in first." : "That didn't save. Check your connection and try again.");
      return { ok: false, error: msg, status: r.status };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: "That didn't save. Check your connection and try again.", status: 0 };
  }
}
function safe(t: string) { try { return JSON.parse(t); } catch { return null; } }
