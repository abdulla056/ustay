import { expect, test } from '@playwright/test';

// UST-60 mobile menu: a `<dialog>` opened by the `Menu` toggle (shown below `md`).
// The toggle is located by `aria-controls` rather than role: while the modal is open the
// rest of the page is inert, and the toggle keeps `aria-expanded="true"` until the exit ends.
test('@mobile nav menu toggle opens and Escape closes it', async ({ page }) => {
	await page.goto('/');

	const toggle = page.locator('button[aria-haspopup="dialog"][aria-controls]');
	const menu = page.getByRole('dialog', { name: 'Menu' });

	await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-expanded', 'true');
	await expect(menu).toBeVisible();
	await expect(page.getByRole('button', { name: 'Close menu' })).toBeFocused();

	await page.keyboard.press('Escape');
	await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	await expect(menu).toBeHidden();
});

test('@mobile nav menu Close button closes it', async ({ page }) => {
	await page.goto('/');

	const toggle = page.locator('button[aria-haspopup="dialog"][aria-controls]');
	await toggle.click();
	await expect(toggle).toHaveAttribute('aria-expanded', 'true');

	await page.getByRole('button', { name: 'Close menu' }).click();
	await expect(toggle).toHaveAttribute('aria-expanded', 'false');
	await expect(page.getByRole('dialog', { name: 'Menu' })).toBeHidden();
});
