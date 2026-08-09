<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Button from './Button.svelte';
	import Heading from './Heading.svelte';
	import Label from './Label.svelte';
	import Stack from './Stack.svelte';
	import Text from './Text.svelte';

	const { Story } = defineMeta({
		title: 'Layout/Stack',
		component: Stack,
		tags: ['autodocs'],
		args: { direction: 'column', gap: 'md', align: 'stretch', justify: 'start', wrap: false },
		argTypes: {
			direction: { control: 'inline-radio', options: ['column', 'row'] },
			gap: { control: 'select', options: ['none', 'xs', 'sm', 'md', 'lg', 'xl'] },
			align: { control: 'select', options: ['start', 'center', 'end', 'baseline', 'stretch'] },
			justify: { control: 'select', options: ['start', 'center', 'end', 'between'] },
			wrap: { control: 'boolean' }
		}
	});

	const gapScale = ['none', 'xs', 'sm', 'md', 'lg', 'xl'] as const;
</script>

<Story name="Column">
	{#snippet template(args)}
		<Stack {...args}>
			<Label number="02">A few of our stays</Label>
			<Heading level={2} size="sm">Places with a point of view.</Heading>
			<Text measure="default">
				Homestays, resorts, and hideaways with a character all their own.
			</Text>
		</Stack>
	{/snippet}
</Story>

<Story name="Row — baseline aligned" args={{ direction: 'row', align: 'baseline', gap: 'sm' }}>
	{#snippet template(args)}
		<Stack {...args}>
			<Heading level={3} size="xs">Stillwater Cabin</Heading>
			<Text size="sm" tone="muted">Lofoten, Norway</Text>
		</Stack>
	{/snippet}
</Story>

<Story
	name="Row — spread"
	args={{ direction: 'row', align: 'center', justify: 'between', gap: 'sm' }}
>
	{#snippet template(args)}
		<Stack {...args}>
			<Text size="sm" tone="muted">Two nights, two guests</Text>
			<Button size="sm">Reserve</Button>
		</Stack>
	{/snippet}
</Story>

<Story name="Gap scale">
	{#snippet template()}
		<Stack gap="lg">
			{#each gapScale as gap (gap)}
				<Stack direction="row" {gap} align="center">
					<Text size="sm" tone="muted" class="w-16 shrink-0">{gap}</Text>
					{#each [0, 1, 2] as box (box)}
						<div class="size-8 rounded-image bg-accent"></div>
					{/each}
				</Stack>
			{/each}
		</Stack>
	{/snippet}
</Story>
