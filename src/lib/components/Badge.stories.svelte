<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
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
		<div class="flex flex-wrap gap-2">
			{#each tags as tag (tag)}
				<Badge {...args}>{tag}</Badge>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Variants on both tones">
	{#snippet template()}
		<div class="flex flex-col gap-8">
			<div class="flex flex-col gap-3">
				<Text size="sm" tone="muted">Light tone</Text>
				<div class="flex flex-wrap gap-2">
					{#each variants as variant (variant)}
						<Badge {variant}>{variant}</Badge>
					{/each}
				</div>
			</div>
			<div
				data-tone="inverse"
				class="flex flex-col gap-3 rounded-frame bg-surface p-8 text-content"
			>
				<Text size="sm" tone="muted">Inverse tone</Text>
				<div class="flex flex-wrap gap-2">
					{#each variants as variant (variant)}
						<Badge {variant}>{variant}</Badge>
					{/each}
				</div>
			</div>
		</div>
	{/snippet}
</Story>
