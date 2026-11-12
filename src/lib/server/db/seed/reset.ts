/**
 * `bun run db:reset` — drop and recreate the local database, apply the committed migrations,
 * then seed. A local loop rebuilt from nothing, for whenever the database has drifted too far to
 * want to hand-fix.
 *
 * Steps: drop + recreate the `public` schema (removes every table, including better-auth's) and
 * drop drizzle's `drizzle` schema (its `__drizzle_migrations` ledger, or the migrator would think
 * every migration had already run against the now-empty `public`) →
 * drizzle's migrator (recreates them from `drizzle/`, so the hand-edited SQL is applied) →
 * `runSeed()` (this file's whole reason to import `./index` rather than re-shelling into
 * `bun run db:seed`).
 *
 * Guarded by `checkResetGuard`, which is stricter than `db:seed`'s: dropping a schema is
 * destructive, so `DATABASE_URL`'s hostname must be one `compose.yaml` could have produced.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { assertResetAllowed } from './guard';
import { runSeed } from './index';

export async function runReset(): Promise<void> {
	const databaseUrl = process.env.DATABASE_URL;
	assertResetAllowed({ nodeEnv: process.env.NODE_ENV, databaseUrl });

	const client = postgres(databaseUrl!, { max: 1 });
	try {
		console.log('[reset] dropping schema "public"...');
		await client.unsafe('DROP SCHEMA IF EXISTS public CASCADE');
		await client.unsafe('CREATE SCHEMA public');
		// The migrator's ledger lives outside `public`. Left behind, it marks every migration as
		// applied, so a second reset would only run migrations newer than the last one and fail.
		await client.unsafe('DROP SCHEMA IF EXISTS drizzle CASCADE');
		// Apply the committed migrations, not `drizzle-kit push`: push builds from the TypeScript
		// schema and cannot express the column-scoped `ON DELETE SET NULL (col)` hand-edited into
		// the media/host migrations, so a pushed database fails deleting an avatar or poster asset.
		console.log('[reset] applying migrations...');
		await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
	} finally {
		await client.end();
	}

	console.log('[reset] seeding...');
	await runSeed();
}

const isEntryPoint =
	process.argv[1] != null && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isEntryPoint) {
	try {
		await runReset();
		console.log('[reset] done');
	} catch (error) {
		console.error('[reset] failed:', error);
		process.exitCode = 1;
	}
}
