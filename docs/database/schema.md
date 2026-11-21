# Database schema (PostgreSQL, EF Core migrations in `apps/api/Ssrf.Api/Data/Migrations`)

Design rule: nothing from the prototype is discarded. Typed columns exist for what is queried, filtered or enforced; every other field stays in a `Data` jsonb column; and each imported source document is also kept verbatim in `LegacyRecords`.

| Prototype collection | Table | Notes |
|---|---|---|
| sources | `Sources` | id kept (e.g. `book`, `wiki`) so existing citations still resolve |
| claims | `Claims`, `ClaimCitations` | `cites[{s,loc}]` become ordered rows; **no FK on SourceId** so an unknown id from history is kept and reported, never dropped |
| campaigns | `Campaigns` | name/order typed; background, chronology, command, milestones etc. in `Data` jsonb |
| entities | `Entities` | people and units; `Camps`, `Cites` as text[] |
| chapters | `Chapters` | purpose as text[] |
| stories, books, places, events, archive | `Stories`, `Books`, `Places`, `Events`, `ArchiveItems` | shared `ContentItem` columns: author, status, nature, assessment, reviewer, camps, `Data` |
| quiz | `Quiz` | |
| site | `Site` | key + jsonb (settings, portrait) |
| members | `Members` | public directory entry, only when the member opted in |
| memberPrivate | `MemberPrivates` | full private profile; never returned by public endpoints |
| subs/{uid}/items | `Submissions` | status, priority, assignee, due, COI list, `History` jsonb (with `prev` on resubmission) |
| revisions | `Revisions` | append-only; before/after text and reason |
| assets (`/_blob/id`) | `Files` + object storage | name, type, size, SHA-256, uploader, `Restricted`, `LegacyAssetId`, `LegacyUrl` |
| media/{uid}/items | `Media` | event photo/video/link with credit |
| archive files | `ArchiveFiles` | links archive item to `Files`, ordered |
| salutes, attend | `Salutes`, `Attendances` | composite keys |
| user | ASP.NET Identity tables (`AspNetUsers`, roles) | `LegacyUid` links an account to imported contributions |
| (all of the above) | `LegacyRecords` | verbatim JSON of every imported document: audit trail |

## Evidence and verification vocabularies
Stored as strings exactly as the prototype used them: assessments (documented, corroborated, attributed, unverified, disputed), source nature (5 values), verification status, editorial stages. Validation of allowed values lives in the API.

## Keys and ownership
Contribution ownership is the owner id string. Imported records keep the prototype uid. An administrator links a real account with `POST /api/editorial/users/{id}/link-legacy`, which re-points submissions, stories, archive, books, places, events, member profile, salutes, attendance and media in one operation.
