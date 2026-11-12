/**
 * Shared by the db lane's global setup (UST-41) and the e2e lane's `prepare-db` (UST-77): guard the
 * URL, drop + recreate the database it names, and apply the committed migrations from zero.
 * Plain node/bun module (no `$env`), so Vitest and bun can both import it.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { checkTestDbGuard, withDatabaseName } from './db-url';

/** Maintenance database used to run DROP/CREATE DATABASE; override with TEST_DB_ADMIN_DATABASE. */
const DEFAULT_ADMIN_DB = 'postgres';

export async function resetTestDatabase(opts: {
	url: string | undefined;
	/** True when the URL came from an explicit env var rather than being derived. */
	explicitUrl: boolean;
	githubActions: string | undefined;
	dbNamePattern: RegExp;
	/** Env var name to cite in refusals. */
	urlVar: string;
	adminDatabase?: string;
}): Promise<void> {
	const { url, dbNamePattern } = opts;
	const guard = checkTestDbGuard({
		testDatabaseUrl: url,
		explicitUrl: opts.explicitUrl,
		githubActions: opts.githubActions,
		dbNamePattern,
		urlVar: opts.urlVar
	});
	if (!guard.allowed) throw new Error(`Refusing to reset the test database: ${guard.reason}`);

	// The guard matched the pattern, so this is a safe identifier (`ustay_test`, `ustay_e2e_<n>`).
	const dbName = decodeURIComponent(new URL(url!).pathname.slice(1));
	const admin = postgres(withDatabaseName(url!, opts.adminDatabase || DEFAULT_ADMIN_DB), {
		max: 1,
		onnotice: () => {}
	});
	try {
		await admin.unsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
		await admin.unsafe(`CREATE DATABASE "${dbName}"`);
	} finally {
		await admin.end();
	}

	const client = postgres(url!, { max: 1 });
	try {
		await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
	} finally {
		await client.end();
	}
}
