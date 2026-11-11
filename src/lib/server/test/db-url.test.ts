import { describe, expect, it } from 'vitest';
import { checkTestDbGuard, resolveE2eDatabaseUrl, resolveTestDatabaseUrl } from './db-url';

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
	const local = { explicitUrl: false, githubActions: undefined };

	it('allows a local ustay_test', () => {
		expect(checkTestDbGuard({ testDatabaseUrl: ok, ...local }).allowed).toBe(true);
	});

	it.each(['127.0.0.1', '[::1]', 'db'])('allows local host %s', (host) => {
		const testDatabaseUrl = `postgres://root:pw@${host}:5432/ustay_test`;
		expect(checkTestDbGuard({ testDatabaseUrl, ...local }).allowed).toBe(true);
	});

	it('refuses the local dev database', () => {
		const r = checkTestDbGuard({
			testDatabaseUrl: LOCAL,
			explicitUrl: true,
			githubActions: 'true'
		});
		expect(r.allowed).toBe(false);
	});

	it('allows a remote host only on GitHub Actions with an explicit URL', () => {
		const testDatabaseUrl = 'postgres://u:p@db.example.com:5432/ustay_test';
		expect(checkTestDbGuard({ testDatabaseUrl, ...local }).allowed).toBe(false);
		// CI=true alone (not GITHUB_ACTIONS) never opens the guard.
		expect(
			checkTestDbGuard({ testDatabaseUrl, explicitUrl: true, githubActions: undefined }).allowed
		).toBe(false);
		expect(
			checkTestDbGuard({ testDatabaseUrl, explicitUrl: false, githubActions: 'true' }).allowed
		).toBe(false);
		expect(
			checkTestDbGuard({ testDatabaseUrl, explicitUrl: true, githubActions: 'true' }).allowed
		).toBe(true);
	});

	it('refuses a missing or invalid URL', () => {
		expect(checkTestDbGuard({ testDatabaseUrl: undefined, ...local }).allowed).toBe(false);
		expect(checkTestDbGuard({ testDatabaseUrl: 'nope', ...local }).allowed).toBe(false);
	});
});

describe('e2e database (UST-77)', () => {
	it('derives ustay_e2e from DATABASE_URL, preferring E2E_DATABASE_URL', () => {
		expect(resolveE2eDatabaseUrl({ DATABASE_URL: LOCAL })).toBe(
			'postgres://root:pw@localhost:5432/ustay_e2e'
		);
		const explicit = 'postgres://a:b@localhost:5432/ustay_e2e';
		expect(resolveE2eDatabaseUrl({ E2E_DATABASE_URL: explicit, DATABASE_URL: LOCAL })).toBe(
			explicit
		);
	});

	it('guards by the allowed name: each lane only its own database', () => {
		const base = { explicitUrl: false, githubActions: undefined };
		const e2e = 'postgres://u:p@localhost:5432/ustay_e2e';
		expect(checkTestDbGuard({ testDatabaseUrl: e2e, ...base, dbName: 'ustay_e2e' }).allowed).toBe(
			true
		);
		expect(checkTestDbGuard({ testDatabaseUrl: e2e, ...base }).allowed).toBe(false);
		expect(checkTestDbGuard({ testDatabaseUrl: LOCAL, ...base, dbName: 'ustay_e2e' }).allowed).toBe(
			false
		);
	});
});
