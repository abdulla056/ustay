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
		{ category: 'outdoor', label: 'Outdoor', items: [8, 9].map((n) => item(n)) }
	]
};

describe('AmenitiesSection', () => {
	it('renders groups in order, with icons and notes', async () => {
		const screen = render(AmenitiesSection, { data, variant: 'default' });
		const headings = [...document.querySelectorAll('h3')].map((h) => h.textContent?.trim());
		expect(headings).toEqual(['Essentials', 'Kitchen', 'Outdoor']);
		await expect.element(screen.getByText('Amenity 0')).toBeVisible();
		expect(document.querySelectorAll('li svg')).toHaveLength(10);
		expect(document.body.textContent).toContain('A note');
	});

	// Component tests do not load the Tailwind stylesheet and the collapse is a viewport media query,
	// so assert the state the CSS keys off (`data-collapsed`), not computed visibility.
	it('collapses behind a Show all toggle, collapsed from the first render', async () => {
		const screen = render(AmenitiesSection, { data, variant: 'default' });
		const region = () => document.querySelector('[data-collapsed]');
		const toggle = screen.getByRole('button', { name: 'Show all 10 amenities' });
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(region()?.getAttribute('data-collapsed')).toBe('true');
		expect(toggle.element().getAttribute('aria-controls')).toBe(region()?.id);
		await toggle.click();
		const fewer = screen.getByRole('button', { name: 'Show fewer' });
		await expect.element(fewer).toHaveAttribute('aria-expanded', 'true');
		expect(region()?.getAttribute('data-collapsed')).toBe('false');
		await fewer.click();
		await expect
			.element(screen.getByRole('button', { name: 'Show all 10 amenities' }))
			.toHaveFocus();
	});

	it('has no toggle when the list is short', async () => {
		render(AmenitiesSection, { data: { groups: [data.groups[2]] }, variant: 'default' });
		expect(document.querySelector('button')).toBeNull();
	});
});
