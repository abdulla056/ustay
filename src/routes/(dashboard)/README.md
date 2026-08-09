# `(dashboard)` — owner dashboard

The homeowner's lightweight CMS at `/dashboard/**`: properties, rooms, media, bookings, inquiries,
availability, template/theme selection, analytics, settings.

Owns a productivity-first `+layout.svelte` (persistent sidebar, denser type, no cinematic scroll) —
deliberately not the marketing chrome. Optimise for _getting the task done_, not for atmosphere.

**Authorisation is enforced in `src/hooks.server.ts`**, not here: a layout `load` does not run before
a form action, so a layout-only guard would leave every action open. The group layout may still load
the current user for rendering. See `docs/ARCHITECTURE.md`.
