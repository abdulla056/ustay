import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { auth } from '$lib/server/auth';
import { DASHBOARD_PATH, toLocalPath } from '$lib/server/auth-guard';
import type { Actions, PageServerLoad } from './$types';
import { validateSignIn } from '../validate';

export const load: PageServerLoad = ({ url }) => ({
	redirectTo: toLocalPath(url.searchParams.get('redirectTo'))
});

export const actions: Actions = {
	default: async ({ request }) => {
		const checked = validateSignIn(await request.formData());
		if (!checked.ok) {
			return fail(400, { ...checked.values, message: checked.message });
		}

		const { email, password, redirectTo } = checked.data;
		try {
			// `sveltekitCookies` (in `$lib/server/auth.ts`) writes the session cookie for us.
			await auth.api.signInEmail({ body: { email, password }, headers: request.headers });
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { email, message: 'That email and password don’t match.' });
			}
			throw error;
		}

		redirect(303, toLocalPath(redirectTo) ?? DASHBOARD_PATH);
	}
};
