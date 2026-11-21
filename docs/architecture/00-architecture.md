# Architecture (modular monolith)

- `apps/web`: Next.js + TypeScript (App Router, SSR for SEO). Port of ssrf.css tokens (olive, burgundy, antique gold, ivory; Source Serif 4, Big Shoulders Stencil Display).
- `apps/api`: ASP.NET Core Web API (.NET 10), EF Core, PostgreSQL, ASP.NET Core Identity (cookie auth, same-site).
- Modules: Content (claims, campaigns, sources, entities, books, places, events, archive, site, quiz), Community (members, chapters, stories, media, salutes, attendance), Editorial (submissions, review stages, revisions, corrections), Identity, Storage, Admin/Backup.
- `IObjectStorage`: local-disk provider for dev, S3-compatible for production. No secrets in the repo; config via environment variables.
- Docker Compose: web, api, postgres, nightly pg_dump backup job plus a restore script.
- Tests: xUnit + Testcontainers (API), Vitest/Playwright (web), migration validation (record counts and checksums against the export).

## Build phases
0. Inventory and mapping (this doc set). 1. Solution scaffold, schema, migrations, seed import from snapshot.json with validation. 2. Read APIs + public pages. 3. Identity, roles, member profiles. 4. Contribution forms + editorial workflow + revisions. 5. Archive/media/storage. 6. Admin portal and backups. 7. Hardening, a11y, SEO, tests, docs, completion report.
