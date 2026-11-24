<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import HeroSection from './HeroSection.svelte';
	import type { HeroData } from '../types';

	const rumahKabus: HeroData = {
		name: 'Rumah Kabus',
		tagline: 'A quiet house above the cloud line, where the mornings arrive slowly.',
		locationLabel: 'Tanah Rata, Pahang',
		image: {
			src: '/prototype/hero-forest.jpg',
			alt: 'Morning light breaking through low cloud over green highland ridges, with a narrow road curving down the valley.',
			width: 2400,
			height: 1430,
			focalX: 0.7,
			focalY: 0.4
		},
		bookingAnchor: '#booking'
	};

	const bare: HeroData = {
		name: 'The Old Rice Mill Guesthouse and Garden Residence at the Edge of the Village',
		tagline: null,
		locationLabel: null,
		image: null,
		bookingAnchor: null
	};

	const { Story } = defineMeta({
		title: 'Microsite/Hero',
		component: HeroSection,
		parameters: { layout: 'fullscreen' },
		args: { data: rumahKabus, variant: 'default' }
	});
</script>

<Story name="Rumah Kabus" />

<!-- Long name, no tagline, no place label, no photograph, no booking section. -->
<Story name="Edge case: long name, no optional fields" args={{ data: bare }} />
