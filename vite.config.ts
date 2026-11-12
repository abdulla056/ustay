import tailwindcss from '@tailwindcss/vite';

import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import { playwright } from '@vitest/browser-playwright';
import adapter from '@sveltejs/adapter-cloudflare';
import { sveltekit } from '@sveltejs/kit/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { resolveTestDatabaseUrl } from './src/lib/server/test/db-url';

const dirname =
	typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// DB integration lane (UST-41, `*.db.test.ts`, `bun run test:db`). Tests run against `ustay_test`,
// never the dev database. The `db` project's `test.env` carries the test URL, and its alias swaps
// SvelteKit's build-time `$env/dynamic/private` snapshot (which would hold `.env`'s DATABASE_URL)
// for `src/lib/server/test/env.ts`, which reads that `test.env`. Other projects are untouched.
// The global setup re-checks the URL (host, db name) before dropping anything.
const DB_TEST_GLOB = 'src/**/*.db.test.{js,ts}';
const dbTestEnv: Record<string, string> = {};
if (process.env.VITEST) {
	const dotenv = loadEnv('test', dirname, '');
	const testUrl = resolveTestDatabaseUrl({
		TEST_DATABASE_URL: process.env.TEST_DATABASE_URL ?? dotenv.TEST_DATABASE_URL,
		DATABASE_URL: process.env.DATABASE_URL ?? dotenv.DATABASE_URL
	});
	if (testUrl) {
		dbTestEnv.TEST_DATABASE_URL = testUrl;
		dbTestEnv.DATABASE_URL = testUrl;
	}
	const secret = process.env.BETTER_AUTH_SECRET ?? dotenv.BETTER_AUTH_SECRET;
	if (secret) dbTestEnv.BETTER_AUTH_SECRET = secret;
	if (process.env.ORIGIN ?? dotenv.ORIGIN) dbTestEnv.ORIGIN = process.env.ORIGIN ?? dotenv.ORIGIN;
}

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// Deploys to Cloudflare Pages. See https://svelte.dev/docs/kit/adapter-cloudflare
			adapter: adapter(),

			typescript: {
				config: (config) => {
					config.include.push('../drizzle.config.ts', '../playwright.config.ts', '../e2e/**/*.ts');
				}
			}
		})
	],
	test: {
		expect: { requireAssertions: true },
		// No tests exist yet; suites are added alongside components/stories in later work.
		passWithNoTests: true,
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**', DB_TEST_GLOB]
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}', DB_TEST_GLOB]
				}
			},

			{
				extends: './vite.config.ts',
				resolve: {
					alias: { '$env/dynamic/private': path.join(dirname, 'src/lib/server/test/env.ts') }
				},
				test: {
					name: 'db',
					environment: 'node',

					include: [DB_TEST_GLOB],
					env: dbTestEnv,
					globalSetup: ['src/lib/server/test/global-setup.ts'],
					setupFiles: ['src/lib/server/test/setup.ts'],
					// One shared database: files must not interleave their truncates.
					fileParallelism: false
				}
			},

			{
				extends: true,
				plugins: [storybookTest({ configDir: path.join(dirname, '.storybook') })],
				// `@storybook/addon-vitest`'s setup file pulls in `@testing-library/dom`,
				// whose transitive deps (`aria-query`, `lz-string`) are CJS. Vite doesn't
				// pre-bundle nested deps by default, so they get served raw and their
				// named/default exports go missing at import time. Pre-bundling the whole
				// chain converts them to ESM properly.
				optimizeDeps: {
					include: ['@testing-library/dom', 'aria-query', 'lz-string']
				},
				test: {
					name: 'storybook',
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [{ browser: 'chromium' }]
					}
				}
			}
		]
	}
});
