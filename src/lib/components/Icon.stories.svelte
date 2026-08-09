<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Heading from './Heading.svelte';
	import Icon from './Icon.svelte';
	import Text from './Text.svelte';

	const { Story } = defineMeta({
		title: 'Content/Icon',
		component: Icon,
		tags: ['autodocs'],
		args: { viewBox: '0 0 24 24' },
		argTypes: {
			label: {
				control: 'text',
				description: 'Accessible name. Omit for decorative icons (renders aria-hidden)'
			},
			viewBox: { control: 'text' }
		}
	});
</script>

<!-- Icons take their paths as children and are sized in `em` (`size-icon`), so they
     always match the text they sit beside. -->
{#snippet arrow()}
	<path d="M7 17 17 7" />
	<path d="M9 7h8v8" />
{/snippet}

<Story name="Decorative">
	{#snippet template(args)}
		<Text>
			Reserve <Icon {...args}>{@render arrow()}</Icon>
		</Text>
	{/snippet}
</Story>

<Story name="Labelled" args={{ label: 'Opens in a new tab' }}>
	{#snippet template(args)}
		<Icon {...args}>{@render arrow()}</Icon>
	{/snippet}
</Story>

<!-- Nothing here sets a pixel size: each icon inherits the font-size of its line. -->
<Story name="Scales with its text">
	{#snippet template()}
		<div class="flex flex-col gap-6">
			<Heading level={2} size="sm">Find your story <Icon>{@render arrow()}</Icon></Heading>
			<Text size="lead">A lead line <Icon>{@render arrow()}</Icon></Text>
			<Text size="base">Body copy <Icon>{@render arrow()}</Icon></Text>
			<Text size="sm">Small print <Icon>{@render arrow()}</Icon></Text>
		</div>
	{/snippet}
</Story>

<Story name="Inherits the tone">
	{#snippet template()}
		<div data-tone="inverse" class="rounded-frame bg-surface p-12 text-content">
			<Text tone="content">Stroked in currentColor <Icon>{@render arrow()}</Icon></Text>
		</div>
	{/snippet}
</Story>
