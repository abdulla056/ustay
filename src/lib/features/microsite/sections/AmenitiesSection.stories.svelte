<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AmenitiesSection from './AmenitiesSection.svelte';
	import type { AmenitiesData } from '../types';

	const rumahKabus: AmenitiesData = {
		groups: [
			{
				category: 'essentials',
				label: 'Essentials',
				items: [
					{ key: 'wifi', name: 'Wi-Fi', icon: 'wifi', note: null },
					{
						key: 'air-conditioning',
						name: 'Air conditioning',
						icon: 'air-conditioning',
						note: null
					},
					{
						key: 'workspace',
						name: 'Dedicated workspace',
						icon: 'workspace',
						note: 'A small writing desk under the window'
					},
					{ key: 'parking', name: 'Free parking', icon: 'parking', note: null }
				]
			},
			{
				category: 'bathroom',
				label: 'Bathroom',
				items: [
					{ key: 'hot-water', name: 'Hot water', icon: 'hot-water', note: null },
					{
						key: 'bathtub',
						name: 'Bathtub',
						icon: 'bathtub',
						note: 'Deep, cast iron, with a view of the garden'
					}
				]
			},
			{
				category: 'kitchen',
				label: 'Kitchen',
				items: [
					{
						key: 'coffee-maker',
						name: 'Coffee maker',
						icon: 'coffee-maker',
						note: 'Local ground coffee and a kettle of estate tea'
					},
					{ key: 'breakfast', name: 'Breakfast included', icon: 'breakfast', note: null }
				]
			},
			{
				category: 'outdoor',
				label: 'Outdoor',
				items: [
					{ key: 'garden', name: 'Garden', icon: 'garden', note: null },
					{
						key: 'balcony',
						name: 'Balcony',
						icon: 'balcony',
						note: 'Private veranda, facing the valley'
					}
				]
			}
		]
	};

	const { Story } = defineMeta({
		title: 'Microsite/AmenitiesSection',
		component: AmenitiesSection,
		parameters: { layout: 'fullscreen' },
		args: { data: rumahKabus, variant: 'default' },
		// The reveal fades content in (1.1s); the a11y check runs after `play`, so let it settle or
		// axe measures contrast against half-transparent text.
		play: async () => {
			await new Promise((resolve) => setTimeout(resolve, 1600));
		}
	});
</script>

<Story name="Rumah Kabus" />

<Story
	name="Edge: few items, long note, unknown icon"
	args={{
		data: {
			groups: [
				{
					category: 'services',
					label: 'Services',
					items: [
						{
							key: 'custom',
							name: 'Private tea ceremony hosted by the family on request',
							icon: 'not-a-real-icon',
							note: 'Arranged a day ahead; the host will confirm timing, the tea, and who joins, then walk you to the terraces at the right hour.'
						}
					]
				}
			]
		}
	}}
/>
