import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import OverviewSection from './OverviewSection.svelte';
import type { OverviewData } from '../types';

const base: OverviewData = {
	type: 'boutique',
	shortDescription: 'A restored house above the tea.',
	paragraphs: ['First paragraph.', 'Second paragraph.'],
	placeLabel: 'Tanah Rata, Pahang',
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
		const screen = render(OverviewSection, { data: base, variant: 'default', number: '01' });
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
			placeLabel: null,
			roomCount: 0,
			maxGuests: null,
			fromPrice: null,
			reviews: null
		};
		const screen = render(OverviewSection, { data, variant: 'default' });
		await expect.element(screen.getByRole('heading', { level: 2 })).toBeVisible();
		expect(document.querySelector('figure')).toBeNull();
	});

	it('shows the spine number it is given, and none when null', async () => {
		const screen = render(OverviewSection, { data: base, variant: 'default', number: '03' });
		await expect
			.element(screen.getByRole('heading', { level: 2 }))
			.toHaveTextContent('03 — The house');
		screen.unmount();
		const bare = render(OverviewSection, { data: base, variant: 'default', number: null });
		await expect.element(bare.getByRole('heading', { level: 2 })).toHaveTextContent(/^The house$/);
	});

	it('shows the place label in the key facts', async () => {
		const screen = render(OverviewSection, { data: base, variant: 'default' });
		await expect.element(screen.getByText('Tanah Rata, Pahang')).toBeVisible();
	});

	it('gives the rating to screen readers as words', async () => {
		render(OverviewSection, { data: base, variant: 'default' });
		expect(document.body.textContent).toContain('rated 5 out of 5');
	});

	it('never features a wall of text: it truncates the shortest long review', async () => {
		const long = (n: number) => 'word '.repeat(n);
		const data: OverviewData = {
			...base,
			reviews: {
				...base.reviews!,
				items: [
					{ ...base.reviews!.items[0], body: long(120) },
					{ ...base.reviews!.items[1], body: long(80) }
				]
			}
		};
		render(OverviewSection, { data, variant: 'default' });
		const featured = document.querySelector('[data-testid="featured-review"] blockquote')!;
		expect(featured.textContent!.length).toBeLessThan(300);
		expect(featured.textContent).toContain('…');
		// The long second review is not repeated as a smaller quote.
		expect(document.querySelectorAll('figure')).toHaveLength(1);
	});

	it('keeps the review count when there are no items to quote', async () => {
		const data: OverviewData = {
			...base,
			reviews: { items: [], summary: { count: 2, average: 4.5, guestCount: 1, importedCount: 1 } }
		};
		const screen = render(OverviewSection, { data, variant: 'default' });
		await expect.element(screen.getByText(/2 reviews, 1 imported/)).toBeVisible();
		expect(document.querySelector('figure')).toBeNull();
	});

	it('renders no description wrappers when there is no description', async () => {
		render(OverviewSection, {
			data: { ...base, shortDescription: null, paragraphs: [] },
			variant: 'default'
		});
		expect(document.querySelector('.max-w-measure')).toBeNull();
	});
});
