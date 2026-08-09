# `(auth)` — sign in, sign up, account recovery

Our own credential **pages**: `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`. A bare,
centred `+layout.svelte` with no header/footer, so nothing competes with the form.

better-auth's own **endpoints** are not routes in this group — `svelteKitHandler` in
`src/hooks.server.ts` mounts them under `/api/auth/*`. Do not hand-write route files for them.
