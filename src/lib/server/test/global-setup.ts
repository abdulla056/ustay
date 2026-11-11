/**
 * Vitest global setup for the `db` project (UST-41). Runs once, in the main process, before any
 * `*.db.test.ts`: drop `ustay_test` if it exists, recreate it, and apply the committed
 * migrations (`drizzle/`) with drizzle's migrator. Starting from zero each run means the
 * migration files themselves are under test, not just the schema in TypeScript.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { checkTestDbGuard, resolveTestDatabaseUrl, TEST_DB_NAME, withDatabaseName } from './db-url';

export default async function setup() {
	const testDatabaseUrl = resolveTestDatabaseUrl(process.env);
	const guard = checkTestDbGuard({ testDatabaseUrl, ci: process.env.CI });
	if (!guard.allowed) throw new Error(`Refusing to run DB tests: ${guard.reason}`);

	// DROP/CREATE DATABASE can't run on the database being dropped; use the maintenance db.
	const admin = postgres(withDatabaseName(testDatabaseUrl!, 'postgres'), {
		max: 1,
		onnotice: () => {}
	});
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
