<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Eyebrow from './Eyebrow.svelte';
	import Heading from './Heading.svelte';

	const { Story } = defineMeta({
		title: 'Typography/Eyebrow',
		component: Eyebrow,
		tags: ['autodocs'],
		args: { as: 'p', tone: 'inherit' },
		argTypes: {
			as: {
				control: 'select',
				options: ['p', 'span', 'div', 'h2', 'h3', 'h4', 'h5', 'h6'],
				description: 'Render target. Styling is the same whichever tag it is.'
			},
			tone: { control: 'inline-radio', options: ['inherit', 'accent', 'muted'] }
		}
	});
</script>

<Story name="Default">
	{#snippet template(args)}
		<Eyebrow {...args}>Independent stays, beautifully told</Eyebrow>
	{/snippet}
</Story>

<Story name="Accent" args={{ tone: 'accent' }}>
	{#snippet template(args)}
		<Eyebrow {...args}>Ustay · foundations</Eyebrow>
	{/snippet}
</Story>

<!-- `as` reaches h2–h6 when the eyebrow is the section's real heading. The look is
     the same; only the document outline changes. -->
<Story name="As a heading" args={{ as: 'h2' }}>
	{#snippet template(args)}
		<Eyebrow {...args}>Independent stays, beautifully told</Eyebrow>
	{/snippet}
</Story>

<Story name="Above a hero">
	{#snippet template(args)}
		<div data-tone="inverse" class="rounded-frame bg-surface p-12 text-content">
			<Eyebrow {...args}>Independent stays, beautifully told</Eyebrow>
			<Heading level={1} size="sm" class="mt-6">Every stay has a <em>story.</em></Heading>
		</div>
	{/snippet}
</Story>
