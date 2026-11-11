/**
 * Shared constants for the e2e lane (UST-77). The lane owns its own database (`ustay_e2e`, not
 * `ustay_test`) so it can never drop the database a concurrent `bun run test:db` is using.
 */
import { readFileSync } from 'node:fs';
import { resolveE2eDatabaseUrl } from '../../src/lib/server/test/db-url';

export const E2E_PORT = Number(process.env.E2E_PORT ?? 4310);
export const E2E_ORIGIN = `http://localhost:${E2E_PORT}`;

/** `.env` is not loaded into Playwright's process; read just the two keys we need from it. */
function dotenv(key: string): string | undefined {
	try {
		const line = readFileSync('.env', 'utf8')
			.split('\n')
			.find((l) => l.startsWith(`${key}=`));
		return line?.slice(key.length + 1).replace(/^["']|["']$/g, '');
	} catch {
		return undefined;
	}
}

export function e2eDatabaseUrl(): string | undefined {
	return resolveE2eDatabaseUrl({
		E2E_DATABASE_URL: process.env.E2E_DATABASE_URL,
		DATABASE_URL: process.env.DATABASE_URL ?? dotenv('DATABASE_URL')
	});
}

export function authSecret(): string {
	return process.env.BETTER_AUTH_SECRET || dotenv('BETTER_AUTH_SECRET') || '';
}
