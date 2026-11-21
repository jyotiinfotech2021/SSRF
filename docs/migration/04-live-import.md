# Live data import (21 November 2026)

The prototype's live database (the claude.ai artifact the foundation edits) was read through its shared-database interface and saved under `export/live/` (git-ignored). `export/ssrf-database-2026-11-21.json` is the same content in the importer's backup format.

Imported with the never-overwrite importer: 51 library items and videos, 30 quiz questions, 10 recognition entries, 4 events, 2 stories, 1 source, 1 member profile, 1 site setting.

Reconciliation:
- The earlier web-research seed entries for the same items (different ids) were removed after a full database dump (`export/pre-live-import-2026-11-21.sql`): 2 books, 5 recognition entries, 4 events, 2 stories. Seed items with no live counterpart were kept.
- `goa-2` gained its third citation (Khera 1974) and source `rajputs` its research note, both from the live copy.
- Chapters `goa` and `rajasthan` are marked active, as in the live data.
- Records not changed: claims, campaigns, entities, archive, sources (identical in content).

English only: records keep their original text. Pages show the English part of a title; videos with Hindi-only titles are labelled "Hindi-language video from <site>". Research notes that quote a Hindi spelling are shown as written.

Not recoverable from the live database: uploaded file bytes (book covers, archive scans, the portrait). Covers use designed placeholders until the files are re-uploaded.
