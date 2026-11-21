# Testing

## Automated (apps/api/Ssrf.Api.Tests, xUnit)
Starts the real API against a throw-away PostgreSQL database (`TEST_PG` connection prefix, default the dev container on port 25432), applies migrations, drops the database afterwards.

```powershell
docker run -d --name ssrf-pg-dev -e POSTGRES_PASSWORD=devpass-local -p 127.0.0.1:25432:5432 postgres:17
cd apps/api; dotnet test
```

Result on 21 Nov 2026: **21 passed, 0 failed.** Covered:
- anonymous and member access to editorial endpoints (401/403), CSRF header, password rules, admin cannot demote self;
- snapshot import: counts equal the file, idempotent, claims served with citations;
- full backup import: every collection, orphan citation flagged, unmapped fields kept, private profile never public, restricted archive files hidden, review notes preserved, re-run does not duplicate;
- contribution hidden until published; author cannot review own item; conflict-of-interest confirmation and note rules; first-hand story stays "Oral history"; decision logged;
- correction applied with before/after revision; claim edit rejects unknown sources and classifications;
- profile listing and unlisting, adult confirmation;
- sign-up with a plain 8-character password, duplicate email and common-password messages, one generic login error;
- forgot/reset password: same answer for known and unknown emails, single-use emailed link, forged token and weak password refused (and a refused attempt does not burn the link), lockout cleared by a reset, one email per address per minute;
- rate limiting protects only the credential endpoints, so normal browsing never looks signed out.

Bugs the tests and manual runs caught and fixed: a new connection pool per request (exhausted Postgres), a link rule wrongly applied to a correction's free-text source, validation attributes on record properties (500 on register), a false-pass in the restore script.

## Front end
`npm run lint` (0 errors) and `npm run build` pass. All 24 routes return 200 and unknown paths 404. Manual: home, campaign, review pages, sign-in, mobile width. **No Playwright suite yet.**

## Restore drill
`./ops/restore-test.ps1` dumps, restores to a scratch database and compares every table. It fails on any mismatch or non-numeric count.
