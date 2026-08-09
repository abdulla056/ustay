<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Badge from './Badge.svelte';
	import Card from './Card.svelte';
	import Grid from './Grid.svelte';
	import Heading from './Heading.svelte';
	import Image from './Image.svelte';
	import Text from './Text.svelte';

	const { Story } = defineMeta({
		title: 'Content/Card',
		component: Card,
		tags: ['autodocs'],
		args: {
			src: '/prototype/lake-mountain.jpg',
			alt: 'A still lake below snow-lined mountains',
			title: 'Stillwater Cabin',
			location: 'Lofoten, Norway',
			price: '$220',
			priceUnit: '/night',
			ratio: '4/5'
		},
		argTypes: {
			title: { control: 'text', description: "The stay's name — also the accessible name" },
			location: { control: 'text' },
			price: { control: 'text', description: 'Pre-formatted, e.g. "$220"' },
			priceUnit: { control: 'text' },
			href: { control: 'text', description: 'Makes the whole card one click target' },
			ratio: { control: 'select', options: ['4/5', '4/6', '4/3', '3/2', '16/9', '1/1'] }
		}
	});

	const stays = [
		{
			src: '/prototype/lake-mountain.jpg',
			alt: 'A still lake below snow-lined mountains',
			title: 'Stillwater Cabin',
			location: 'Lofoten, Norway',
			price: '$220'
		},
		{
			src: '/prototype/forest-light.jpg',
			alt: 'Low sun cutting through a stand of tall trees',
			title: 'The Understory',
			location: 'Olympic Peninsula, USA',
			price: '$185'
		},
		{
			src: '/prototype/sun-trees.jpg',
			alt: 'Sunlight breaking over a treeline',
			title: 'Larch House',
			location: 'Valais, Switzerland',
			price: '$310'
		}
	];
</script>

<Story name="Stay card">
	{#snippet template(args)}
		<div class="max-w-sm">
			<Card {...args} />
		</div>
	{/snippet}
</Story>

<!-- With `href` the whole card is one click target (a stretched link), and its
     accessible name is the stay's name. Hover eases the crop in slightly; it stays
     put under `prefers-reduced-motion`. -->
<Story name="Linked" args={{ href: '#stillwater-cabin' }}>
	{#snippet template(args)}
		<div class="max-w-sm">
			<Card {...args} />
		</div>
	{/snippet}
</Story>

<Story name="Taller crop" args={{ ratio: '4/6' }}>
	{#snippet template(args)}
		<div class="max-w-sm">
			<Card {...args} />
		</div>
	{/snippet}
</Story>

<Story name="A grid of stays">
	{#snippet template()}
		<Grid cols={3}>
			{#each stays as stay (stay.title)}
				<Card {...stay} priceUnit="/night" href="#{stay.title.toLowerCase().replace(/\s/g, '-')}" />
			{/each}
		</Grid>
	{/snippet}
</Story>

<!-- `children` replaces the name/location/price row; `media` replaces the frame. -->
<Story name="Custom content">
	{#snippet template()}
		<div class="max-w-sm">
			<Card>
				{#snippet media()}
					<Image
						src="/prototype/foggy-forest.jpg"
						alt="Fog between dense forest trunks"
						ratio="3/2"
						rounded="frame"
					/>
				{/snippet}
				<Heading level={3} size="xs" tone="content">A note from the host</Heading>
				<Text size="sm" class="mt-2">
					We built the place from larch felled on the ridge behind it.
				</Text>
				<Badge class="mt-4">Journal</Badge>
			</Card>
		</div>
	{/snippet}
</Story>

<Story name="On the dark tone" args={{ href: '#stillwater-cabin' }}>
	{#snippet template(args)}
		<div data-tone="inverse" class="rounded-frame bg-surface p-8">
			<div class="max-w-sm">
				<Card {...args} />
			</div>
		</div>
	{/snippet}
</Story>
