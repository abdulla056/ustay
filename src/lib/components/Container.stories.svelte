<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Container from './Container.svelte';
	import Text from './Text.svelte';

	const { Story } = defineMeta({
		title: 'Layout/Container',
		component: Container,
		tags: ['autodocs'],
		args: { size: 'content', gutter: true },
		argTypes: {
			size: {
				control: 'select',
				options: ['narrow', 'content', 'wide', 'full'],
				description: 'Max content width'
			},
			gutter: { control: 'boolean', description: 'Apply the fluid page inset (px-gutter)' }
		}
	});
</script>

<!-- The hairline rules mark the viewport edges; the inner frame is the content box,
     so the space between the two is the gutter. -->
{#snippet demo(label: string)}
	<div class="rounded-frame border border-hairline-c p-6">
		<Text size="sm" tone="muted">{label}</Text>
	</div>
{/snippet}

<Story name="Content">
	{#snippet template(args)}
		<div class="border-y border-hairline-c py-6">
			<Container {...args}>
				{@render demo('max-w-5xl inside px-gutter — the editorial default.')}
			</Container>
		</div>
	{/snippet}
</Story>

<Story name="Narrow" args={{ size: 'narrow' }}>
	{#snippet template(args)}
		<div class="border-y border-hairline-c py-6">
			<Container {...args}>
				{@render demo('max-w-3xl — long-form reading column.')}
			</Container>
		</div>
	{/snippet}
</Story>

<Story name="Wide" args={{ size: 'wide' }}>
	{#snippet template(args)}
		<div class="border-y border-hairline-c py-6">
			<Container {...args}>
				{@render demo('max-w-7xl — gallery and card grids.')}
			</Container>
		</div>
	{/snippet}
</Story>

<Story name="Full bleed" args={{ size: 'full', gutter: false }}>
	{#snippet template(args)}
		<div class="border-y border-hairline-c py-6">
			<Container {...args}>
				{@render demo('No max width, no gutter — for full-bleed photography.')}
			</Container>
		</div>
	{/snippet}
</Story>
