/**
 * `bun run db:reset` — drop and recreate the local database, push the current schema, then
 * seed. The fast local loop (`docs/DATABASE.md`'s `db:push`) rebuilt from nothing, for whenever
 * the schema has drifted too far to want to hand-fix.
 *
 * Steps: drop + recreate the `public` schema (removes every table, including better-auth's) →
 * `drizzle-kit push --force` (recreates them from `src/lib/server/db/schema.ts`, no prompts) →
 * `runSeed()` (this file's whole reason to import `./index` rather than re-shelling into
 * `bun run db:seed`).
 *
 * Guarded by `checkResetGuard`, which is stricter than `db:seed`'s: dropping a schema is
 * destructive, so `DATABASE_URL`'s hostname must be one `compose.yaml` could have produced.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import postgres from 'postgres';
import { assertResetAllowed } from './guard';
import { runSeed } from './index';

function pushSchema(databaseUrl: string): void {
	const result = spawnSync('bunx', ['drizzle-kit', 'push', '--force'], {
		stdio: 'inherit',
		env: { ...process.env, DATABASE_URL: databaseUrl }
	});
	if (result.status !== 0) {
		throw new Error(`drizzle-kit push exited with code ${result.status ?? 'unknown'}`);
	}
}

export async function runReset(): Promise<void> {
	const databaseUrl = process.env.DATABASE_URL;
	assertResetAllowed({ nodeEnv: process.env.NODE_ENV, databaseUrl });

	const client = postgres(databaseUrl!, { max: 1 });
	try {
		console.log('[reset] dropping schema "public"...');
		await client.unsafe('DROP SCHEMA IF EXISTS public CASCADE');
		await client.unsafe('CREATE SCHEMA public');
	} finally {
		await client.end();
	}

	console.log('[reset] pushing schema...');
	pushSchema(databaseUrl!);

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
