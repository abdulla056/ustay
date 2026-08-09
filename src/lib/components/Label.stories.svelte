<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Heading from './Heading.svelte';
	import Label from './Label.svelte';
	import Text from './Text.svelte';

	const { Story } = defineMeta({
		title: 'Typography/Label',
		component: Label,
		tags: ['autodocs'],
		args: { as: 'p', number: '01', tone: 'accent' },
		argTypes: {
			as: {
				control: 'select',
				options: ['p', 'span', 'div', 'h2', 'h3', 'h4', 'h5', 'h6'],
				description:
					'Render target. Use `h2`–`h6` when the spine label is the section heading — identical styling, real outline.'
			},
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

<!-- The spine label as the section's *actual* heading. On most Ustay bands the
     numbered label is the only title the section has, so it should be the `h2`:
     `as="h2"` renders a real heading, the band lands in the document outline, and
     screen-reader heading navigation finds it. Reach for this instead of pinning an
     `id` on a `<p>` and pointing the section's `aria-labelledby` at it — a named
     region with nothing in the outline. Styling is byte-identical either way; only
     the semantics move. -->
<Story name="As the section heading" args={{ as: 'h2', number: '02' }}>
	{#snippet template(args)}
		<section>
			<Label {...args}>Stays</Label>
			<Text measure="default" class="mt-4">
				Renders an <code>&lt;h2&gt;</code> — same type, same tracking, but the section now has a heading
				rather than a paragraph pretending to be one.
			</Text>
		</section>
	{/snippet}
</Story>

<Story name="On the dark tone">
	{#snippet template(args)}
		<div data-tone="inverse" class="rounded-frame bg-surface p-12">
			<Label {...args}>The idea</Label>
		</div>
	{/snippet}
</Story>
