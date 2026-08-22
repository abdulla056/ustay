import { describe, expect, it } from 'vitest';
import { assertResetAllowed, assertSeedAllowed, checkResetGuard, checkSeedGuard } from './guard';

const local = { nodeEnv: 'development', databaseUrl: 'postgres://root:pw@localhost:5432/local' };

describe('checkSeedGuard', () => {
	it('allows a local, non-production environment', () => {
		expect(checkSeedGuard(local)).toEqual({ allowed: true });
	});

	it('refuses NODE_ENV=production, regardless of the database', () => {
		const result = checkSeedGuard({ ...local, nodeEnv: 'production' });
		expect(result.allowed).toBe(false);
		expect(!result.allowed && result.reason).toMatch(/production/i);
	});

	it('refuses when DATABASE_URL is unset', () => {
		const result = checkSeedGuard({ ...local, databaseUrl: undefined });
		expect(result.allowed).toBe(false);
		expect(!result.allowed && result.reason).toMatch(/DATABASE_URL/);
	});

	it('does not require a local hostname (db:seed only ever upserts)', () => {
		expect(
			checkSeedGuard({ ...local, databaseUrl: 'postgres://u:p@prod.example.com:5432/app' })
		).toEqual({ allowed: true });
	});
});

describe('checkResetGuard', () => {
	it('allows localhost, 127.0.0.1, and the compose service name "db"', () => {
		for (const host of ['localhost', '127.0.0.1', 'db']) {
			expect(
				checkResetGuard({ ...local, databaseUrl: `postgres://root:pw@${host}:5432/local` })
			).toEqual({ allowed: true });
		}
	});

	it('refuses a non-local hostname — db:reset is destructive', () => {
		const result = checkResetGuard({
			...local,
			databaseUrl: 'postgres://u:p@prod.example.com:5432/app'
		});
		expect(result.allowed).toBe(false);
		expect(!result.allowed && result.reason).toMatch(/prod\.example\.com/);
	});

	it('refuses an unparsable DATABASE_URL', () => {
		const result = checkResetGuard({ ...local, databaseUrl: 'not-a-url' });
		expect(result.allowed).toBe(false);
	});

	it('still refuses production first, before checking the hostname', () => {
		const result = checkResetGuard({ ...local, nodeEnv: 'production' });
		expect(result.allowed).toBe(false);
		expect(!result.allowed && result.reason).toMatch(/production/i);
	});
});

describe('assertSeedAllowed / assertResetAllowed', () => {
	it('assertSeedAllowed throws with the guard reason', () => {
		expect(() => assertSeedAllowed({ ...local, nodeEnv: 'production' })).toThrow(/production/i);
		expect(() => assertSeedAllowed(local)).not.toThrow();
	});

	it('assertResetAllowed throws for a non-local host', () => {
		expect(() =>
			assertResetAllowed({ ...local, databaseUrl: 'postgres://u:p@prod.example.com/app' })
		).toThrow(/prod\.example\.com/);
		expect(() => assertResetAllowed(local)).not.toThrow();
	});
});
