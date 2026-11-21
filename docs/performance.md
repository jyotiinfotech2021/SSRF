# Caching and performance

Most of the site is public reading material that changes rarely, so it is cached at every layer. Signed-in visitors are never served shared copies.

| Layer | What is cached | For how long |
|---|---|---|
| Web server data cache (`apps/web/lib/api.ts`) | API responses for visitors with no session (`ssrf.auth` cookie absent) | 120 s, set by `PUBLIC_REVALIDATE_SECONDS` |
| Public HTML (`next.config.ts`) | Pages requested without the sign-in cookie: `Cache-Control: public, s-maxage=120, stale-while-revalidate=600`. A CDN or reverse proxy may keep them; browsers always revalidate | 2 min, served stale up to 10 min more while refreshing |
| Hashed build files (`/_next/static`) | JS, CSS, fonts | 1 year, immutable (Next default) |
| Files named by a content id (`/library/covers`, `/recognition`, `/thumbs`) | Book covers, concept images, video thumbnails | 1 year, immutable |
| Site images and downloads (`/home`, `/learn`) | Home photographs, teacher PDFs | 1 week, then revalidated |
| Icons and the share image | favicon, apple icon, `og-default.jpg` | 1 day |

Never cached: anything with a sign-in cookie, `/account`, `/admin`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/search` and `/api/*`.

## What visitors see
Editors' changes reach anonymous visitors within about two minutes (data cache) plus the proxy's `s-maxage` if one is in front. Lower `PUBLIC_REVALIDATE_SECONDS` for faster updates, or set it to `0` while editing heavily.

## In front of the site
Put the site behind a CDN or caching proxy (Cloudflare, Caddy with a cache module, nginx `proxy_cache`) set to **respect origin `Cache-Control`**, with gzip/brotli and HTTP/2 on. Do not add a rule that caches responses carrying the `ssrf.auth` cookie; the headers already prevent it.

## Other measures
- Fonts are self-hosted through `next/font`; no request leaves the site for them.
- Large JPEGs were recompressed (about 25 percent smaller). Originals are kept outside the site in `export/originals`.
- Video thumbnails are served from this site, so no page view contacts YouTube.
- Local timing note: on Windows, `localhost` can add about 200 ms through an IPv6 fallback. Measure against `127.0.0.1`; the server answers pages in roughly 20 to 30 ms.

Lighthouse (simulated mobile, local): Home 70, Library 86 after these changes (Home was about 57 to 63).
