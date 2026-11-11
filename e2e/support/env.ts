/**
 * Shared constants for the e2e lane (UST-77). The lane owns its own per-run database
 * (`ustay_e2e_<port>`, not `ustay_test`), so it can never drop the database a concurrent
 * `bun run test:db` or another e2e run on a different port is using.
 */
import { loadEnv } from 'vite';
import { resolveE2eDatabaseUrl } from '../../src/lib/server/test/db-url';

const dotenv = loadEnv('test', process.cwd(), '');

function resolvePort(raw: string | undefined): number {
	const port = Number(raw || 4310);
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new Error(`E2E_PORT must be an integer from 1 to 65535, got "${raw}"`);
	}
	return port;
}

export const E2E_PORT = resolvePort(process.env.E2E_PORT);
export const E2E_ORIGIN = `http://localhost:${E2E_PORT}`;

export function e2eDatabaseUrl(): string | undefined {
	return resolveE2eDatabaseUrl(
		{
			E2E_DATABASE_URL: process.env.E2E_DATABASE_URL || undefined,
			DATABASE_URL: process.env.DATABASE_URL ?? dotenv.DATABASE_URL
		},
		E2E_PORT
	);
}

export function authSecret(): string {
	return process.env.BETTER_AUTH_SECRET || dotenv.BETTER_AUTH_SECRET || '';
}
