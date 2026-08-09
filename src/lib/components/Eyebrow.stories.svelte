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
			as: { control: 'inline-radio', options: ['p', 'span', 'div'] },
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

<Story name="Above a hero">
	{#snippet template(args)}
		<div data-tone="inverse" class="rounded-frame bg-surface p-12 text-content">
			<Eyebrow {...args}>Independent stays, beautifully told</Eyebrow>
			<Heading level={1} size="sm" class="mt-6">Every stay has a <em>story.</em></Heading>
		</div>
	{/snippet}
</Story>
