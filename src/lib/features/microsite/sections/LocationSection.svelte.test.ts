import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import LocationSection from './LocationSection.svelte';
import type { LocationData } from '../types';

const attraction = {
	name: 'Warung Kak Ros',
	category: 'restaurant',
	hostNote: 'Sells out by ten.',
	travel: { minutes: 8, mode: 'walk' },
	distanceMeters: null,
	latitude: null,
	longitude: null,
	url: null,
	image: null
};

const base: LocationData = {
	place: {
		label: 'Cameron Highlands, Pahang',
		locality: 'Cameron Highlands',
		region: 'Pahang',
		countryCode: 'MY',
		latitude: 4.418,
		longitude: 101.38,
		exact: false,
		addressLines: []
	},
	destination: { name: 'Cameron Highlands', summary: 'Tea and cloud.' },
	attractions: [
		attraction,
		{
			...attraction,
			name: 'Kopi Lumut',
			url: 'https://example.test/k',
			travel: null,
			distanceMeters: 6200
		}
	]
};

describe('LocationSection', () => {
	it('renders the label, summary, and the attraction list without the map', async () => {
		const screen = render(LocationSection, { data: base, variant: 'default' });
		await expect
			.element(screen.getByRole('heading', { level: 2, name: 'Cameron Highlands, Pahang' }))
			.toBeVisible();
		await expect.element(screen.getByText('Tea and cloud.')).toBeVisible();
		await expect.element(screen.getByText('8 min walk')).toBeVisible();
		await expect.element(screen.getByText('6.2 km')).toBeVisible();
		await expect.element(screen.getByRole('link', { name: /Kopi Lumut/ })).toBeVisible();
		expect(document.querySelectorAll('ol > li')).toHaveLength(2);
	});

	it('draws no map when the place has no coordinates', async () => {
		render(LocationSection, {
			data: { ...base, place: { ...base.place!, latitude: null, longitude: null } },
			variant: 'default'
		});
		expect(document.querySelector('[data-map-status]')).toBeNull();
	});

	it('keeps the map host inert and hidden until it is ready', async () => {
		render(LocationSection, { data: base, variant: 'default' });
		const wrapper = document.querySelector('[data-map-status]')!;
		const host = wrapper.querySelector('[role="region"]')!;
		if (wrapper.getAttribute('data-map-status') !== 'ready') {
			expect(host.hasAttribute('inert')).toBe(true);
			expect(host.classList.contains('invisible')).toBe(true);
		}
		if (['idle', 'loading'].includes(wrapper.getAttribute('data-map-status')!)) {
			expect(wrapper.textContent).toContain('about 2 km across');
		}
	});

	it('shows address lines only when given', async () => {
		const screen = render(LocationSection, {
			data: { ...base, place: { ...base.place!, exact: true, addressLines: ['Jalan Teh'] } },
			variant: 'default'
		});
		await expect.element(screen.getByText('Jalan Teh')).toBeVisible();
	});
});
