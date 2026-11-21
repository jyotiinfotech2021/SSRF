# SSRF prototype: feature inventory (Phase 0)

Source: `prototype/ssrf-portal-source` (published v51, 20 Nov 2026). Snapshot dated 17 Nov 2026.
Method: read `core.js` in full; extracted views, forms, actions, collections and write calls from `views.js` / `ops.js` by search. Items marked VERIFY need a line-by-line read before their API is built.

## 1. Views -> routes
| Prototype view (hash) | Next.js route | Data needed |
|---|---|---|
| home | `/` | events, stories, archive, quiz, books, places, site |
| life (alias timeline) | `/biography` | claims (scope=life), revisions |
| campaigns | `/campaigns/[id]` (goa, nathula, meghna) | claims, entities, stories, books, places, events, archive, revisions; SVG maps from `cmaps.js` |
| people | `/people` | entities (type person/unit) |
| archive | `/archive`, `/archive/[id]` | archive, archiveFiles, revisions |
| library | `/library` | books, revisions |
| videos | `/videos` | books (kind "Documentary or video") |
| sources | `/sources` | sources, places |
| stories | `/stories`, `/stories/[id]` | stories, salutes, revisions |
| members | `/members` | members, chapters, stories, archive |
| chapters | `/chapters/[id]` | chapters, members, events, stories, archive, media |
| learn | `/learn` | quiz |
| events | `/events` | events, media, attend, chapters |
| recognition (alias places) | `/recognition` | places, revisions |
| about | `/about` | site |
| account (aliases join, profile) | `/account` | subs, stories, archive, chapters, member profile |
| search | `/search` | entities, stories, books, places, events, archive, members |
| review | `/admin/review` (editors only) | all submissions + admin data |

Navigation groups: Explore history / Research and archives / Community / Learning / Events and recognition / About SSRF.

## 2. Forms -> APIs (25 forms)
accessForm, archiveForm, bookForm, campForm, certForm, chapterForm, claimForm, entityForm, eventForm, joinForm, mediaForm, placeForm, portraitForm, privacyForm, qForm, reportForm, sourceForm, statusForm, storyForm, transForm; search forms: searchForm, docSearch, libSearch, srcSearch. VERIFY purpose of accessForm, certForm, reportForm, statusForm, transForm.

Other actions (data-act, 60): salute, attend, leave, correct (correction request), edit/cancelEdit, del, unpublish, withdrawSub, resub, setAssess, researchMode, backupCsv/backupJson/backupMedia, restoreMissing, removePortrait, delMedia, quiz actions (qStart/qPick/qReveal/qHint/qNext/qSet/qEdit/qDel/qTeacher), probe (access check), filters/paging (more, clear*).

## 3. Collections -> entities (13 + support)
claims, campaigns, sources, places, books, archive, events, chapters, members, site, revisions, quiz, stories (declared); plus used in code: entities, memberPrivate, subs/{uid}/items (submissions), media/{uid}/items, archiveFiles, salutes, attend.
Snapshot content: 23 claims, 3 campaigns, 21 sources, 13 entities, 7 chapters (seed only).

## 4. Enumerations to preserve (core.js)
Evidence assessment (documented, corroborated, attributed, unverified, disputed); source nature (5); verification status (6); editorial stages (submitted, screening, research, factcheck, approval, evidence, published, rejected, resolved, withdrawn); member categories (9); story kinds; eras (7); book kinds (10); recognition kinds (9); event types (3); archive categories and collections (8); rights statements (4); quiz topics/levels. Source ranking and the hidden "incorrect/error" citation rule (`rankCites`) must be ported.

## 5. Platform dependencies to replace
| claude.use | Used for | Replacement |
|---|---|---|
| db | Firestore-style collections, realtime snapshots, 27 access rules | PostgreSQL + EF Core, REST API, authorization policies (polling/SSE instead of realtime) |
| user | isOwner/canEdit -> `isAdmin`; uid | ASP.NET Core Identity, roles Admin/Editor/Contributor/Member |
| assets | uploads at `/_blob/<id>` | `IObjectStorage` (local disk + S3-compatible), metadata + SHA-256 in DB |
| downloads | JSON/CSV/media zip backups | server-side export endpoints (admin) |

## 6. Rules logic to port (stated in code)
- Editors cannot review their own contribution; two family members cannot review each other (ops.js ~l.11-14).
- Weak assessments (attributed/unverified/disputed) shown distinctly; first-hand provenance defaults: first -> Oral history/attributed, family -> Family testimony/attributed, research -> Secondary research/unverified.
- Revision log with before/after and reason; correction requests with source.
- Contributions are hidden until editors approve; private member data separated (`memberPrivate`).

## 7. Gaps that block a lossless migration
1. **Live database content is not in the zip.** Only the public snapshot is. Members, stories, submissions, archive, uploads and revisions created since launch exist only in the claude.ai database. I need an export via the portal's backup (backupJson/backupCsv/backupMedia) by an owner. I will not invent data.
2. **The 27 access rules are declared at publish time and are not in the source.** I will reconstruct from code behaviour and ask you to confirm; the rule text from the publish step would be better.
3. `tools/*.py` need Python, which is not installed here; `build.py` also. Node, .NET 10 and Docker are present; psql is not (use Postgres in Docker).
4. The prototype has no reviewed-by-historian pass in the snapshot; nothing will be marked "verified" by migration unless the source record says so.
