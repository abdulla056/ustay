import { expect, test } from '@playwright/test';
import { trackErrors } from './support/helpers';

for (const path of ['/', '/tokens', '/motion', '/prototype']) {
	test(`${path} returns 200 with no console errors`, async ({ page }) => {
		const tracked = trackErrors(page);
		const response = await page.goto(path);
		expect(response?.status()).toBe(200);
		await page.waitForLoadState('networkidle');
		expect(tracked.errors).toEqual([]);
	});
}
