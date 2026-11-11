/**
 * Helpers for `*.db.test.ts` (UST-41). Import only from DB integration tests: the project's
 * `test.env` points `DATABASE_URL` at `ustay_test`, so `$lib/server/db` resolves to the test
 * database there — in any other project it would not.
 */
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db';

export { db };

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
	const tables = await db.execute<{ tablename: string }>(
		sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
	);
	if (tables.length === 0) return;
	const names = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
	await db.execute(sql.raw(`TRUNCATE ${names} RESTART IDENTITY CASCADE`));
}
