<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Heading from './Heading.svelte';
	import Label from './Label.svelte';

	const { Story } = defineMeta({
		title: 'Typography/Label',
		component: Label,
		tags: ['autodocs'],
		args: { as: 'p', number: '01', tone: 'accent' },
		argTypes: {
			as: { control: 'inline-radio', options: ['p', 'span', 'div'] },
			number: { control: 'text', description: 'Section number — rendered as `01 — Label`' },
			tone: { control: 'inline-radio', options: ['accent', 'inherit', 'muted'] }
		}
	});

	const spine = [
		{ number: '01', name: 'The idea' },
		{ number: '02', name: 'Stays' },
		{ number: '03', name: 'Experiences' },
		{ number: '04', name: 'The host' }
	];
</script>

<Story name="Numbered">
	{#snippet template(args)}
		<Label {...args}>The idea</Label>
	{/snippet}
</Story>

<Story name="Unnumbered" args={{ number: undefined }}>
	{#snippet template(args)}
		<Label {...args}>Featured</Label>
	{/snippet}
</Story>

<!-- The numbered, named editorial spine — a DESIGN.md signature element. -->
<Story name="The spine">
	{#snippet template()}
		<div class="flex flex-col gap-6">
			{#each spine as entry (entry.number)}
				<Label number={entry.number}>{entry.name}</Label>
			{/each}
		</div>
	{/snippet}
</Story>

<Story name="Heading a section">
	{#snippet template(args)}
		<Label {...args}>A few of our stays</Label>
		<Heading level={2} size="sm" class="mt-6">Places with a point of view.</Heading>
	{/snippet}
</Story>

<Story name="On the dark tone">
	{#snippet template(args)}
		<div data-tone="inverse" class="rounded-frame bg-surface p-12">
			<Label {...args}>The idea</Label>
		</div>
	{/snippet}
</Story>
