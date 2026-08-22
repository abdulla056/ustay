import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { Actions } from './$types';

/**
 * The sign-out affordance in the `(dashboard)` sidebar (UST-57) posts here —
 * `?/signOut` on this page's absolute path, since only a `+page.server.ts` can hold a
 * form action; a group layout cannot. It works from any page in the group because a
 * form's `action` attribute can name a different route than the one it renders on.
 *
 * Calling `auth.api.signOut` directly (rather than POSTing `/api/auth/sign-out`) still
 * clears the session cookie correctly: `sveltekitCookies` in `$lib/server/auth.ts`
 * hooks better-auth's `Set-Cookie` response header and replays it onto this request's
 * own `cookies` via `getRequestEvent()`, which works from any server `load`/action.
 */
export const actions: Actions = {
	signOut: async ({ request }) => {
		await auth.api.signOut({ headers: request.headers });
		redirect(303, '/sign-in');
	}
};
