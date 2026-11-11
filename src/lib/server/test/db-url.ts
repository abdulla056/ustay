/**
 * Pure helpers for the DB integration lane (UST-41): which database the tests use, and whether
 * they may run against it. Dependency-free (no `$env`, no `db`) so `vite.config.ts`, the global
 * setup and a unit test (`db-url.test.ts`) can all import it.
 */
import { LOCAL_HOSTNAMES } from '../db/seed/guard';

/** The database the lane owns. It is dropped and recreated on every run — never point it at data. */
export const TEST_DB_NAME = 'ustay_test';

/** The e2e lane's own database (UST-77), so it never drops `ustay_test` under a running `test:db`. */
export const E2E_DB_NAME = 'ustay_e2e';

/** Swap the database name in a connection string, keeping credentials, host and port. */
export function withDatabaseName(connectionUrl: string, dbName: string): string {
	const url = new URL(connectionUrl);
	url.pathname = `/${dbName}`;
	return url.toString();
}

/** `TEST_DATABASE_URL` if set, else `DATABASE_URL` with its db name swapped for `ustay_test`. */
export function resolveTestDatabaseUrl(env: {
	TEST_DATABASE_URL?: string;
	DATABASE_URL?: string;
}): string | undefined {
	if (env.TEST_DATABASE_URL) return env.TEST_DATABASE_URL;
	if (!env.DATABASE_URL) return undefined;
	try {
		return withDatabaseName(env.DATABASE_URL, TEST_DB_NAME);
	} catch {
		return undefined;
	}
}

/** `E2E_DATABASE_URL` if set, else `DATABASE_URL` with its db name swapped for `ustay_e2e`. */
export function resolveE2eDatabaseUrl(env: {
	E2E_DATABASE_URL?: string;
	DATABASE_URL?: string;
}): string | undefined {
	if (env.E2E_DATABASE_URL) return env.E2E_DATABASE_URL;
	if (!env.DATABASE_URL) return undefined;
	try {
		return withDatabaseName(env.DATABASE_URL, E2E_DB_NAME);
	} catch {
		return undefined;
	}
}

export type TestDbGuardResult =
	{ readonly allowed: true } | { readonly allowed: false; readonly reason: string };

/**
 * The lane drops and recreates its database, so refuse anything that could be a shared one:
 * a non-`ustay_test` name (never `local`), and a non-local host unless on GitHub Actions with an
 * explicit `TEST_DATABASE_URL`.
 */
export function checkTestDbGuard(opts: {
	testDatabaseUrl: string | undefined;
	/** True only when `TEST_DATABASE_URL` was set explicitly (not derived from `DATABASE_URL`). */
	explicitUrl: boolean;
	/** `process.env.GITHUB_ACTIONS`. Plain `CI=true` is not enough: dev shells and agents set it. */
	githubActions: string | undefined;
	/** The one database name this caller may touch. Defaults to `ustay_test`. */
	dbName?: string;
}): TestDbGuardResult {
	const { testDatabaseUrl, explicitUrl, githubActions, dbName: allowedName = TEST_DB_NAME } = opts;
	if (!testDatabaseUrl) {
		return {
			allowed: false,
			reason: 'Neither TEST_DATABASE_URL nor DATABASE_URL is set (copy .env.example to .env).'
		};
	}
	let url: URL;
	try {
		url = new URL(testDatabaseUrl);
	} catch {
		return { allowed: false, reason: 'Test database URL is not a valid URL.' };
	}
	const dbName = decodeURIComponent(url.pathname.slice(1));
	if (dbName !== allowedName) {
		return {
			allowed: false,
			reason: `Database name is "${dbName}"; the lane only runs against "${allowedName}".`
		};
	}
	// `new URL()` brackets IPv6 hosts (`[::1]`); the allowlist stores them bare.
	const hostname = url.hostname.replace(/^\[|\]$/g, '');
	const remoteOk = githubActions === 'true' && explicitUrl;
	if (!remoteOk && !LOCAL_HOSTNAMES.has(hostname)) {
		return {
			allowed: false,
			reason:
				`Host "${hostname}" is not local. A remote host is allowed only on GitHub Actions ` +
				'with TEST_DATABASE_URL set explicitly.'
		};
	}
	return { allowed: true };
}
