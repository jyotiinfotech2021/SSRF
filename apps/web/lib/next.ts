/** Only same-site relative paths are allowed as a post-login destination (blocks open redirects such as //evil.com). */
export function safeNext(raw: string | string[] | undefined, fallback: string): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\") || v.includes("://")) return fallback;
  return v;
}
