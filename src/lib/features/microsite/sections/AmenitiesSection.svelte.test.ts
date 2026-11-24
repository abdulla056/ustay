import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AmenitiesSection from './AmenitiesSection.svelte';
import type { AmenitiesData } from '../types';

const item = (n: number, note: string | null = null) => ({
	key: `k${n}`,
	name: `Amenity ${n}`,
	icon: n === 0 ? 'wifi' : 'unknown',
	note
});

const data: AmenitiesData = {
	groups: [
		{ category: 'essentials', label: 'Essentials', items: [0, 1, 2, 3, 4].map((n) => item(n)) },
		{ category: 'kitchen', label: 'Kitchen', items: [5, 6, 7].map((n) => item(n, 'A note')) },
		{ category: 'outdoor', label: 'Outdoor', items: [8, 9].map((n) => item(n)) },
		{ category: 'family', label: 'Family', items: [] }
	]
};

describe('AmenitiesSection', () => {
	it('renders groups in order with notes, skipping empty groups', async () => {
		const screen = render(AmenitiesSection, { data, variant: 'default' });
		const headings = [...document.querySelectorAll('h3')].map((h) => h.textContent?.trim());
		expect(headings).toEqual(['Essentials', 'Kitchen', 'Outdoor']);
		await expect.element(screen.getByText('Amenity 0')).toBeVisible();
		expect(document.querySelectorAll('li svg')).toHaveLength(10);
		expect(document.body.textContent).toContain('A note');
	});

	// Component tests do not load the Tailwind stylesheet, so assert the collapse classes, not
	// computed visibility (the phone layout is checked by eye and in e2e).
	it('collapses behind a Show all toggle once mounted', async () => {
		const screen = render(AmenitiesSection, { data, variant: 'default' });
		const hidden = () => document.querySelectorAll('.max-md\\:hidden').length;
		const toggle = screen.getByRole('button', { name: 'Show all 10 amenities' });
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(hidden()).toBeGreaterThan(0);
		await toggle.click();
		await expect
			.element(screen.getByRole('button', { name: 'Show fewer' }))
			.toHaveAttribute('aria-expanded', 'true');
		expect(hidden()).toBe(0);
	});

	it('shows a quiet message when there are no amenities', async () => {
		const screen = render(AmenitiesSection, { data: { groups: [] }, variant: 'default' });
		await expect.element(screen.getByText(/not listed amenities/)).toBeVisible();
		expect(document.querySelector('button')).toBeNull();
	});
});
