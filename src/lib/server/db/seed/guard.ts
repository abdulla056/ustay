/**
 * Local/dev-only guard for the seed runner (UST-10), as a **pure decision function** — the same
 * shape as `$lib/server/auth-guard.ts`'s `guardRoute()`. Deliberately dependency-free (no `$env`,
 * no `db`, no `bun`-only APIs) so it is unit-testable with no database and no process
 * environment (`guard.test.ts`); `index.ts` and `reset.ts` are the only callers that read
 * `process.env` and turn a refusal into a thrown `Error`.
 *
 * `db:seed` only ever upserts, so the bar is "never touch production" (`checkSeedGuard`).
 * `db:reset` drops the whole `public` schema, so it additionally refuses any `DATABASE_URL`
 * whose host isn't one `compose.yaml` / `.env.example` could plausibly have produced
 * (`checkResetGuard`) — the local-only convention `docs/DATABASE.md` already asks of `db:push`,
 * made mechanical here because reset is destructive rather than additive.
 */

export type SeedGuardEnv = {
	/** `process.env.NODE_ENV`. Production is the only value that ever refuses `db:seed`. */
	readonly nodeEnv: string | undefined;
	/** `process.env.DATABASE_URL`. Required; `db:reset` additionally checks its hostname. */
	readonly databaseUrl: string | undefined;
};

export type GuardResult =
	{ readonly allowed: true } | { readonly allowed: false; readonly reason: string };

const ALLOW: GuardResult = { allowed: true };

function deny(reason: string): GuardResult {
	return { allowed: false, reason };
}

/**
 * Hostnames `compose.yaml` + `.env.example` ever produce: `localhost`/`127.0.0.1` for a host
 * machine reaching the container, `db` for anything running inside the compose network. Anything
 * else — a managed Postgres host, a real domain — is refused by `checkResetGuard`.
 */
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', 'db']);

/** Shared by both guards: refuse in production, require `DATABASE_URL` to be set at all. */
export function checkSeedGuard({ nodeEnv, databaseUrl }: SeedGuardEnv): GuardResult {
	if (nodeEnv === 'production') {
		return deny('NODE_ENV is "production" — seeding never runs there.');
	}
	if (!databaseUrl) {
		return deny('DATABASE_URL is not set.');
	}
	return ALLOW;
}

/** `checkSeedGuard`, plus a hostname allowlist — `db:reset` drops the schema, so it must not be
 * able to point at anything but a database `compose.yaml` could have produced. */
export function checkResetGuard(env: SeedGuardEnv): GuardResult {
	const seedResult = checkSeedGuard(env);
	if (!seedResult.allowed) return seedResult;

	let hostname: string;
	try {
		hostname = new URL(env.databaseUrl!).hostname;
	} catch {
		return deny(`DATABASE_URL is not a valid URL: ${env.databaseUrl}`);
	}

	if (!LOCAL_HOSTNAMES.has(hostname)) {
		return deny(
			`DATABASE_URL host "${hostname}" is not a recognised local database ` +
				`(expected one of ${[...LOCAL_HOSTNAMES].join(', ')}). db:reset drops the "public" ` +
				'schema and refuses to run anywhere that might be shared or production.'
		);
	}
	return ALLOW;
}

export function assertSeedAllowed(env: SeedGuardEnv): void {
	const result = checkSeedGuard(env);
	if (!result.allowed) throw new Error(`Refusing to seed: ${result.reason}`);
}

export function assertResetAllowed(env: SeedGuardEnv): void {
	const result = checkResetGuard(env);
	if (!result.allowed) throw new Error(`Refusing to reset: ${result.reason}`);
}
