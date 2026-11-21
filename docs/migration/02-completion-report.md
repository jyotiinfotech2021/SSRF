# Migration completion report

Status date: 21 Nov 2026. Source: prototype v51 (`prototype/ssrf-portal-source`). **This is a working production codebase, not a finished product: the open items at the bottom matter, above all that live data has not been migrated yet.**

Test status key: **API-T** = automated xUnit integration test (12 tests, all passing). **Run** = exercised by hand against the running stack. **Build** = compiles and renders (route returns 200, lint clean) but its interactive behaviour was not exercised. **Not done** = not implemented.

## Views
| Prototype view | New route | API | Entities | Status |
|---|---|---|---|---|
| home | `/` | campaigns, events, stories, archive, site | several | Run (simplified: no quiz teaser or statistics tiles) |
| life | `/biography` | `GET /claims?scope=life` | Claims, ClaimCitations, Sources | Run; API-T (import, correction, claim edit) |
| campaigns | `/campaigns`, `/campaigns/[id]` | `/campaigns`, `/claims`, `/entities` | Campaigns, Claims, Entities | Run; **SVG maps Not done** |
| people | `/people` | `/entities` | Entities | Build |
| archive | `/archive`, `/archive/[id]` | `/archive`, `/archive/{id}`, `/files/{id}` | ArchiveItems, ArchiveFiles, Files | API-T (restricted files hidden); page Build |
| library | `/library` | `/books` | Books | Build |
| videos | `/videos` | `/books` (kind video/lecture) | Books | Build; mapping to the prototype's videos is an assumption (VERIFY) |
| sources | `/sources` | `/sources`, `POST /editorial/sources` | Sources | Build; claim-edit source validation API-T |
| stories | `/stories`, `/stories/[id]` | `/stories`, salute | Stories, Salutes | API-T (hidden until published); page Run |
| members | `/members` | `/members` | Members | API-T (only opted-in listed) |
| chapters | `/chapters` | `/chapters`, `/members`, `/events` | Chapters | Build (simplified) |
| learn | `/learn` | `/quiz`, quiz admin | Quiz | Build; **certificate download Not done** |
| events | `/events` | `/events`, attend, media, report | Events, Attendances, Media | Build |
| recognition | `/recognition` | `/places`, status | Places | Build; own-entry rule API-T |
| about | `/about` | `/site`, settings | Site | Build |
| account | `/account` | auth, `/me/*`, `/submissions` | Identity, MemberPrivates, Submissions | Run (sign-in); profile and privacy API-T |
| search | `/search` | `/search` | many | Run |
| review | `/admin/review` | `/editorial/queue`, assign, decide | Submissions, Revisions | Run (empty queue); decision logic API-T |
| (new) | `/admin/tools` | users, roles, import, backup, portrait | Identity, LegacyRecords | Build; import and roles API-T |

## Forms and actions
| Prototype | New implementation | Status |
|---|---|---|
| joinForm, privacyForm, leave | `PUT/DELETE /me/profile`, `POST /submissions` (privacy) | API-T (adult confirmation, unlisting) |
| storyForm, bookForm, placeForm, eventForm, archiveForm | `ContributeForm` -> `POST /submissions`; editors save events/archive directly | API-T (role gate, hidden until published); UI Build |
| corrForm | `CorrectionBox` -> `POST /submissions` kind correction | API-T |
| decide (advance/publish/evidence/reject/resolve/apply/coi/anonymise/deleteData/withdrawItem/complete) | `POST /editorial/submissions/{id}/decide` | API-T for publish, own-work, COI confirmation, note rule, apply+revision; others Build |
| assign | `POST .../assign` | Build |
| claimForm, entityForm, campForm, transForm, chapterForm, settingsForm, reportForm, statusForm, sourceForm, qForm | `/editorial/*` PUT/POST | claimForm and statusForm API-T; rest Build |
| portraitForm | `PUT/DELETE /editorial/site/portrait` (rights + credit required) | Build |
| mediaForm / upload | `POST /files`, `POST /events/{id}/media` | Build; file bytes upload not exercised |
| salute, attend | toggles | Run (salute via API) |
| accessForm | `POST /submissions` kind access | API-T (role) |
| backupJson | `GET /editorial/backup/json` (Admin) | Build; backupCsv and backupMedia **Not done** (database-level backup replaces them) |
| restoreMissing | `POST /editorial/import` (never overwrites) | API-T |
| resub (revise after evidence request) | `POST /submissions/{id}/resubmit` | API only; **UI Not done** |
| certForm (quiz certificate) | | **Not done** |
| researchMode (editor view of hidden citations) | | **Not done** |

## Platform dependencies
| claude.use | Replacement | Status |
|---|---|---|
| db | PostgreSQL + EF Core, REST API | Done |
| user | ASP.NET Identity, roles Admin/Editor/Contributor/Member | Done; email confirmation and password reset **Not done** (needs a mail provider) |
| assets | `IObjectStorage` (local disk implemented; S3-compatible provider **Not done**), metadata + SHA-256 | Done for local |
| downloads | server-side backup endpoint, restore script | Partial |

## Quality requirements
| Requirement | State |
|---|---|
| Responsive | Checked at 375 px: no horizontal overflow |
| Accessible | Skip link, labelled forms, aria on tabs, live regions; **no formal audit or screen-reader test** |
| SEO | Server-rendered pages, per-page titles and descriptions, `sitemap.xml`, `robots.txt` |
| Secure auth | Hashed passwords (Identity), lockout, rate limit on auth, SameSite=Strict cookie, CSRF header, role policies (API-T) |
| No hardcoded secrets | Connection string, admin email and site URL come from environment; `.env.example` only |
| API validation | Link rules, role gates, enum checks, size and type allow-list on uploads |
| Automated tests | 12 API integration tests passing. **No front-end or browser tests yet** (lint and production build only) |
| Backup and recovery | Nightly `pg_dump` job in compose; restore drill script run for real: 31 tables, 214 rows identical after restore |
| Docker | Dockerfiles and compose written; image build result recorded in docs/deployment |

## Open items (in priority order)
1. **Live data not migrated.** Export from the prototype is still needed (see 01-data-migration.md). Until then, members, stories, submissions, archive items, uploads and post-launch revisions exist only in the old system.
2. **Access rules.** The prototype's 27 publish-time rules were not available; permissions are reconstructed from the code. Compare against the originals before go-live.
3. **Uploaded file bytes** need a loader that maps `LegacyAssetId` to the media backup.
4. Campaign **SVG maps**, quiz **certificate**, revise-and-resubmit **UI**, editor **research mode**.
5. Front-end automated tests (Playwright) and an accessibility audit.
6. Production extras: S3 provider, email (confirmation, reset, notifications), TLS termination, monitoring.
7. Historical content was not edited or extended. Anything marked "Not yet researched" in the seed stays that way until the historians write it.
