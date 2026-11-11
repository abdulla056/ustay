/**
 * Helpers for `*.db.test.ts` (UST-41). Import only from DB integration tests: the project's
 * `test.env` points `DATABASE_URL` at `ustay_test`, so `$lib/server/db` resolves to the test
 * database there — in any other project it would not.
 */
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { checkTestDbGuard, resolveTestDatabaseUrl } from './db-url';

export { db };

/**
 * The guarded test database URL, for tests that open their own connection (e.g. the seed client).
 * Throws unless it is `ustay_test` on an allowed host — the same check the global setup ran.
 */
export function testDatabaseUrl(): string {
	const url = resolveTestDatabaseUrl(process.env);
	const guard = checkTestDbGuard({
		testDatabaseUrl: url,
		explicitUrl: Boolean(process.env.TEST_DATABASE_URL),
		githubActions: process.env.GITHUB_ACTIONS
	});
	if (!guard.allowed) throw new Error(`Refusing to use test database: ${guard.reason}`);
	return url!;
}

/**
 * Isolation strategy: **truncate every table in `public` before each test**, discovered from
 * `pg_tables` so new tables (and better-auth's) are covered with no list to maintain.
 *
 * Not transaction rollback: repositories such as `renameProperty` and `reorderRooms` open their
 * own `db.transaction`, and the tests must observe real commits (constraint errors, rollbacks).
 * Wrapping each test would hide exactly that. The lane runs serially (`fileParallelism: false`),
 * so a shared database is safe.
 */
export async function truncateAll(): Promise<void> {
	// Migrations have run before any test, so the table set is fixed for the run: query it once.
	tableList ??= db
		.execute<{ tablename: string }>(
			sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
		)
		.then((rows) => rows.map((t) => `"public"."${t.tablename}"`).join(', '));
	const names = await tableList;
	if (!names) return;
	await db.execute(sql.raw(`TRUNCATE ${names} RESTART IDENTITY CASCADE`));
}

let tableList: Promise<string> | undefined;
