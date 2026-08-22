/**
 * Seed module #1 — the dev user (UST-10). Proves the harness before Phase 1 has any domain
 * tables to seed, and gives UST-55/57 a login to test against.
 *
 * Created through better-auth's own `signUpEmail`, never by hand-inserting into `user` /
 * `account` — that is the only way the stored password hash matches what `emailAndPassword`
 * sign-in later checks it against (`docs/DATABASE.md` / `src/lib/server/auth.ts`).
 *
 * Idempotent by check-then-create: `email` is unique, so a first read decides whether to call
 * better-auth at all. Re-running `db:seed` finds the existing row and does nothing, matching the
 * acceptance criterion that a second run changes nothing.
 */
import { eq } from 'drizzle-orm';
import { user } from '../schema';
import type { SeedAuth, SeedDb } from './client';

/** `.test` is IANA's reserved TLD for exactly this (RFC 2606) — guaranteed never to resolve. */
export const DEV_USER_EMAIL = 'owner@ustay.test';
/** Documented here, not secret: this account only ever exists in a local/dev database. */
export const DEV_USER_PASSWORD = 'ustay-dev-password';
export const DEV_USER_NAME = 'Dev Owner';

export type SeedModuleResult = { readonly created: boolean; readonly detail: string };

export async function seedDevUser(db: SeedDb, auth: SeedAuth): Promise<SeedModuleResult> {
	const [existing] = await db
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, DEV_USER_EMAIL))
		.limit(1);

	if (existing) {
		return { created: false, detail: `${DEV_USER_EMAIL} already exists (${existing.id})` };
	}

	const { user: created } = await auth.api.signUpEmail({
		body: { name: DEV_USER_NAME, email: DEV_USER_EMAIL, password: DEV_USER_PASSWORD }
	});

	return { created: true, detail: `${DEV_USER_EMAIL} created (${created.id})` };
}
