/**
 * Runs (under bun) before the e2e server starts: guard, drop + recreate the per-run database,
 * apply the committed migrations, seed the dev user and the sample property "Rumah Kabus"
 * (`/s/rumah-kabus`), plus two fixtures for the microsite route: a draft property and a published
 * one that was renamed (so its old slug must 301). The reset is shared with the db lane
 * (`resetTestDatabase`); the seeds come from the seed modules (UST-10, UST-20).
 */
import { E2E_DB_PATTERN } from '../../src/lib/server/test/db-url';
import { resetTestDatabase } from '../../src/lib/server/test/reset-db';
import { createSeedAuth, createSeedDb } from '../../src/lib/server/db/seed/client';
import { seedDevUser } from '../../src/lib/server/db/seed/dev-user';
import { seedAmenities } from '../../src/lib/server/db/seed/amenities';
import { seedSampleProperty } from '../../src/lib/server/db/seed/sample-property';
import { property, propertySlugRedirect } from '../../src/lib/server/db/schema';
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
	await seedAmenities(seed.db);
	await seedSampleProperty(seed.db);

	const base = { type: 'homestay', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' } as const;
	await seed.db.insert(property).values({ ...base, slug: 'e2e-draft', name: 'E2E Draft' });
	const [renamed] = await seed.db
		.insert(property)
		.values({
			...base,
			slug: 'e2e-new-name',
			name: 'E2E New Name',
			status: 'published',
			publishedAt: new Date()
		})
		.returning({ id: property.id });
	await seed.db
		.insert(propertySlugRedirect)
		.values({ oldSlug: 'e2e-old-name', propertyId: renamed.id });
} finally {
	await seed.close();
}
console.log(`e2e database ready: ${new URL(url!).pathname.slice(1)}`);
