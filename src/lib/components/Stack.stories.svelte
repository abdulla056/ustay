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
			gap: {
				control: 'select',
				options: ['none', 'xs', 'sm', 'md', 'lg', 'xl'],
				description:
					'The **only** gap seam on Stack. Never pass a `gap-*` utility through `class` — see the “Gap is a prop, never a class” story.'
			},
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

<!-- The one Stack rule worth memorising. Passing `class="gap-1"` looks like an
     override and is not one: it is a second declaration of the same CSS property,
     and the winner is whichever utility Tailwind emitted later in the stylesheet —
     nothing to do with the order you wrote the classes in. So the result is stable
     but unrelated to your intent, and the `gap` prop owns the shorthand outright.
     It is a fixed scale on purpose: that scale is what keeps vertical rhythm on the
     spacing tokens. In dev, Stack warns if a `gap-*` class arrives through `class`.
     Two legitimate ways out: refine one axis with `gap="none"` plus
     `gap-x-*`/`gap-y-*` (separate properties, no collision), or, for a genuine
     one-off box, skip the primitive and write a plain `<div class="flex …">`. -->
<Story name="Gap is a prop, never a class">
	{#snippet template()}
		<Stack gap="lg">
			<Stack gap="xs">
				<Text size="sm" tone="muted">✓ `gap="lg"` — the prop</Text>
				<Stack direction="row" gap="lg" align="center">
					{#each [0, 1, 2] as box (box)}
						<div class="size-8 rounded-image bg-accent"></div>
					{/each}
				</Stack>
			</Stack>

			<Stack gap="xs">
				<Text size="sm" tone="muted">
					✓ per-axis: `gap="none"` + `gap-x-10 gap-y-4` — different properties, nothing collides
				</Text>
				<Stack direction="row" gap="none" wrap align="center" class="max-w-56 gap-x-10 gap-y-4">
					{#each [0, 1, 2, 3, 4, 5] as box (box)}
						<div class="size-8 rounded-image bg-accent"></div>
					{/each}
				</Stack>
			</Stack>

			<Stack gap="xs">
				<Text size="sm" tone="muted">
					✗ `class="gap-1"` — collides with the prop; Tailwind's CSS order decides, not you
				</Text>
			</Stack>
		</Stack>
	{/snippet}
</Story>
