import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:5080";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
  async headers() {
    const year = "public, max-age=31536000, immutable";
    const week = "public, max-age=604800, stale-while-revalidate=86400";
    const day = "public, max-age=86400, stale-while-revalidate=86400";
    // Pages with no sign-in cookie hold only public content, so a CDN or proxy may keep them briefly.
    const anonymousPage = "public, max-age=0, s-maxage=120, stale-while-revalidate=600";
    return [
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "same-origin" },
        { key: "X-Frame-Options", value: "DENY" },
        // The site is HTTPS-only on www: browsers should not try plain http again for a year. (No includeSubDomains.)
        { key: "Strict-Transport-Security", value: "max-age=31536000" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
      ] },
      // Files named by a content id or hash never change, so browsers keep them for a year.
      { source: "/library/covers/:file", headers: [{ key: "Cache-Control", value: year }] },
      { source: "/recognition/:file", headers: [{ key: "Cache-Control", value: year }] },
      { source: "/recognition/sm/:file", headers: [{ key: "Cache-Control", value: year }] },
      { source: "/thumbs/:file", headers: [{ key: "Cache-Control", value: year }] },
      // Site images and downloads can be replaced, so they are revalidated after a week.
      { source: "/home/:file", headers: [{ key: "Cache-Control", value: week }] },
      { source: "/learn/:file", headers: [{ key: "Cache-Control", value: week }] },
      { source: "/:file(og-default.jpg|favicon.ico|icon.svg|apple-icon.png)", headers: [{ key: "Cache-Control", value: day }] },
      // Public HTML for visitors who are not signed in. Signed-in pages (and every private area) keep Next's no-store default.
      { source: "/((?!api/|_next/|account|admin|login|register|forgot-password|reset-password|search)[^.]*)", missing: [{ type: "cookie", key: "ssrf.auth" }], headers: [{ key: "Cache-Control", value: anonymousPage }] },
    ];
  },
};
export default nextConfig;
