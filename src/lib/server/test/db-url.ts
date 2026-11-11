/**
 * Pure helpers for the DB integration lane (UST-41): which database the tests use, and whether
 * they may run against it. Dependency-free (no `$env`, no `db`) so `vite.config.ts`, the global
 * setup and a unit test (`db-url.test.ts`) can all import it.
 */
import { LOCAL_HOSTNAMES } from '../db/seed/guard';

/** The database the lane owns. It is dropped and recreated on every run — never point it at data. */
export const TEST_DB_NAME = 'ustay_test';

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

export type TestDbGuardResult =
	{ readonly allowed: true } | { readonly allowed: false; readonly reason: string };

/**
 * The lane drops and recreates its database, so refuse anything that could be a shared one:
 * a non-`ustay_test` name (never `local`), and a non-local host unless running in CI.
 */
export function checkTestDbGuard(opts: {
	testDatabaseUrl: string | undefined;
	ci: string | undefined;
}): TestDbGuardResult {
	const { testDatabaseUrl, ci } = opts;
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
	if (dbName !== TEST_DB_NAME) {
		return {
			allowed: false,
			reason: `Database name is "${dbName}"; the lane only runs against "${TEST_DB_NAME}".`
		};
	}
	if (ci !== 'true' && !LOCAL_HOSTNAMES.has(url.hostname)) {
		return {
			allowed: false,
			reason: `Host "${url.hostname}" is not local and CI is not "true".`
		};
	}
	return { allowed: true };
}
