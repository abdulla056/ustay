/**
 * Standalone Postgres + better-auth wiring for seed scripts.
 *
 * `bun run db:seed` / `db:reset` run as plain `bun` processes, never through Vite — so the
 * SvelteKit virtual modules `$lib/server/db/index.ts` and `$lib/server/auth.ts` depend on
 * (`$env/dynamic/private`, `$app/server`) do not exist here; importing either throws
 * `Cannot find module '$env/dynamic/private'` outside a Vite build. `bun run` does load `.env`
 * itself, though, so `process.env.DATABASE_URL` is available with no extra setup.
 *
 * This module re-creates the same two pieces — a Drizzle client, a better-auth instance — from
 * `process.env` directly. It shares `../schema` (no `$env` dependency of its own) with the real
 * `db` client, so seed data is written through the exact same table shapes; only the *transport*
 * differs. No cookie plugin: seed scripts call `auth.api.*` in-process, never over HTTP, so there
 * is no request to attach a session cookie to.
 */
import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema';

export function createSeedDb(databaseUrl: string) {
	const client = postgres(databaseUrl);
	const db = drizzle(client, { schema });
	return { db, close: () => client.end() };
}

export type SeedDb = ReturnType<typeof createSeedDb>['db'];

export function createSeedAuth(db: SeedDb) {
	return betterAuth({
		secret: process.env.BETTER_AUTH_SECRET || undefined,
		database: drizzleAdapter(db, { provider: 'pg' }),
		emailAndPassword: { enabled: true }
	});
}

export type SeedAuth = ReturnType<typeof createSeedAuth>;
