/**
 * Runs (under bun) before the e2e server starts: guard, drop + recreate the per-run database,
 * apply the committed migrations, seed the dev user. The reset is shared with the db lane
 * (`resetTestDatabase`); the user comes from the seed module (UST-10).
 */
import { E2E_DB_PATTERN } from '../../src/lib/server/test/db-url';
import { resetTestDatabase } from '../../src/lib/server/test/reset-db';
import { createSeedAuth, createSeedDb } from '../../src/lib/server/db/seed/client';
import { seedDevUser } from '../../src/lib/server/db/seed/dev-user';
import { authSecret, e2eDatabaseUrl } from './env';

const url = e2eDatabaseUrl();
await resetTestDatabase({
	url,
	explicitUrl: Boolean(process.env.E2E_DATABASE_URL),
	githubActions: process.env.GITHUB_ACTIONS,
	dbNamePattern: E2E_DB_PATTERN,
	urlVar: 'E2E_DATABASE_URL',
	adminDatabase: process.env.TEST_DB_ADMIN_DATABASE
});

process.env.BETTER_AUTH_SECRET = authSecret();
const seed = createSeedDb(url!);
try {
	await seedDevUser(seed.db, createSeedAuth(seed.db));
} finally {
	await seed.close();
}
console.log(`e2e database ready: ${new URL(url!).pathname.slice(1)}`);
