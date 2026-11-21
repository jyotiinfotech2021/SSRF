# API reference (ASP.NET Core, base path `/api`)

Auth is a cookie (`ssrf.auth`, HttpOnly, SameSite=Strict, Secure in production). Every non-GET request must send `X-Requested-With` (CSRF defence in depth). The web app proxies `/api/*` so browser and API are same-origin. In development `GET /openapi/v1.json` describes the API.

## Auth
| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/auth/register` | anyone (rate limited) | create account, role Member; the address in `Bootstrap:AdminEmail` becomes Admin |
| POST | `/auth/login`, `/auth/logout`, GET `/auth/me` | | lockout after 5 failures for 15 min |

## Public reads
`GET /campaigns`, `/campaigns/{id}`, `/claims?scope=`, `/sources`, `/entities`, `/chapters`, `/quiz`, `/site`, `/books`, `/places`, `/events`, `/stories` (published only), `/stories/{id}`, `/archive`, `/archive/{id}` (files hidden for restricted items unless editor), `/members` (opted-in only), `/revisions?target=`, `/events/{id}/media`, `/events/{id}/attendees`, `/stories/{id}/salutes`, `/salutes/counts`, `/search?q=`, `/files/{id}` (restricted files editors only), `/health`.

## Member (signed in)
| Method | Path | Purpose |
|---|---|---|
| GET/PUT/DELETE | `/me/profile` | create/update/leave (private profile + optional public listing; adult confirmation, photo consent) |
| GET | `/me/submissions`, `/me/salutes`, `/me/attendance` | |
| POST | `/submissions` | `{kind, data}`. correction/privacy/access: any member. story/book/place/event/archive: Contributor+ |
| POST | `/submissions/{id}/resubmit`, `/withdraw` | |
| POST | `/stories/{id}/salute`, `/events/{id}/attend` | toggles |
| POST | `/files` | upload (Contributor+, 20 MB, type allow-list, SHA-256 recorded) |
| POST/DELETE | `/events/{id}/media`, `/media/{id}` | credit required |

## Editorial (Editor/Admin), `/editorial/...`
`GET queue`, `POST submissions/{id}/assign`, `POST submissions/{id}/decide` (actions: advance, publish, evidence, reject/decline, resolve, apply, coi, anonymise, deleteData, withdrawItem, complete; needs conflict-of-interest confirmation; refuses own work; notes required where the prototype required them), `PUT claims/{id}`, `PUT entities/{id}`, `PUT campaigns/{id}/{field}`, `PUT text/{col}/{id}`, `PUT chapters/{id}`, `PUT status/{col}/{id}` (not on own entry), `PUT archive/{id}/transcript`, `PUT events/{id}/report`, `POST archive`, `POST events`, `DELETE {col}/{id}`, `POST sources`, `POST/PUT/DELETE quiz`, `PUT site/settings`, `PUT/DELETE site/portrait`, `GET members/{id}/private`.

## Admin only
`GET users`, `PUT users/{id}/roles`, `POST users/{id}/link-legacy`, `POST import` (prototype backup or snapshot; idempotent), `GET backup/json`.

Every edit, decision, deletion and import writes a `Revisions` row.
