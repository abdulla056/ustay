import { expect, test } from '@playwright/test';
import { DEV_USER, signIn, signInAsDev } from './support/helpers';

// How the slash in the query is encoded (`/` vs `%2F`) is the app's business: match decoded.
const signInRedirect = (url: URL) =>
	url.pathname === '/sign-in' && url.searchParams.get('redirectTo') === '/dashboard';

test('signed out, /dashboard redirects to sign-in with redirectTo', async ({ page }) => {
	await page.goto('/dashboard');
	await expect(page).toHaveURL(signInRedirect);
});

test('sign in as the dev user lands on /dashboard', async ({ page }) => {
	await signInAsDev(page);
});

test.describe('without JavaScript', () => {
	test.use({ javaScriptEnabled: false });

	test('sign in lands on /dashboard', async ({ page }) => {
		await signIn(page, DEV_USER.email, DEV_USER.password);
		await expect(page).toHaveURL('/dashboard');
		await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
	});
});

test('wrong password shows the error and stays on /sign-in', async ({ page }) => {
	await signIn(page, DEV_USER.email, 'not-the-password');
	await expect(page.getByRole('alert')).toContainText('don’t match');
	await expect(page).toHaveURL(/\/sign-in/);
});

test('sign up a fresh user lands on /dashboard', async ({ page }) => {
	const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ustay.test`;
	await page.goto('/sign-up');
	await page.getByLabel('Name').fill('E2E User');
	await page.getByLabel('Email').fill(email);
	await page.getByLabel('Password').fill('a-long-enough-password');
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page).toHaveURL('/dashboard');
	await expect(page.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeVisible();
});

test('sign out from the dashboard ends the session', async ({ page }) => {
	await signInAsDev(page);
	await page.getByRole('button', { name: 'Sign out' }).click();
	await expect(page).toHaveURL(/\/sign-in/);
	await page.goto('/dashboard');
	await expect(page).toHaveURL(signInRedirect);
});

test('signed in, /sign-in redirects to /dashboard', async ({ page }) => {
	await signInAsDev(page);
	await page.goto('/sign-in');
	await expect(page).toHaveURL('/dashboard');
});
