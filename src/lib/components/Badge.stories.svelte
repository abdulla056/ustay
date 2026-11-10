<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Stack from './Stack.svelte';
	import Badge from './Badge.svelte';
	import Text from './Text.svelte';

	const { Story } = defineMeta({
		title: 'Content/Badge',
		component: Badge,
		tags: ['autodocs'],
		args: { variant: 'outline' },
		argTypes: {
			variant: {
				control: 'inline-radio',
				options: ['outline', 'solid', 'accent'],
				description: 'outline is the "tag" reading; solid and accent are for emphasis'
			}
		}
	});

	const variants = ['outline', 'solid', 'accent'] as const;
	const tags = ['Cabin', 'Sleeps 4', 'Wood stove', 'Off grid'];
</script>

<Story name="Outline">
	{#snippet template(args)}
		<Badge {...args}>Cabin</Badge>
	{/snippet}
</Story>

<Story name="Solid" args={{ variant: 'solid' }}>
	{#snippet template(args)}
		<Badge {...args}>New</Badge>
	{/snippet}
</Story>

<Story name="Accent" args={{ variant: 'accent' }}>
	{#snippet template(args)}
		<Badge {...args}>Featured</Badge>
	{/snippet}
</Story>

<Story name="A row of tags">
	{#snippet template(args)}
		<Stack direction="row" wrap gap="xs">
			{#each tags as tag (tag)}
				<Badge {...args}>{tag}</Badge>
			{/each}
		</Stack>
	{/snippet}
</Story>

<Story name="Variants on both tones">
	{#snippet template()}
		<Stack gap="lg">
			<Stack gap="sm">
				<Text size="sm" tone="muted">Light tone</Text>
				<Stack direction="row" wrap gap="xs">
					{#each variants as variant (variant)}
						<Badge {variant}>{variant}</Badge>
					{/each}
				</Stack>
			</Stack>
			<Stack data-tone="inverse" gap="sm" class="rounded-frame bg-surface p-8 text-content">
				<Text size="sm" tone="muted">Inverse tone</Text>
				<Stack direction="row" wrap gap="xs">
					{#each variants as variant (variant)}
						<Badge {variant}>{variant}</Badge>
					{/each}
				</Stack>
			</Stack>
		</Stack>
	{/snippet}
</Story>
