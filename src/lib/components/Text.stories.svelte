<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Text from './Text.svelte';

	const { Story } = defineMeta({
		title: 'Typography/Text',
		component: Text,
		tags: ['autodocs'],
		args: { as: 'p', size: 'base', tone: 'prose', measure: 'none' },
		argTypes: {
			as: { control: 'inline-radio', options: ['p', 'span', 'div'] },
			size: { control: 'inline-radio', options: ['lead', 'base', 'sm'] },
			tone: { control: 'select', options: ['inherit', 'content', 'prose', 'muted'] },
			measure: {
				control: 'inline-radio',
				options: ['none', 'default', 'tight'],
				description: 'Line-length cap: default 52ch, tight 34ch'
			}
		}
	});

	const copy =
		'Ustay gives every independent property its own branded home — a page with the soul of a custom site and the reach of a platform. Not another identical listing in an endless grid, but a destination with a personality: its history, its host, its corner of the world.';

	const sizes = ['lead', 'base', 'sm'] as const;
	const tones = ['content', 'prose', 'muted'] as const;
</script>

<Story name="Body">
	{#snippet template(args)}
		<Text {...args}>{copy}</Text>
	{/snippet}
</Story>

<Story name="Lead — measured" args={{ size: 'lead', measure: 'default' }}>
	{#snippet template(args)}
		<Text {...args}>{copy}</Text>
	{/snippet}
</Story>

<Story name="Tight measure" args={{ measure: 'tight' }}>
	{#snippet template(args)}
		<Text {...args}>
			Homestays, resorts, and hideaways with a character all their own. Discover the place — not the
			listing.
		</Text>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-col gap-8">
			{#each sizes as size (size)}
				<div>
					<Text size="sm" tone="muted" class="mb-2">size="{size}"</Text>
					<Text {size} measure="default">{copy}</Text>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>

<!-- All three tones clear AA on the paper surface; in a `data-tone="inverse"` scope
     they resolve to their lifted dark-tone values and clear AA there too. -->
<Story name="Tones">
	{#snippet template()}
		<div class="flex flex-col gap-8">
			<div class="flex flex-col gap-3">
				{#each tones as tone (tone)}
					<Text {tone} measure="default">tone="{tone}" — {copy}</Text>
				{/each}
			</div>
			<div data-tone="inverse" class="flex flex-col gap-3 rounded-frame bg-surface p-8">
				{#each tones as tone (tone)}
					<Text {tone} measure="default">tone="{tone}" — {copy}</Text>
				{/each}
			</div>
		</div>
	{/snippet}
</Story>
