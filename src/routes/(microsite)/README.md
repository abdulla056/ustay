# `(microsite)` — per-property branded sites

Each property's own site, served at `/s/[slug]` (decision 5 in `docs/DECISIONS.md`; `/stays/<slug>` is not a route),
with future sub-pages such as `/s/[slug]/rooms`. A retired slug 301s to the current one.

This is a **separate group from `(platform)` on purpose**: a microsite must read as the property's
own website, so it gets its own `+layout.svelte` with property-scoped navigation, wordmark, and
theme. Because groups are siblings under `src/routes/+layout.svelte`, nothing here inherits the
platform header/footer — no `+layout@.svelte` reset is needed.

Templates and sections come from `$lib/features/microsite`; owners pick a template, they do not
design pages. See `PROJECT_CONTEXT.md` and `docs/ARCHITECTURE.md`.
