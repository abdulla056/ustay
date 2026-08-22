# `(dashboard)` — owner dashboard

The homeowner's lightweight CMS at `/dashboard/**`: properties, rooms, media, bookings, inquiries,
availability, template/theme selection, analytics, settings.

Owns a productivity-first `+layout.svelte` (UST-57): a persistent sidebar (`Wordmark` + a nav list)
above `md`, collapsing to a horizontal scrolling strip below it, plus a top bar showing the
signed-in user and a sign-out affordance. Dense spacing, standard `text-*` sizes, no cinematic
scroll — deliberately not the marketing chrome. Optimise for _getting the task done_, not for
atmosphere.

Only `/dashboard` exists as a real page today. The other nav items (Properties, Bookings, Media,
Settings) are placeholders — real hrefs that currently 404, marked with a "Soon" badge — kept
visible so the information architecture reads correctly before the sections themselves land.

**Authorisation is enforced in `src/hooks.server.ts`**, not here: a layout `load` does not run before
a form action, so a layout-only guard would leave every action open. The group layout's
`+layout.server.ts` only loads `locals.user` for rendering. See `docs/ARCHITECTURE.md`.

**Sign-out** posts to `/dashboard?/signOut` — a form action on `dashboard/+page.server.ts`, since a
layout cannot hold one; the sidebar's form names that absolute path so it works from any page in the
group. The action calls `auth.api.signOut()` directly rather than POSTing better-auth's own
`/api/auth/sign-out` endpoint, so it can redirect to `/sign-in` itself: `sveltekitCookies` in
`$lib/server/auth.ts` still clears the session cookie correctly, by replaying better-auth's
`Set-Cookie` onto this request via `getRequestEvent()`.
