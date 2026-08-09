# `(microsite)` — per-property branded sites

Each property's own site, served at `/stays/[property]` (the slug URL fixed by `docs/DATABASE.md`),
with sub-pages such as `/stays/[property]/rooms` and `/stays/[property]/experiences`.

This is a **separate group from `(platform)` on purpose**: a microsite must read as the property's
own website, so it gets its own `+layout.svelte` with property-scoped navigation, wordmark, and
theme. Because groups are siblings under `src/routes/+layout.svelte`, nothing here inherits the
platform header/footer — no `+layout@.svelte` reset is needed.

Templates and sections come from `$lib/features/microsite`; owners pick a template, they do not
design pages. See `PROJECT_CONTEXT.md` and `docs/ARCHITECTURE.md`.
