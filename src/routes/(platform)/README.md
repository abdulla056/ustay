# `(platform)` — ustay.com, traveler-facing

The Ustay-branded platform: home (`/`), destination pages (`/destinations/[destination]`), the stay
index and search (`/stays`), and editorial/marketing pages.

Owns the **platform chrome** in `+layout.svelte` — global header/footer, the Lenis scroll container,
and the dark→light tonal scroll from `DESIGN.md`. Anything that should feel like _Ustay_ rather than
like an individual property belongs here.

Note `/stays` (the index) lives here while `/stays/[property]` lives in `(microsite)` — a property
page wears the property's chrome, not ours. See `docs/ARCHITECTURE.md`.
