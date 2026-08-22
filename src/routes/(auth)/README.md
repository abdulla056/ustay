# `(auth)` — sign in, sign up, account recovery

Our own credential **pages**: `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`. A bare,
centred `+layout.svelte` (UST-57) with no header/footer, so nothing competes with the form: a
`Wordmark` linking home, a centred card (hairline frame per the DESIGN.md tokens) that each page's
content renders inside of, and a minimal footer line. No nav, no motion.

better-auth's own **endpoints** are not routes in this group — `svelteKitHandler` in
`src/hooks.server.ts` mounts them under `/api/auth/*`. Do not hand-write route files for them.
