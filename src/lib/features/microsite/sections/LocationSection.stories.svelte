<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import LocationSection from './LocationSection.svelte';
	import type { LocationData } from '../types';

	const rumahKabus: LocationData = {
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
		destination: {
			name: 'Cameron Highlands',
			summary:
				'Tea terraces and mossy forest at fifteen hundred metres, where the evenings are cool enough for a blanket and the mornings begin in cloud.'
		},
		attractions: [
			{
				name: 'Ladang Teh Bukit Sinar',
				category: 'nature',
				hostNote:
					'Start at the factory gate at seven, before the pickers reach the top terraces. Walk the contour path to the end and back; it takes about two hours.',
				travel: { minutes: 12, mode: 'walk' },
				distanceMeters: null,
				latitude: 4.4225,
				longitude: 101.3745,
				url: null,
				image: {
					src: '/prototype/hero-forest.jpg',
					alt: 'Tea terraces in morning mist',
					width: 2000,
					height: 1333
				}
			},
			{
				name: 'Warung Kak Ros',
				category: 'restaurant',
				hostNote: 'Kak Ros makes nasi lemak from five and sells out by ten.',
				travel: { minutes: 8, mode: 'walk' },
				distanceMeters: null,
				latitude: 4.4148,
				longitude: 101.3818,
				url: null,
				image: null
			},
			{
				name: 'Kopi Lumut',
				category: 'cafe',
				hostNote: 'A roaster in a converted shophouse with three tables.',
				travel: { minutes: 10, mode: 'drive' },
				distanceMeters: null,
				latitude: 4.456,
				longitude: 101.39,
				url: 'https://example.test/kopi-lumut',
				image: null
			},
			{
				name: 'Ringlet Bus Stop',
				category: 'transport',
				hostNote:
					'Coaches from Kuala Lumpur and Ipoh stop here, about six kilometres down the hill.',
				travel: null,
				distanceMeters: 6200,
				latitude: null,
				longitude: null,
				url: null,
				image: null
			}
		]
	};

	// Entrance motion fades content in; axe must see the settled state, not a mid-fade frame.
	const settle = async () => {
		await new Promise((resolve) => setTimeout(resolve, 2500));
	};

	const { Story } = defineMeta({
		title: 'Microsite/Sections/Location',
		component: LocationSection,
		parameters: { layout: 'fullscreen' }
	});
</script>

<Story
	play={settle}
	name="Rumah Kabus (approximate)"
	args={{ data: rumahKabus, variant: 'default' }}
/>

<Story
	play={settle}
	name="Exact location"
	args={{
		data: {
			...rumahKabus,
			place: {
				...rumahKabus.place!,
				exact: true,
				addressLines: ['Jalan Bukit Sinar', '39200 Ringlet']
			}
		},
		variant: 'default'
	}}
/>

<Story
	play={settle}
	name="Edge: no coordinates, one attraction, no summary"
	args={{
		data: {
			place: { ...rumahKabus.place!, latitude: null, longitude: null },
			destination: null,
			attractions: [
				{
					...rumahKabus.attractions[0],
					name: 'A very long attraction name that goes on and on to test how the heading wraps',
					hostNote: 'A long note. '.repeat(30)
				}
			]
		},
		variant: 'default'
	}}
/>
