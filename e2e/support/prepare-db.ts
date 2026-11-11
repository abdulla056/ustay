/**
 * Runs (under bun) before the e2e server starts: guard, drop + recreate `ustay_e2e`, apply the
 * committed migrations, seed the dev user. Mirrors the db lane's global setup (UST-41) so the
 * migration files are exercised from zero, and reuses the seed module (UST-10) for the user.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { checkTestDbGuard, E2E_DB_NAME, withDatabaseName } from '../../src/lib/server/test/db-url';
import { createSeedAuth, createSeedDb } from '../../src/lib/server/db/seed/client';
import { seedDevUser } from '../../src/lib/server/db/seed/dev-user';
import { authSecret, e2eDatabaseUrl } from './env';

const url = e2eDatabaseUrl();
const guard = checkTestDbGuard({
	testDatabaseUrl: url,
	explicitUrl: Boolean(process.env.E2E_DATABASE_URL),
	githubActions: process.env.GITHUB_ACTIONS,
	dbName: E2E_DB_NAME
});
if (!guard.allowed) throw new Error(`Refusing to run e2e: ${guard.reason}`);

const admin = postgres(withDatabaseName(url!, process.env.TEST_DB_ADMIN_DATABASE || 'postgres'), {
	max: 1,
	onnotice: () => {}
});
try {
	await admin.unsafe(`DROP DATABASE IF EXISTS ${E2E_DB_NAME} WITH (FORCE)`);
	await admin.unsafe(`CREATE DATABASE ${E2E_DB_NAME}`);
} finally {
	await admin.end();
}

const migrator = postgres(url!, { max: 1 });
try {
	await migrate(drizzle(migrator), { migrationsFolder: 'drizzle' });
} finally {
	await migrator.end();
}

process.env.BETTER_AUTH_SECRET = authSecret();
const seed = createSeedDb(url!);
try {
	await seedDevUser(seed.db, createSeedAuth(seed.db));
} finally {
	await seed.close();
}
console.log(`e2e database ${E2E_DB_NAME} ready`);
