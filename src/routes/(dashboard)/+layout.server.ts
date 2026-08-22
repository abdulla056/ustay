import type { LayoutServerLoad } from './$types';

/**
 * `docs/ARCHITECTURE.md`: authorisation lives in `hooks.server.ts`, not here — by the
 * time this `load` runs, `handleRouteGuard` has already turned an anonymous visitor
 * away. This just hands `locals.user` (never `null` in practice for this group) to
 * `+layout.svelte` so the top bar can render who is signed in.
 */
export const load: LayoutServerLoad = ({ locals }) => {
	return { user: locals.user };
};
