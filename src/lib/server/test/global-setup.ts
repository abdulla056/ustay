/**
 * Vitest global setup for the `db` project (UST-41). Runs once, in the main process, before any
 * `*.db.test.ts`: drop `ustay_test` if it exists, recreate it, and apply the committed
 * migrations (`drizzle/`) with drizzle's migrator. Starting from zero each run means the
 * migration files themselves are under test, not just the schema in TypeScript.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import type { TestProject } from 'vitest/node';
import { checkTestDbGuard, resolveTestDatabaseUrl, TEST_DB_NAME, withDatabaseName } from './db-url';

/** Maintenance database used to run DROP/CREATE DATABASE; override with TEST_DB_ADMIN_DATABASE. */
const DEFAULT_ADMIN_DB = 'postgres';

export default async function setup(project: TestProject) {
	// The `db` project's `test.env` (see vite.config.ts) holds the resolved test URL; the main
	// process's own `process.env` does not load `.env`.
	const projectEnv = project.config.env as Record<string, string | undefined>;
	const env = { ...process.env, ...projectEnv };
	const testDatabaseUrl = resolveTestDatabaseUrl(env);
	const guard = checkTestDbGuard({
		testDatabaseUrl,
		explicitUrl: Boolean(process.env.TEST_DATABASE_URL),
		githubActions: process.env.GITHUB_ACTIONS
	});
	if (!guard.allowed) throw new Error(`Refusing to run DB tests: ${guard.reason}`);

	// DROP/CREATE DATABASE can't run on the database being dropped; use the maintenance db.
	const admin = postgres(
		withDatabaseName(testDatabaseUrl!, env.TEST_DB_ADMIN_DATABASE || DEFAULT_ADMIN_DB),
		{
			max: 1,
			onnotice: () => {}
		}
	);
	try {
		await admin.unsafe(`DROP DATABASE IF EXISTS ${TEST_DB_NAME} WITH (FORCE)`);
		await admin.unsafe(`CREATE DATABASE ${TEST_DB_NAME}`);
	} finally {
		await admin.end();
	}

	const client = postgres(testDatabaseUrl!, { max: 1 });
	try {
		await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
	} finally {
		await client.end();
	}
}
