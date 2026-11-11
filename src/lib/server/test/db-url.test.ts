import { describe, expect, it } from 'vitest';
import { checkTestDbGuard, resolveTestDatabaseUrl } from './db-url';

const LOCAL = 'postgres://root:pw@localhost:5432/local';

describe('resolveTestDatabaseUrl', () => {
	it('prefers TEST_DATABASE_URL', () => {
		const explicit = 'postgres://a:b@localhost:5432/ustay_test';
		expect(resolveTestDatabaseUrl({ TEST_DATABASE_URL: explicit, DATABASE_URL: LOCAL })).toBe(
			explicit
		);
	});

	it('swaps the db name of DATABASE_URL', () => {
		expect(resolveTestDatabaseUrl({ DATABASE_URL: LOCAL })).toBe(
			'postgres://root:pw@localhost:5432/ustay_test'
		);
	});

	it('is undefined with nothing to derive from', () => {
		expect(resolveTestDatabaseUrl({})).toBeUndefined();
		expect(resolveTestDatabaseUrl({ DATABASE_URL: 'not a url' })).toBeUndefined();
	});
});

describe('checkTestDbGuard', () => {
	const ok = 'postgres://root:pw@localhost:5432/ustay_test';

	it('allows a local ustay_test', () => {
		expect(checkTestDbGuard({ testDatabaseUrl: ok, ci: undefined }).allowed).toBe(true);
	});

	it('refuses the local dev database', () => {
		expect(checkTestDbGuard({ testDatabaseUrl: LOCAL, ci: 'true' }).allowed).toBe(false);
	});

	it('refuses a remote host outside CI, allows it in CI', () => {
		const remote = 'postgres://u:p@db.example.com:5432/ustay_test';
		expect(checkTestDbGuard({ testDatabaseUrl: remote, ci: undefined }).allowed).toBe(false);
		expect(checkTestDbGuard({ testDatabaseUrl: remote, ci: 'true' }).allowed).toBe(true);
	});

	it('refuses a missing or invalid URL', () => {
		expect(checkTestDbGuard({ testDatabaseUrl: undefined, ci: 'true' }).allowed).toBe(false);
		expect(checkTestDbGuard({ testDatabaseUrl: 'nope', ci: 'true' }).allowed).toBe(false);
	});
});
