# SEO

- Every indexable page sets a unique title and description, an absolute canonical URL, and Open Graph and Twitter tags through `pageMeta()` in `apps/web/lib/seo.ts`. The default share image is `public/og-default.jpg` (1200x630).
- Structured data (JSON-LD): Organization and WebSite (with SearchAction) site-wide; Person and ProfilePage on the home and biography pages; Event, Article, ArchiveComponent and ItemList on their pages; BreadcrumbList on every page below the root. Only facts held in the database or `SUBJECT` in `seo.ts` are emitted; nothing is invented.
- `sitemap.xml` and `robots.txt` are generated on request from the live data, using `SITE_URL`. Private areas (`/admin`, `/api/`, `/account`, `/search`, sign-in pages) are disallowed.
- `SITE_URL` must be set to the public origin in production, or canonicals and the sitemap will point at localhost.
- Fonts (Big Shoulders Stencil, Source Serif 4) are self-hosted through `next/font`, so no render-blocking request leaves the site.
- Lighthouse (local, simulated mobile): SEO 100, best practices 100, accessibility 100 on `/` and `/archive`. Performance 56-84 depending on the page; the home page is held back by its large hero portrait (215 KB).
