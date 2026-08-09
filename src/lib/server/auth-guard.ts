/**
 * Route-group authorisation as a **pure decision function** (UST-49).
 *
 * `docs/ARCHITECTURE.md` puts route protection in `handle`, not in a group's `+layout.server.ts`:
 * a layout `load` does not run before a form action, so a layout-only guard leaves every `POST`
 * in the subtree open while looking secure. `src/hooks.server.ts` is therefore the only caller —
 * this module just answers "given this route and this session state, allow or redirect where?".
 *
 * Deliberately dependency-free: no `$env`, no `db`, no `@sveltejs/kit`. That is what keeps it
 * unit-testable with no database and no request (`auth-guard.test.ts`), per `docs/DATABASE.md`.
 */

/** Where an unauthenticated visitor to a protected route is sent. */
export const SIGN_IN_PATH = '/sign-in';

/** Where a visitor who is already signed in is sent when they open an `(auth)` page. */
export const DASHBOARD_PATH = '/dashboard';

/** Query parameter carrying the destination the visitor originally asked for. */
export const REDIRECT_TO_PARAM = 'redirectTo';

/**
 * 303, not 302/307: a guarded `POST` (form action) must be replayed as a `GET` of the sign-in
 * page. 307 would re-send the body to `/sign-in`, and 302's behaviour is historically ambiguous.
 */
export const REDIRECT_STATUS = 303;

/** Route groups that require an authenticated session. */
const PRIVATE_GROUPS = ['(dashboard)'];

/** Route groups that only make sense while signed out. */
const ANONYMOUS_ONLY_GROUPS = ['(auth)'];

/**
 * Sentinel base for resolving a candidate redirect. Any candidate that resolves to a different
 * origin is somebody else's site, i.e. an open redirect.
 */
const LOCAL_ORIGIN = 'https://redirect.invalid';

export type RouteGuardInput = {
	/** `event.route.id`, e.g. `/(dashboard)/dashboard/properties/[property]`. `null` when no route matched. */
	routeId: string | null;
	/** Whether the request carries a valid better-auth session. */
	hasSession: boolean;
	/** `event.url.pathname + event.url.search` — where the visitor was heading. Untrusted. */
	intendedPath?: string | null;
};

export type RouteGuardDecision =
	| { readonly action: 'allow' }
	| {
			readonly action: 'redirect';
			readonly status: typeof REDIRECT_STATUS;
			readonly location: string;
	  };

const ALLOW = { action: 'allow' } as const satisfies RouteGuardDecision;

/** Route ids carry their groups as literal `(name)` segments, so match segments — not prefixes. */
function inGroup(routeId: string, group: string): boolean {
	return routeId.split('/').includes(group);
}

/**
 * Narrow an untrusted string to a same-origin path, or `null`.
 *
 * Rejects absolute URLs, protocol-relative `//evil.com`, backslash variants (browsers and the
 * WHATWG URL parser treat `\` as `/`), and anything with control characters (header injection).
 * The value returned is the *resolved* path — `/a/../b` comes back as `/b` — so callers echo a
 * normalised path rather than raw input. Exported for whoever reads `?redirectTo=` back off the
 * sign-in page: the value must be re-validated at that end too.
 */
export function toLocalPath(candidate: string | null | undefined): string | null {
	if (!candidate || !candidate.startsWith('/')) return null;
	// eslint-disable-next-line no-control-regex -- rejecting control characters is the point
	if (/[\u0000-\u001f\u007f]/.test(candidate)) return null;

	let resolved: URL;
	try {
		resolved = new URL(candidate, LOCAL_ORIGIN);
	} catch {
		return null;
	}
	if (resolved.origin !== LOCAL_ORIGIN) return null;

	return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}

/**
 * `/` is legal inside a query string (RFC 3986: `query = *( pchar / "/" / "?" )`), so path
 * separators stay readable: `/sign-in?redirectTo=/dashboard`. Un-escaping is safe because
 * `encodeURIComponent` turns any literal `%` into `%25` first — every `%2F` left in its output
 * came from a real `/`.
 */
function encodeQueryPath(path: string): string {
	return encodeURIComponent(path).replaceAll('%2F', '/');
}

/** The sign-in URL, carrying a validated `?redirectTo=` when there is a destination worth keeping. */
export function signInLocation(intendedPath?: string | null): string {
	const target = toLocalPath(intendedPath);
	if (!target || target === SIGN_IN_PATH) return SIGN_IN_PATH;
	return `${SIGN_IN_PATH}?${REDIRECT_TO_PARAM}=${encodeQueryPath(target)}`;
}

/**
 * The whole authorisation boundary: `(dashboard)` needs a session, `(auth)` needs the absence of
 * one, everything else is public. Called for every request, including form actions and endpoints.
 */
export function guardRoute({
	routeId,
	hasSession,
	intendedPath
}: RouteGuardInput): RouteGuardDecision {
	// No route matched: SvelteKit is about to 404 and there is nothing behind it to protect.
	if (!routeId) return ALLOW;

	if (PRIVATE_GROUPS.some((group) => inGroup(routeId, group))) {
		return hasSession
			? ALLOW
			: { action: 'redirect', status: REDIRECT_STATUS, location: signInLocation(intendedPath) };
	}

	if (ANONYMOUS_ONLY_GROUPS.some((group) => inGroup(routeId, group))) {
		return hasSession
			? { action: 'redirect', status: REDIRECT_STATUS, location: DASHBOARD_PATH }
			: ALLOW;
	}

	return ALLOW;
}
