/**
 * End-to-end lane (UST-77): `bun run test:e2e`. Drives a built app (`vite build` + `vite preview`)
 * backed by its own database, `ustay_e2e`, reset + migrated + seeded by `e2e/support/prepare-db.ts`
 * before the server starts. Chromium only: a desktop project and a phone project (`@mobile` tests).
 */
import { defineConfig, devices } from '@playwright/test';
import { authSecret, E2E_ORIGIN, E2E_PORT, e2eDatabaseUrl } from './e2e/support/env';

export default defineConfig({
	testDir: 'e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: { baseURL: E2E_ORIGIN, trace: 'retain-on-failure' },
	projects: [
		{
			name: 'desktop',
			use: { ...devices['Desktop Chrome'] },
			grepInvert: /@mobile/
		},
		{
			// Chromium with a phone viewport (not a WebKit/Safari device profile).
			name: 'phone',
			use: { ...devices['Pixel 7'] },
			grep: /@mobile/
		}
	],
	webServer: {
		command: `bun e2e/support/prepare-db.ts && bun run build && bun run preview --port ${E2E_PORT} --strictPort`,
		url: E2E_ORIGIN,
		reuseExistingServer: false,
		timeout: 240_000,
		env: {
			DATABASE_URL: e2eDatabaseUrl() ?? '',
			E2E_DATABASE_URL: process.env.E2E_DATABASE_URL ?? '',
			BETTER_AUTH_SECRET: authSecret(),
			ORIGIN: E2E_ORIGIN
		}
	}
});
