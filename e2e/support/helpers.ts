import { expect, type Page } from '@playwright/test';

/** The seeded dev user (src/lib/server/db/seed/dev-user.ts). Duplicated so e2e imports no app code. */
export const DEV_USER = { email: 'owner@ustay.test', password: 'ustay-dev-password' } as const;

export async function signIn(page: Page, email: string, password: string) {
	await page.goto('/sign-in');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill(password);
	await page.getByRole('button', { name: 'Sign in' }).click();
}

export async function signInAsDev(page: Page) {
	await signIn(page, DEV_USER.email, DEV_USER.password);
	await expect(page).toHaveURL('/dashboard');
	await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
}

/** Collects console errors and uncaught page errors; assert on `.errors` at the end. */
export function trackErrors(page: Page) {
	const errors: string[] = [];
	page.on('console', (m) => {
		if (m.type() === 'error') errors.push(`console: ${m.text()}`);
	});
	page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
	return { errors };
}
