# Data migration and validation

## Procedure
1. In the prototype, signed in as owner, use the portal's **Database backup** (JSON), plus the CSV and media backups. Put the files in `export/` (git-ignored, read-only source).
2. Start the stack, register the admin (`ADMIN_EMAIL`), sign in.
3. Administration tools -> **Import prototype data** and choose the JSON (or `POST /api/editorial/import`). Both the full backup (format "SSRF database backup", version 3) and `snapshot.json` are accepted.
4. Read the report: `read`, `imported`, `alreadyPresent`, `warnings`, `errors` per collection. `read` must equal `imported + alreadyPresent`. Warnings list anything that did not line up (for example a citation to an unknown source id); nothing is dropped.
5. For each real contributor account, administrator links it to its prototype uid (Users table). Ownership of imported work moves to the account.
6. Uploaded files: the importer creates `Files` rows with `LegacyAssetId` and `LegacyUrl`. Copy the bytes from the media backup into object storage and set `StorageKey` (a media loader keyed by `LegacyAssetId` is the remaining step; see the completion report). Until then those files show as catalogued but unavailable, they are not silently removed.

## Guarantees (covered by automated tests)
- Idempotent: re-running imports nothing new and overwrites nothing.
- Lossless: every document is copied to `LegacyRecords`; unmapped fields live in `Data`; a submission's review fields (`note`, `publishedAs`, ...) are kept under `data._legacyReview`.
- Orphan citations are kept and reported.
- Private profiles never appear in public endpoints; only opted-in members are listed.
- Revisions, submissions and media are imported once (a second run skips them).

## Validation done on this machine
Only the public snapshot was available, so only that was imported and verified: 21 sources, 3 campaigns, 23 claims (62 citations), 13 entities, 7 chapters; counts equal the file. The live data (members, stories, submissions, archive, uploads, revision history since launch) has **not** been migrated because it has not been exported yet.
