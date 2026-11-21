# Sagat Singh Research Foundation: production application

Converted from the SSRF claude.ai prototype (`prototype/`, kept as the design reference). Visual identity is unchanged (`apps/web/app/ssrf.css` is the prototype stylesheet).

- `apps/api`: ASP.NET Core Web API (.NET 10), EF Core, PostgreSQL, Identity. Tests in `apps/api/Ssrf.Api.Tests`.
- `apps/web`: Next.js + TypeScript.
- `docs/`: architecture, database, api, migration (inventory and **completion report**), testing, deployment.
- `ops/`: backup job and restore drill. `docker-compose.yml`, `.env.example`.

Start with `docs/migration/02-completion-report.md` for what is done and what is not.
