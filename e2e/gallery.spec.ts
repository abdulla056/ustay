import { expect, test } from '@playwright/test';
import { trackErrors } from './support/helpers';

test('gallery: "View all photographs" opens the lightbox; arrows step; Esc closes', async ({
	page
}) => {
	const tracked = trackErrors(page);
	await page.goto('/s/rumah-kabus');
	const button = page.getByRole('button', { name: 'View all photographs' });
	await button.scrollIntoViewIfNeeded();
	await button.click();

	const dialog = page.getByRole('dialog', { name: 'Photograph viewer' });
	await expect(dialog).toBeVisible();
	await expect(dialog.getByText('1 / 7')).toBeVisible();
	await expect(dialog.locator('figure img')).toHaveAttribute('alt', /Morning light/);

	await page.keyboard.press('ArrowRight');
	await expect(dialog.getByText('2 / 7')).toBeVisible();
	await page.keyboard.press('ArrowLeft');
	await page.keyboard.press('ArrowLeft');
	await expect(dialog.getByText('7 / 7')).toBeVisible();

	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(button).toBeFocused();
	expect(tracked.errors).toEqual([]);
});
