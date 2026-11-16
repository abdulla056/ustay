import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import RoomsSection from './RoomsSection.svelte';
import LocationSection from './LocationSection.svelte';
import OverviewSection from './OverviewSection.svelte';

// The schema allows duplicate room names, attraction names, paragraphs and reviews: lists must not
// key on them (Svelte throws `each_key_duplicate` in dev).
describe('sections with duplicate list items', () => {
	it('renders two rooms with the same name', async () => {
		const room = {
			name: 'Garden Room',
			description: null,
			maxGuests: 2,
			beds: [],
			nightly: { amountMinor: 28000, currency: 'MYR' },
			image: null,
			amenities: []
		};
		const screen = render(RoomsSection, {
			data: { rooms: [room, { ...room }] },
			variant: 'default'
		});
		await expect
			.element(screen.getByRole('heading', { name: 'Garden Room' }).first())
			.toBeVisible();
		expect(document.querySelectorAll('article')).toHaveLength(2);
	});

	it('renders duplicate attractions', async () => {
		const attraction = {
			name: 'Tea Estate',
			category: 'nature',
			hostNote: null,
			travel: null,
			distanceMeters: null,
			url: null,
			image: null
		};
		const screen = render(LocationSection, {
			data: { place: null, destination: null, attractions: [attraction, { ...attraction }] },
			variant: 'default'
		});
		await expect.element(screen.getByRole('heading', { name: 'Tea Estate' }).first()).toBeVisible();
		expect(document.querySelectorAll('[data-section="location"] h3')).toHaveLength(2);
	});

	it('renders duplicate paragraphs and reviews', async () => {
		const review = {
			rating: 5,
			title: null,
			body: 'Lovely.',
			authorName: 'A. B.',
			stayedOn: null,
			source: 'guest' as const,
			origin: null,
			hostReply: null
		};
		const screen = render(OverviewSection, {
			data: {
				type: 'homestay',
				shortDescription: null,
				paragraphs: ['Same.', 'Same.'],
				roomCount: 0,
				maxGuests: null,
				fromPrice: null,
				reviews: {
					items: [review, { ...review }],
					summary: { count: 2, average: 5, guestCount: 2, importedCount: 0 }
				}
			},
			variant: 'default'
		});
		await expect.element(screen.getByRole('heading', { name: 'The house' })).toBeVisible();
		expect(document.querySelectorAll('figure')).toHaveLength(2);
	});
});
