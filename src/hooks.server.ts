import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { building } from '$app/environment';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { auth } from '$lib/server/auth';
import { guardRoute } from '$lib/server/auth-guard';

/**
 * better-auth's own endpoints under `/api/auth/*` (`docs/ARCHITECTURE.md`: no route files for
 * them). `svelteKitHandler` answers those itself and only calls `resolve` for everything else —
 * so it sits **first** in the sequence, and the two handles below never run for an auth endpoint.
 * better-auth resolves its own session there; paying for ours as well would be waste.
 */
const handleAuthApi: Handle = ({ event, resolve }) =>
	svelteKitHandler({ event, resolve, auth, building });

/**
 * One session lookup per request, onto typed `event.locals` (`src/app.d.ts`) — every `load`,
 * action and endpoint downstream reads it instead of calling better-auth again.
 */
const handleSession: Handle = async ({ event, resolve }) => {
	// A session cannot exist without a cookie, so anonymous traffic (crawlers, most `(platform)`
	// page views) skips the round-trip entirely.
	const session = event.request.headers.has('cookie')
		? await auth.api.getSession({ headers: event.request.headers })
		: null;

	event.locals.session = session?.session ?? null;
	event.locals.user = session?.user ?? null;

	return resolve(event);
};

/**
 * The authorisation boundary. In `handle` rather than a group's `+layout.server.ts` because a
 * layout `load` does not run before a form action — a layout-only guard would leave every `POST`
 * under `(dashboard)` open while looking secure. The decision itself is pure and lives in
 * `$lib/server/auth-guard.ts`; this only turns it into a redirect.
 */
const handleRouteGuard: Handle = ({ event, resolve }) => {
	const decision = guardRoute({
		routeId: event.route.id,
		hasSession: event.locals.session !== null,
		intendedPath: event.url.pathname + event.url.search
	});

	if (decision.action === 'redirect') redirect(decision.status, decision.location);

	return resolve(event);
};

export const handle: Handle = sequence(handleAuthApi, handleSession, handleRouteGuard);
