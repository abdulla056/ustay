<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Image from './Image.svelte';
	import Text from './Text.svelte';
	import { ratios, type Ratio } from './ratio';

	const { Story } = defineMeta({
		title: 'Content/Image',
		component: Image,
		tags: ['autodocs'],
		args: {
			src: '/prototype/lake-mountain.jpg',
			alt: 'A still lake below snow-lined mountains',
			ratio: '4/5',
			rounded: 'image',
			loading: 'lazy'
		},
		argTypes: {
			src: { control: 'text' },
			alt: { control: 'text', description: 'Required — pass "" for decorative art' },
			ratio: { control: 'select', options: Object.keys(ratios) },
			rounded: { control: 'inline-radio', options: ['image', 'frame', 'none'] },
			loading: { control: 'inline-radio', options: ['lazy', 'eager'] }
		}
	});

	const crops = Object.keys(ratios) as Ratio[];
</script>

<Story name="Portrait card crop">
	{#snippet template(args)}
		<div class="max-w-sm">
			<Image {...args} />
		</div>
	{/snippet}
</Story>

<Story
	name="Cinematic"
	args={{
		ratio: '16/9',
		src: '/prototype/hero-forest.jpg',
		alt: 'Mist drifting through a forest of tall pines'
	}}
>
	{#snippet template(args)}
		<Image {...args} />
	{/snippet}
</Story>

<Story name="Eager — above the fold" args={{ ratio: '3/2', loading: 'eager' }}>
	{#snippet template(args)}
		<Image {...args} />
	{/snippet}
</Story>

<!-- The closed set of editorial crops. Every frame on the site is one of these. -->
<Story name="Ratios">
	{#snippet template()}
		<div class="grid grid-cols-2 gap-grid md:grid-cols-4">
			{#each crops as ratio (ratio)}
				<div>
					<Text size="sm" tone="muted" class="mb-2">{ratio}</Text>
					<Image
						src="/prototype/misty-lake.jpg"
						alt="Mist sitting on the surface of a lake at dawn"
						{ratio}
					/>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Decorative" args={{ alt: '', ratio: '3/2' }}>
	{#snippet template(args)}
		<Image {...args} />
	{/snippet}
</Story>
