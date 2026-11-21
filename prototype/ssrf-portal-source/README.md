# SSRF portal: source files

Source for the Sagat Singh Research Foundation portal, as published on claude.ai (Version 51, 20 November 2026).

## Build

    python3 build.py

This writes `dist/ssrf-portal.html`, a single self-contained page. The copy in `dist/` is already built and matches the live version.

## Layout

| File | What it holds |
|---|---|
| `src/head.html` | Document head: title, meta tags, font links |
| `src/body.html` | Page shell: top bar, navigation, `<main>`, footer and toast containers |
| `src/ssrf.css` | The single stylesheet: tokens, base, layout, components, page sections, then responsive rules (breakpoints 900 / 760 / 600 px) |
| `src/core.js` | State object `S`, data loading, access to the platform capabilities, routing helpers, evidence labels and source ranking |
| `src/cmaps.js` | Campaign map geometry (Goa, Sikkim, East Pakistan) projected to SVG paths |
| `src/views.js` | One render function per page (`VIEWFN.home`, `VIEWFN.campaigns`, ...), plus maps, charts, footer |
| `src/ops.js` | Event handlers, forms, editing, uploads, review queue, quiz |
| `src/snapshot.json` | Saved copy of public content shown to signed-out visitors |
| `tools/` | Maintenance scripts used during development (see below) |

`build.py` concatenates the four JS files in the order above and inserts `snapshot.json` in place of `__SNAPSHOT__` in `core.js`.

## Platform dependencies

The page runs on the claude.ai artifact runtime (contract 0.2.96) and uses four capabilities through `claude.use(name)`:

- `db`: shared database. Collections: claims, campaigns, sources, places, books, archive, events, chapters, members, site, revisions, quiz, stories. The access rules (27) are declared at publish time.
- `user`: identity of the viewer and editor rights.
- `assets`: uploaded files (images, PDFs), served at `/_blob/<id>`.
- `downloads`: saving generated files.

When a capability is unavailable (signed-out visitor, or the page opened as a plain file) the code falls back to `snapshot.json` and shows a read-only copy. To host the portal independently, replace these four calls in `core.js` and `ops.js` with a backend of your choice (for example Firebase or Supabase) and export the database contents.

## Tools (not needed to build)

- `tools/consolidate.py`, `tools/css_header.css`: one-off script that merged the earlier layered stylesheets into `ssrf.css`.
- `tools/geo_build.py`: regenerates `cmaps.js` from DataMeet state boundaries and Natural Earth country outlines.
- `tools/v3test.js`: headless test of every page with a mock database.
- `tools/shots.js`, `tools/stylall.js`, `tools/cmp.py`: screenshot and computed-style regression checks.

These scripts contain absolute paths from the development workspace; adjust them before use.

## Credits

India boundary: DataMeet (CC BY 4.0). Country outlines and rivers: Natural Earth (public domain).
