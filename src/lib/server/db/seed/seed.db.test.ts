import { afterAll, describe, expect, it } from 'vitest';
import { createSeedAuth, createSeedDb } from './client';
import { DEV_USER_EMAIL, DEV_USER_PASSWORD } from './dev-user';
import { seedModules } from './index';
import { user } from '../schema';

// The seed modules run exactly as `bun run db:seed` runs them (same client, same auth instance),
// only against `ustay_test` — `DATABASE_URL` is repointed by the `db` project's config.
const seed = createSeedDb(process.env.DATABASE_URL!);
const auth = createSeedAuth(seed.db);
afterAll(() => seed.close());

async function runAll() {
	const results = [];
	for (const m of seedModules) results.push(await m.run({ db: seed.db, auth }));
	return results;
}

describe('seed modules', () => {
	it('create on a fresh database, then skip on the second run (idempotent)', async () => {
		const first = await runAll();
		expect(first.every((r) => r.created)).toBe(true);
		const usersAfterFirst = await seed.db.select().from(user);

		const second = await runAll();
		expect(second.every((r) => !r.created)).toBe(true);
		expect(await seed.db.select().from(user)).toEqual(usersAfterFirst);
	});

	it('leaves a dev user who can sign in through better-auth', async () => {
		await runAll();
		const res = await auth.api.signInEmail({
			body: { email: DEV_USER_EMAIL, password: DEV_USER_PASSWORD }
		});
		expect(res.user.email).toBe(DEV_USER_EMAIL);
		expect(res.token).toBeTruthy();
	});

	it('rejects a wrong password', async () => {
		await runAll();
		await expect(
			auth.api.signInEmail({ body: { email: DEV_USER_EMAIL, password: 'wrong-password' } })
		).rejects.toThrow();
	});
});
