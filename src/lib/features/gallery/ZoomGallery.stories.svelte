<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ZoomGallery from './ZoomGallery.svelte';
	import type { GalleryFrame } from './types';

	const photos: GalleryFrame[] = [
		{
			src: '/prototype/hero-forest.jpg',
			alt: 'Forest cabin in mist',
			width: 2000,
			height: 1333,
			caption: 'The cabin at first light'
		},
		{
			src: '/prototype/lake-mountain.jpg',
			alt: 'Mountain lake',
			width: 2000,
			height: 1333,
			focalY: 0.35
		},
		{ src: '/prototype/misty-lake.jpg', alt: 'Misty lake at dawn', width: 2000, height: 1333 },
		{
			src: '/prototype/forest-light.jpg',
			alt: 'Light through the forest',
			width: 2000,
			height: 1333,
			focalX: 0.3
		},
		{ src: '/prototype/sun-trees.jpg', alt: 'Sun through trees', width: 2000, height: 1333 },
		{ src: '/prototype/foggy-forest.jpg', alt: 'Foggy forest', width: 2000, height: 1333 },
		{
			src: '/prototype/lake-mountain.jpg',
			alt: 'Mountain lake reflection',
			width: 2000,
			height: 1333,
			caption: 'Reflection, late afternoon'
		}
	];

	const { Story } = defineMeta({
		title: 'Features/ZoomGallery',
		component: ZoomGallery,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: { frames: photos, label: 'Photographs of the property', scrollLength: '300vh' }
	});
</script>

<Story name="Seven frames" />

<Story name="Six frames" args={{ frames: photos.slice(0, 6) }} />

<Story name="Five frames" args={{ frames: photos.slice(0, 5) }} />

<Story name="Four frames" args={{ frames: photos.slice(0, 4) }} />

<Story name="Three frames" args={{ frames: photos.slice(0, 3) }} />

<Story
	name="Nine frames (clamped to seven)"
	args={{ frames: [...photos, ...photos.slice(0, 2)] }}
/>

<Story name="Two frames (static layout)" args={{ frames: photos.slice(0, 2) }} />
