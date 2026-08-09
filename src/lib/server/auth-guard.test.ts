import { describe, expect, it } from 'vitest';
import {
	DASHBOARD_PATH,
	guardRoute,
	REDIRECT_STATUS,
	SIGN_IN_PATH,
	signInLocation,
	toLocalPath
} from './auth-guard';

/**
 * The authorisation boundary, tested with **no database and no request** — the guard is a pure
 * function of `event.route.id` + "is there a session", which is the whole reason it was extracted
 * out of `hooks.server.ts`. Route ids below are the real shapes SvelteKit produces for the four
 * groups in `docs/ARCHITECTURE.md`.
 */

const anonymous = { hasSession: false };
const signedIn = { hasSession: true };

describe('guardRoute — (dashboard)', () => {
	it('sends an anonymous visitor to sign-in, keeping the destination', () => {
		expect(
			guardRoute({ routeId: '/(dashboard)/dashboard', intendedPath: '/dashboard', ...anonymous })
		).toEqual({
			action: 'redirect',
			status: 303,
			location: '/sign-in?redirectTo=/dashboard'
		});
	});

	it('guards nested routes and dynamic segments alike', () => {
		const decision = guardRoute({
			routeId: '/(dashboard)/dashboard/properties/[property]/rooms',
			intendedPath: '/dashboard/properties/riad-el-fenn/rooms',
			...anonymous
		});
		expect(decision).toEqual({
			action: 'redirect',
			status: 303,
			location: '/sign-in?redirectTo=/dashboard/properties/riad-el-fenn/rooms'
		});
	});

	it('percent-encodes the query of the intended destination but not its slashes', () => {
		const decision = guardRoute({
			routeId: '/(dashboard)/dashboard/media',
			intendedPath: '/dashboard/media?tab=photos&sort=recent',
			...anonymous
		});
		expect(decision).toMatchObject({
			location: '/sign-in?redirectTo=/dashboard/media%3Ftab%3Dphotos%26sort%3Drecent'
		});
	});

	it('redirects with 303 so a blocked form POST is replayed as a GET', () => {
		const decision = guardRoute({ routeId: '/(dashboard)/dashboard/settings', ...anonymous });
		expect(decision).toMatchObject({ status: REDIRECT_STATUS });
		expect(REDIRECT_STATUS).toBe(303);
	});

	it('falls back to a bare sign-in URL when there is no usable destination', () => {
		expect(guardRoute({ routeId: '/(dashboard)/dashboard', ...anonymous })).toMatchObject({
			location: SIGN_IN_PATH
		});
	});

	it('allows a signed-in visitor through', () => {
		expect(
			guardRoute({ routeId: '/(dashboard)/dashboard', intendedPath: '/dashboard', ...signedIn })
		).toEqual({
			action: 'allow'
		});
	});
});

describe('guardRoute — (auth)', () => {
	it('sends a signed-in visitor to the dashboard', () => {
		expect(
			guardRoute({ routeId: '/(auth)/sign-in', intendedPath: '/sign-in', ...signedIn })
		).toEqual({
			action: 'redirect',
			status: 303,
			location: DASHBOARD_PATH
		});
	});

	it('never carries a redirectTo into the dashboard redirect', () => {
		const decision = guardRoute({
			routeId: '/(auth)/sign-in',
			intendedPath: '/sign-in?redirectTo=/dashboard/media',
			...signedIn
		});
		expect(decision).toMatchObject({ location: '/dashboard' });
	});

	it('lets an anonymous visitor reach every auth page', () => {
		for (const routeId of [
			'/(auth)/sign-in',
			'/(auth)/sign-up',
			'/(auth)/forgot-password',
			'/(auth)/reset-password'
		]) {
			expect(guardRoute({ routeId, ...anonymous })).toEqual({ action: 'allow' });
		}
	});
});

describe('guardRoute — public surface', () => {
	const publicRoutes = [
		'/(platform)',
		'/(platform)/stays',
		'/(platform)/destinations/[destination]',
		'/(microsite)/stays/[property]',
		'/(microsite)/stays/[property]/rooms',
		'/tokens',
		'/motion',
		'/prototype',
		'/api/auth/[...all]'
	];

	it('is public regardless of session state', () => {
		for (const routeId of publicRoutes) {
			expect(guardRoute({ routeId, ...anonymous }), routeId).toEqual({ action: 'allow' });
			expect(guardRoute({ routeId, ...signedIn }), routeId).toEqual({ action: 'allow' });
		}
	});

	it('allows an unmatched route so SvelteKit can 404 it', () => {
		expect(guardRoute({ routeId: null, intendedPath: '/nope', ...anonymous })).toEqual({
			action: 'allow'
		});
	});

	it('matches whole group segments, not path prefixes', () => {
		// A `(platform)` page whose URL merely starts with "dashboard" must stay public, and a
		// `(dashboard)` group whose URL does not contain "dashboard" must still be guarded.
		expect(guardRoute({ routeId: '/(platform)/dashboards-explained', ...anonymous })).toEqual({
			action: 'allow'
		});
		expect(guardRoute({ routeId: '/(dashboard)/billing', ...anonymous })).toMatchObject({
			action: 'redirect'
		});
	});
});

describe('toLocalPath', () => {
	it('accepts local paths, including query and hash', () => {
		expect(toLocalPath('/dashboard')).toBe('/dashboard');
		expect(toLocalPath('/dashboard/media?tab=photos')).toBe('/dashboard/media?tab=photos');
		expect(toLocalPath('/dashboard#gallery')).toBe('/dashboard#gallery');
	});

	it('normalises traversal instead of echoing raw input', () => {
		expect(toLocalPath('/dashboard/../dashboard/media')).toBe('/dashboard/media');
	});

	it('keeps an encoded slash encoded', () => {
		expect(toLocalPath('/dashboard/a%2Fb')).toBe('/dashboard/a%2Fb');
	});

	it('rejects anything that could leave our origin', () => {
		for (const candidate of [
			'//evil.com',
			'///evil.com',
			'/\\evil.com',
			'/\\/evil.com',
			'https://evil.com/dashboard',
			'http://evil.com',
			'//evil.com/dashboard',
			'javascript:alert(1)',
			'dashboard',
			'',
			' /dashboard',
			null,
			undefined
		]) {
			expect(toLocalPath(candidate), String(candidate)).toBeNull();
		}
	});

	it('rejects control characters, which browsers strip before following a Location', () => {
		expect(toLocalPath('/dash\nboard')).toBeNull();
		expect(toLocalPath('/\t/evil.com')).toBeNull();
		expect(toLocalPath('/dashboard\r\nSet-Cookie: a=b')).toBeNull();
	});
});

describe('signInLocation', () => {
	it('drops a destination that is not a local path — no open redirects', () => {
		for (const hostile of [
			'https://evil.com',
			'//evil.com',
			'/\\evil.com',
			'javascript:alert(1)'
		]) {
			expect(signInLocation(hostile), hostile).toBe(SIGN_IN_PATH);
		}
	});

	it('does not point sign-in back at itself', () => {
		expect(signInLocation(SIGN_IN_PATH)).toBe(SIGN_IN_PATH);
	});

	it('round-trips through URL parsing to the original path', () => {
		const location = signInLocation('/dashboard/media?tab=photos');
		const parsed = new URL(location, 'https://ustay.test');
		expect(parsed.pathname).toBe(SIGN_IN_PATH);
		expect(parsed.searchParams.get('redirectTo')).toBe('/dashboard/media?tab=photos');
	});
});
