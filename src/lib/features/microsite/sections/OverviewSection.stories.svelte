<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import OverviewSection from './OverviewSection.svelte';
	import type { OverviewData } from '../types';

	const { Story } = defineMeta({
		title: 'Microsite/Sections/Overview',
		component: OverviewSection,
		parameters: { layout: 'fullscreen' }
	});

	const rumahKabus: OverviewData = {
		type: 'boutique',
		shortDescription:
			'A restored tea-planter’s house in the Cameron Highlands, with four rooms, a wood-fired kitchen and mist at breakfast.',
		paragraphs: [
			'Rumah Kabus sits above the tea terraces at Tanah Rata, a short walk from the old trails. Every room looks out over the hills, and the mornings begin slowly.',
			'Breakfast is cooked on the wood-fired range and served at one long table. The hosts will point you to the quieter paths.'
		],
		placeLabel: 'Tanah Rata, Pahang',
		roomCount: 4,
		maxGuests: 4,
		fromPrice: { amountMinor: 28000, currency: 'MYR' },
		reviews: {
			items: [
				{
					rating: 5,
					title: null,
					body: 'We woke inside a cloud. The loft, the tea and the quiet were all exactly right.',
					authorName: 'Aisha R.',
					stayedOn: '2026-04-02',
					source: 'guest',
					origin: null,
					hostReply: null
				},
				{
					rating: 4,
					title: null,
					body: 'Peaceful place with excellent breakfast and very helpful hosts. The road up is narrow, so a smaller car helps.',
					authorName: 'Jonathan K.',
					stayedOn: null,
					source: 'imported',
					origin: 'Google',
					hostReply: null
				},
				{
					rating: 5,
					title: null,
					body: 'A house with a point of view. We will be back for the next harvest.',
					authorName: 'Mei L.',
					stayedOn: null,
					source: 'imported',
					origin: 'Booking.com',
					hostReply: null
				}
			],
			summary: { count: 3, average: 4.7, guestCount: 1, importedCount: 2 }
		}
	};

	const sparse: OverviewData = {
		type: 'rental',
		shortDescription: null,
		paragraphs: [],
		placeLabel: null,
		roomCount: 0,
		maxGuests: null,
		fromPrice: null,
		reviews: null
	};

	const longText: OverviewData = {
		...rumahKabus,
		shortDescription:
			'An extraordinarily long single sentence about a house that keeps going well past the point where a lead paragraph would normally stop, to test the measure and the wrapping on a phone.',
		paragraphs: Array.from({ length: 4 }, () => rumahKabus.paragraphs.join(' ')),
		reviews: {
			...rumahKabus.reviews!,
			items: [
				{
					...rumahKabus.reviews!.items[0],
					body: 'A very long review. '.repeat(30)
				},
				rumahKabus.reviews!.items[1]
			]
		}
	};
</script>

<Story name="Rumah Kabus" args={{ data: rumahKabus, variant: 'default' }} />
<Story name="Sparse (no rooms, no reviews)" args={{ data: sparse, variant: 'default' }} />
<Story name="Long text" args={{ data: longText, variant: 'default' }} />
