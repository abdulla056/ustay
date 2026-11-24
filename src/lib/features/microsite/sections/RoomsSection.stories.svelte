<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import RoomsSection from './RoomsSection.svelte';
	import type { RoomsData } from '../types';

	const { Story } = defineMeta({
		title: 'Microsite/Sections/Rooms',
		component: RoomsSection,
		parameters: { layout: 'fullscreen' }
	});

	const photo = (src: string, alt: string) => ({ src, alt, width: 2000, height: 1333 });

	const rumahKabus: RoomsData = {
		rooms: [
			{
				name: 'Tea Loft',
				description:
					'The former tea-sorting room, under the old rafters at the back of the house. A king bed faces a tall window onto the estate terraces, and the room smells faintly of cedar and, on warm afternoons, of leaf.',
				maxGuests: 2,
				beds: [{ type: 'king', count: 1 }],
				nightly: { amountMinor: 42000, currency: 'MYR' },
				image: photo('/prototype/misty-lake.jpg', 'A king bed under old rafters'),
				amenities: [
					{ name: 'Wi-Fi', icon: 'wifi' },
					{ name: 'Hot water', icon: 'hot-water' },
					{ name: 'Writing desk', icon: 'workspace' }
				]
			},
			{
				name: 'Garden Room',
				description:
					'On the ground floor, with its own door onto the lawn and the kitchen garden. A queen bed and a single day bed, a deep bathtub, and a low window that holds the first sun.',
				maxGuests: 3,
				beds: [
					{ type: 'queen', count: 1 },
					{ type: 'single', count: 1 }
				],
				nightly: { amountMinor: 36000, currency: 'MYR' },
				image: photo('/prototype/forest-light.jpg', 'A garden room opening onto the lawn'),
				amenities: [
					{ name: 'Wi-Fi', icon: 'wifi' },
					{ name: 'Bathtub', icon: 'bathtub' }
				]
			},
			{
				name: 'The Long House',
				description:
					'The old annexe, a separate two-room cottage across the lawn for families and small groups.',
				maxGuests: 6,
				beds: [
					{ type: 'queen', count: 1 },
					{ type: 'bunk', count: 2 }
				],
				nightly: { amountMinor: 89000, currency: 'MYR' },
				image: null,
				amenities: [{ name: 'Kitchenette', icon: 'kitchen' }]
			}
		]
	};

	const edge: RoomsData = {
		rooms: [
			{
				name: 'A Room With An Unreasonably Long Name That Wraps Over Several Lines',
				description: null,
				maxGuests: 1,
				beds: [],
				nightly: { amountMinor: 12050, currency: 'MYR' },
				image: null,
				amenities: []
			}
		]
	};
</script>

<Story name="Rumah Kabus" args={{ data: rumahKabus, variant: 'default' }} />
<Story name="Edge: no images, no description" args={{ data: edge, variant: 'default' }} />
