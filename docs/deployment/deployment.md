# Deployment and recovery

## Local development
```powershell
docker run -d --name ssrf-pg-dev -e POSTGRES_PASSWORD=devpass-local -e POSTGRES_DB=ssrf -p 127.0.0.1:25432:5432 postgres:17
$env:ConnectionStrings__Default="Host=localhost;Port=25432;Database=ssrf;Username=postgres;Password=devpass-local"
$env:Bootstrap__AdminEmail="you@example.org"; $env:ASPNETCORE_ENVIRONMENT="Development"; $env:ASPNETCORE_URLS="http://localhost:5080"
cd apps/api/Ssrf.Api; dotnet run          # migrates the database on start in Development
cd apps/web; $env:API_URL="http://localhost:5080"; npm run dev
```
(Port 54329 was blocked by a Windows reserved range on the development machine, hence 25432.)

## Production stack
`docker compose up -d --build` after copying `.env.example` to `.env`. Services: `db`, `api` (migrates on start), `web`, `backup` (nightly dump + uploads archive, 14-day retention). Put a TLS-terminating reverse proxy in front of `web:3000`; the API is not published. Set `SITE_URL` to the public https address. Cookies are `Secure` in Production.

## Password reset email
"Forgot password?" sends a one-time link (valid 24 hours, usable once). It needs an SMTP server: set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` and `SMTP_FROM` in `.env` (any provider: your mail host, SES, SendGrid SMTP, Gmail app password). With no `SMTP_HOST` the forgot-password page tells people honestly that reset by email is not set up. Links are built from `SITE_URL`.
Answers never reveal whether an email has an account, and at most one reset email per address per minute is sent. Rate limiting applies only to register, login, forgot and reset, per visitor address (taken from X-Forwarded-For when `Proxy__TrustForwardedHeaders` is true).
Tested end to end on 21 Nov 2026 against a local test mailbox (real SMTP): request, delivery, new password, old password refused, link single-use.

## Backup and recovery
- Nightly: `pg_dump --format=custom`, uploads tarball, SHA-256, dump verified with `pg_restore --list`.
- Copy `backups/` off the host (encrypted); the dumps contain private member data.
- Restore: create an empty database, `pg_restore --no-owner -d ssrf file.dump`, untar uploads into the storage volume, start the API.
- Drill: `./ops/restore-test.ps1` (run on the dev database on 21 Nov 2026: 31 tables, 214 rows identical).
- Administrators can also download a JSON backup from the Administration page.

## Verified
Both images (`apps/api`, `apps/web`) build successfully with `docker build` (21 Nov 2026). The first API build failed because the Windows `obj/` folder was copied in; fixed with `**/obj/` in `.dockerignore`. The full `docker compose up` stack has **not** been run end to end.

## Not yet in place
S3-compatible storage provider, monitoring/alerting, email, and a CI pipeline.
