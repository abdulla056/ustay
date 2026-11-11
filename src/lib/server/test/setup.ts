/**
 * Per-test setup for the `db` project (UST-41): every test starts on empty tables.
 * See `truncateAll` in `./db.ts` for why this is truncation rather than rollback.
 */
import { sql } from 'drizzle-orm';
import { beforeAll, beforeEach } from 'vitest';
import { db, truncateAll } from './db';

// Safety net: truncation is destructive, so prove the app client really points at `ustay_test`
// (and not the dev database) before the first test touches it.
beforeAll(async () => {
	const [row] = await db.execute<{ name: string }>(sql`SELECT current_database() AS name`);
	if (row.name !== 'ustay_test') {
		throw new Error(`DB tests connected to "${row.name}", expected "ustay_test"`);
	}
});

beforeEach(truncateAll);
