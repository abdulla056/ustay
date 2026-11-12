/**
 * Vitest global setup for the `db` project (UST-41). Runs once, in the main process, before any
 * `*.db.test.ts`: drop `ustay_test` if it exists, recreate it, and apply the committed
 * migrations (`drizzle/`) with drizzle's migrator. Starting from zero each run means the
 * migration files themselves are under test, not just the schema in TypeScript.
 */
import type { TestProject } from 'vitest/node';
import { resolveTestDatabaseUrl, TEST_DB_PATTERN } from './db-url';
import { resetTestDatabase } from './reset-db';

export default async function setup(project: TestProject) {
	// The `db` project's `test.env` (see vite.config.ts) holds the resolved test URL; the main
	// process's own `process.env` does not load `.env`.
	const projectEnv = project.config.env as Record<string, string | undefined>;
	const env = { ...process.env, ...projectEnv };
	await resetTestDatabase({
		url: resolveTestDatabaseUrl(env),
		explicitUrl: Boolean(process.env.TEST_DATABASE_URL),
		githubActions: process.env.GITHUB_ACTIONS,
		dbNamePattern: TEST_DB_PATTERN,
		urlVar: 'TEST_DATABASE_URL',
		adminDatabase: env.TEST_DB_ADMIN_DATABASE
	});
}
