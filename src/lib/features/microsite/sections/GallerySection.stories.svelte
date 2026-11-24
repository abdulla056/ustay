<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import GallerySection from './GallerySection.svelte';
	import type { GalleryFrame } from '../types';

	const frames: GalleryFrame[] = [
		{
			src: '/prototype/hero-forest.jpg',
			alt: 'Morning light breaking through low cloud over green highland ridges.',
			width: 2400,
			height: 1430,
			focalX: 0.7,
			focalY: 0.4,
			caption: 'First light over the valley below the house.'
		},
		{
			src: '/prototype/lake-mountain.jpg',
			alt: 'A sea of cloud filling a highland valley at sunrise.',
			width: 2400,
			height: 1600,
			caption: 'Most mornings the valley fills with cloud.'
		},
		{
			src: '/prototype/forest-light.jpg',
			alt: 'A gravel track running between tall, slender trees.',
			width: 2400,
			height: 1598,
			caption: 'The track from the veranda into the forest.'
		},
		{
			src: '/prototype/misty-lake.jpg',
			alt: 'A wooden jetty extending onto a still lake.',
			width: 2400,
			height: 1802,
			focalY: 0.75
		},
		{
			src: '/prototype/sun-trees.jpg',
			alt: 'Looking up through the branches of an old fig tree.',
			width: 2400,
			height: 3600,
			caption: 'The fig tree at the bottom of the garden.'
		},
		{
			src: '/prototype/foggy-forest.jpg',
			alt: 'Two white peaks rising out of a bank of soft cloud.',
			width: 2400,
			height: 1600
		},
		{
			src: '/prototype/misty-lake.jpg',
			alt: 'Orange floats strung across the surface of a calm lake.',
			width: 2400,
			height: 1802,
			caption: 'The swimming line, as early as the water is still.'
		}
	];

	const uncaptioned = frames.slice(3, 5).map(({ src, alt, width, height }) => ({
		src,
		alt,
		width,
		height
	}));

	const { Story } = defineMeta({
		title: 'Microsite/GallerySection',
		component: GallerySection,
		parameters: { layout: 'fullscreen' },
		args: { data: { frames }, variant: 'default' }
	});
</script>

<Story name="Grid (Rumah Kabus)" />
<Story name="Zoom" args={{ variant: 'zoom' }} />
<Story name="Few frames, no captions" args={{ variant: 'grid', data: { frames: uncaptioned } }} />
<Story name="Single frame" args={{ variant: 'grid', data: { frames: frames.slice(0, 1) } }} />
