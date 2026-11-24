import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import OverviewSection from './OverviewSection.svelte';
import type { OverviewData } from '../types';

const base: OverviewData = {
	type: 'boutique',
	shortDescription: 'A restored house above the tea.',
	paragraphs: ['First paragraph.', 'Second paragraph.'],
	roomCount: 4,
	maxGuests: 6,
	fromPrice: { amountMinor: 28000, currency: 'MYR' },
	reviews: {
		items: [
			{
				rating: 5,
				title: null,
				body: 'Lovely quiet stay.',
				authorName: 'Aisha R.',
				stayedOn: null,
				source: 'guest',
				origin: null,
				hostReply: null
			},
			{
				rating: 4,
				title: null,
				body: 'Great breakfast.',
				authorName: 'Jonathan K.',
				stayedOn: null,
				source: 'imported',
				origin: 'Google',
				hostReply: null
			}
		],
		summary: { count: 2, average: 4.5, guestCount: 1, importedCount: 1 }
	}
};

describe('OverviewSection', () => {
	it('renders the spine heading, descriptions and key facts', async () => {
		const screen = render(OverviewSection, { data: base, variant: 'default' });
		await expect
			.element(screen.getByRole('heading', { level: 2 }))
			.toHaveTextContent('01 — The house');
		await expect.element(screen.getByText('A restored house above the tea.')).toBeVisible();
		await expect.element(screen.getByText('Second paragraph.')).toBeVisible();
		await expect.element(screen.getByText('Up to 6')).toBeVisible();
		await expect.element(screen.getByText(/RM\s?280/)).toBeVisible();
	});

	it('labels every imported review with its origin', async () => {
		const screen = render(OverviewSection, { data: base, variant: 'default' });
		await expect.element(screen.getByText('via Google')).toBeVisible();
		await expect.element(screen.getByText('Verified guest')).toBeVisible();
	});

	it('falls back to a generic label when an imported review has no origin', async () => {
		const data: OverviewData = {
			...base,
			reviews: {
				...base.reviews!,
				items: [{ ...base.reviews!.items[1], origin: null }]
			}
		};
		const screen = render(OverviewSection, { data, variant: 'default' });
		await expect.element(screen.getByText('Imported review')).toBeVisible();
	});

	it('renders without rooms, reviews or descriptions', async () => {
		const data: OverviewData = {
			...base,
			shortDescription: null,
			paragraphs: [],
			roomCount: 0,
			maxGuests: null,
			fromPrice: null,
			reviews: null
		};
		const screen = render(OverviewSection, { data, variant: 'default' });
		await expect.element(screen.getByRole('heading', { level: 2 })).toBeVisible();
		expect(document.querySelector('figure')).toBeNull();
	});
});
