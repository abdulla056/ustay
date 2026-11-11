import { expect, test } from '@playwright/test';
import { trackErrors } from './support/helpers';

// Each page and a landmark that proves it rendered (not just that the document loaded).
const PAGES = [
	{ path: '/', landmark: 'h1' },
	{ path: '/tokens', landmark: 'h1' },
	{ path: '/motion', landmark: 'h1' },
	{ path: '/prototype', landmark: 'h1' }
];

for (const { path, landmark } of PAGES) {
	test(`${path} returns 200 with no console errors`, async ({ page, baseURL }) => {
		// Third-party origins (Google Fonts on /prototype) must not decide the result: answer them
		// locally with an empty 200, so the page never depends on the outside network.
		await page.route(
			(url) => url.origin !== new URL(baseURL!).origin,
			(route) =>
				route.fulfill({
					status: 200,
					contentType: route.request().resourceType() === 'stylesheet' ? 'text/css' : 'text/plain',
					body: ''
				})
		);
		const tracked = trackErrors(page);
		const response = await page.goto(path);
		expect(response?.status()).toBe(200);
		await expect(page.locator(landmark).first()).toBeVisible();
		expect(tracked.errors).toEqual([]);
	});
}
