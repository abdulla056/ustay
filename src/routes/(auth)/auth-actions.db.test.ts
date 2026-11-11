/**
 * `/sign-in` and `/sign-up` form actions against real better-auth + Postgres (UST-41).
 *
 * UST-41 was opened for "a plain form POST to /sign-in returns 200, not 303". That was a
 * measurement artifact, not an app bug: SvelteKit treats a POST whose `Accept` negotiates to
 * JSON as an enhanced `use:enhance` call and answers `{"type":"redirect","status":303}` with
 * HTTP 200. `curl` sends a wildcard Accept, which negotiates to JSON; a real browser form submit
 * sends `text/html,...` and gets a true 303. These tests pin the action's behaviour — a thrown
 * `redirect(303, …)`, which SvelteKit renders as the 303 for browsers — for both routes.
 */
import { isRedirect } from '@sveltejs/kit';
import { describe, expect, it, vi } from 'vitest';
import { DEV_USER_EMAIL, DEV_USER_PASSWORD } from '$lib/server/db/seed/dev-user';

// `sveltekitCookies` reads the current request event to write the session cookie. Outside a real
// request there is none, so give it a stub whose `cookies.set` is a no-op; the cookie itself is
// not what these tests assert.
vi.mock('$app/server', () => ({
	getRequestEvent: () => ({ cookies: { set: () => {} } })
}));

import { actions as signIn } from './sign-in/+page.server';
import { actions as signUp } from './sign-up/+page.server';

type ActionEvent = Parameters<(typeof signIn)['default']>[0] &
	Parameters<(typeof signUp)['default']>[0];

function formEvent(fields: Record<string, string>): ActionEvent {
	const body = new URLSearchParams(fields);
	const request = new Request('http://localhost/form', {
		method: 'POST',
		headers: { 'content-type': 'application/x-www-form-urlencoded' },
		body
	});
	return { request } as unknown as ActionEvent;
}

async function redirectOf(run: () => unknown) {
	try {
		await run();
	} catch (error) {
		if (isRedirect(error)) return error;
		throw error;
	}
	return undefined;
}

describe('sign-up action', () => {
	const account = { name: 'Test Owner', email: 'someone@ustay.test', password: 'a-long-password' };

	it('creates the account and redirects 303 to /dashboard', async () => {
		const redirected = await redirectOf(() => signUp.default(formEvent(account)));
		expect(redirected).toMatchObject({ status: 303, location: '/dashboard' });
	});

	it('honours a local redirectTo and ignores an external one', async () => {
		const local = await redirectOf(() =>
			signUp.default(formEvent({ ...account, redirectTo: '/dashboard/properties' }))
		);
		expect(local).toMatchObject({ status: 303, location: '/dashboard/properties' });

		const external = await redirectOf(() =>
			signUp.default(
				formEvent({ ...account, email: 'two@ustay.test', redirectTo: 'https://evil.example' })
			)
		);
		expect(external).toMatchObject({ status: 303, location: '/dashboard' });
	});

	it('fails 400 for a duplicate email', async () => {
		await redirectOf(() => signUp.default(formEvent(account)));
		const result = await signUp.default(formEvent(account));
		expect(result).toMatchObject({ status: 400 });
	});
});

describe('sign-in action', () => {
	async function seedUser() {
		await redirectOf(() =>
			signUp.default(
				formEvent({ name: 'Dev Owner', email: DEV_USER_EMAIL, password: DEV_USER_PASSWORD })
			)
		);
	}

	it('redirects 303 to /dashboard on valid credentials', async () => {
		await seedUser();
		const redirected = await redirectOf(() =>
			signIn.default(formEvent({ email: DEV_USER_EMAIL, password: DEV_USER_PASSWORD }))
		);
		expect(redirected).toMatchObject({ status: 303, location: '/dashboard' });
	});

	it('fails 400 on a wrong password, without redirecting', async () => {
		await seedUser();
		const result = await signIn.default(
			formEvent({ email: DEV_USER_EMAIL, password: 'not-the-password' })
		);
		expect(result).toMatchObject({ status: 400, data: { email: DEV_USER_EMAIL } });
	});
});
