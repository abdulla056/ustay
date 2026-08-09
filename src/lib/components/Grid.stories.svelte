<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Grid from './Grid.svelte';
	import Image from './Image.svelte';
	import Text from './Text.svelte';

	const { Story } = defineMeta({
		title: 'Layout/Grid',
		component: Grid,
		tags: ['autodocs'],
		args: { cols: 3, gap: 'default', align: 'start' },
		argTypes: {
			cols: {
				control: 'inline-radio',
				options: [1, 2, 3, 4],
				description: 'Columns at `md` and up — collapses below'
			},
			gap: { control: 'inline-radio', options: ['none', 'tight', 'default'] },
			align: { control: 'inline-radio', options: ['start', 'center', 'end', 'stretch'] }
		}
	});

	const frames = [
		{ src: '/prototype/lake-mountain.jpg', alt: 'A still lake below snow-lined mountains' },
		{ src: '/prototype/forest-light.jpg', alt: 'Low sun cutting through a stand of trees' },
		{ src: '/prototype/misty-lake.jpg', alt: 'Mist sitting on the surface of a lake at dawn' },
		{ src: '/prototype/foggy-forest.jpg', alt: 'Fog between dense forest trunks' }
	];
</script>

<Story name="Three up">
	{#snippet template(args)}
		<Grid {...args}>
			{#each frames.slice(0, 3) as frame (frame.src)}
				<Image src={frame.src} alt={frame.alt} ratio="4/5" rounded="frame" />
			{/each}
		</Grid>
	{/snippet}
</Story>

<Story name="Two up" args={{ cols: 2 }}>
	{#snippet template(args)}
		<Grid {...args}>
			{#each frames.slice(0, 2) as frame (frame.src)}
				<Image src={frame.src} alt={frame.alt} ratio="3/2" rounded="frame" />
			{/each}
		</Grid>
	{/snippet}
</Story>

<Story name="Gallery — tight gap" args={{ cols: 4, gap: 'tight' }}>
	{#snippet template(args)}
		<Grid {...args}>
			{#each frames as frame (frame.src)}
				<Image src={frame.src} alt={frame.alt} ratio="4/3" />
			{/each}
		</Grid>
	{/snippet}
</Story>

<Story name="Plain cells">
	{#snippet template(args)}
		<Grid {...args}>
			{#each ['One', 'Two', 'Three'] as cell (cell)}
				<div class="rounded-frame border border-hairline-c p-8">
					<Text size="sm" tone="muted">{cell}</Text>
				</div>
			{/each}
		</Grid>
	{/snippet}
</Story>
