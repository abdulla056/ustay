<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Wordmark from './Wordmark.svelte';

	const { Story } = defineMeta({
		title: 'Chrome/Wordmark',
		component: Wordmark,
		tags: ['autodocs'],
		args: { size: 'xs' },
		argTypes: {
			size: { control: 'inline-radio', options: ['xs', 'sm', 'md', 'lg', 'xl'] },
			href: { control: 'text' }
		}
	});

	const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
</script>

<!-- The nav's mark: the smallest serif voice, Fraunces italic. -->
<Story name="Default">
	{#snippet template(args)}
		<Wordmark {...args} />
	{/snippet}
</Story>

<!-- Linked — what the nav renders. Hover resolves to the single olive accent. -->
<Story name="As a home link" args={{ href: '/' }}>
	{#snippet template(args)}
		<Wordmark {...args} />
	{/snippet}
</Story>

<!--
	The scale, and the display weight that comes with each step: heavier at the nav's
	1.3rem, lighter as the mark grows, so a large `Ustay` reads elegant rather than bold.
-->
<Story name="Scale">
	{#snippet template()}
		<div class="flex flex-col items-start gap-6">
			{#each sizes as size (size)}
				<Wordmark {size} />
			{/each}
		</div>
	{/snippet}
</Story>

<!--
	Over photography, in the dark tonal scope — the state the nav is in above the fold.
	`data-tone="inverse"` re-points the semantic colour vars, and the mark simply inherits.
-->
<Story name="Over photography" args={{ size: 'md' }}>
	{#snippet template(args)}
		<div data-tone="inverse" class="relative overflow-hidden rounded-frame">
			<img
				src="/prototype/foggy-forest.jpg"
				alt=""
				class="h-56 w-full object-cover"
				loading="lazy"
			/>
			<div class="absolute inset-0 bg-ink/45"></div>
			<div class="absolute inset-0 flex items-center justify-center text-content">
				<Wordmark {...args} />
			</div>
		</div>
	{/snippet}
</Story>
