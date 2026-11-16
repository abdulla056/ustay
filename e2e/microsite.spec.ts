import { expect, test } from '@playwright/test';
import { trackErrors } from './support/helpers';

// The config order of the seeded editorial template (registry TEMPLATES.editorial).
const SECTIONS = [
	'hero',
	'overview',
	'gallery',
	'rooms',
	'amenities',
	'host_story',
	'location',
	'booking_cta'
];

test('/s/rumah-kabus renders every section in config order with no console errors', async ({
	page
}) => {
	const tracked = trackErrors(page);
	const response = await page.goto('/s/rumah-kabus');
	expect(response?.status()).toBe(200);
	await expect(page.locator('h1')).toHaveText('Rumah Kabus');
	const order = await page
		.locator('[data-section]')
		.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-section')));
	expect(order).toEqual(SECTIONS);
	await expect(page.locator('[data-zoom-gallery]')).toHaveCount(1);
	await expect(page).toHaveTitle(/^Rumah Kabus · /);
	await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/s\/rumah-kabus$/);
	const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
	expect(JSON.parse(jsonLd!)).toMatchObject({ '@type': 'LodgingBusiness', name: 'Rumah Kabus' });
	expect(tracked.errors).toEqual([]);
});

test('@mobile /s/rumah-kabus renders at phone width without horizontal scroll', async ({
	page
}) => {
	const tracked = trackErrors(page);
	await page.goto('/s/rumah-kabus');
	await expect(page.locator('h1')).toHaveText('Rumah Kabus');
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflow).toBeLessThanOrEqual(0);
	expect(tracked.errors).toEqual([]);
});

test('an unknown slug is a 404', async ({ page }) => {
	const response = await page.goto('/s/no-such-place');
	expect(response?.status()).toBe(404);
});

test('a draft property is a 404', async ({ page }) => {
	const response = await page.goto('/s/e2e-draft');
	expect(response?.status()).toBe(404);
});

test('an old slug 301s to the current one', async ({ request }) => {
	const response = await request.get('/s/e2e-old-name', { maxRedirects: 0 });
	expect(response.status()).toBe(301);
	expect(new URL(response.headers().location, 'http://x').pathname).toBe('/s/e2e-new-name');
});
