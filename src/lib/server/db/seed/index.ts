/**
 * Seed runner — `bun run db:seed`. See `docs/DATABASE.md` ("Seeding") for the full picture; this
 * file is deliberately thin.
 *
 * Growth convention: one file per aggregate, next to this one, exporting a `SeedModule`. Push it
 * onto `seedModules` below in the order it must run (a booking after the property it books,
 * etc). `dev-user.ts` is module #1 and the template every Phase-1 module should copy — check
 * existence, create through the appropriate API (better-auth here; a repository `insert…` for a
 * domain table), never hand-write SQL.
 */
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertSeedAllowed } from './guard';
import { createSeedAuth, createSeedDb, type SeedAuth, type SeedDb } from './client';
import { seedDevUser, type SeedModuleResult } from './dev-user';

export type SeedContext = { readonly db: SeedDb; readonly auth: SeedAuth };

export type SeedModule = {
	readonly name: string;
	readonly run: (ctx: SeedContext) => Promise<SeedModuleResult>;
};

export const seedModules: readonly SeedModule[] = [
	{ name: 'dev-user', run: (ctx) => seedDevUser(ctx.db, ctx.auth) }
];

export async function runSeed(): Promise<void> {
	assertSeedAllowed({ nodeEnv: process.env.NODE_ENV, databaseUrl: process.env.DATABASE_URL });

	const { db, close } = createSeedDb(process.env.DATABASE_URL!);
	const auth = createSeedAuth(db);

	try {
		for (const seedModule of seedModules) {
			const result = await seedModule.run({ db, auth });
			console.log(
				`[seed] ${seedModule.name}: ${result.created ? 'created' : 'skipped'} — ${result.detail}`
			);
		}
	} finally {
		await close();
	}
}

/** True only when this file is the process entry point — not when `reset.ts` imports `runSeed`. */
const isEntryPoint =
	process.argv[1] != null && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isEntryPoint) {
	try {
		await runSeed();
		console.log('[seed] done');
	} catch (error) {
		console.error('[seed] failed:', error);
		process.exitCode = 1;
	}
}
