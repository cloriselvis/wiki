# Scripts

- `sync-obsidian-books.ps1`: Sync Markdown book notes from the old Obsidian vault into `raw/imports/obsidian-books/`.
- `stage-imported-books.mjs`: Keep only imported book notes with `progress >= 95%` in `raw/imports/obsidian-books-ready/` for later ingest through the normal `CLAUDE.md` workflow. It does not write to `wiki/`.
