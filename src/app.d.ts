import type { User, Session } from 'better-auth';

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			/**
			 * The signed-in user, or `null`. Always set: `src/hooks.server.ts` resolves the
			 * better-auth session once per request, so `null` means anonymous rather than "not
			 * looked up yet". Presence is not authorisation — route access is decided in `handle`
			 * (`$lib/server/auth-guard.ts`) and per-row ownership in the service or action that
			 * touches the row.
			 */
			user: User | null;
			/** The better-auth session backing `locals.user`, or `null` when anonymous. */
			session: Session | null;
		}

		// interface Error {}
		// interface PageData {}
		// interface PageState {}
		interface Platform {
			env?: unknown;
			cf?: CfProperties;
			ctx?: ExecutionContext;
		}
	}
}

export {};
