<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Heading from './Heading.svelte';
	import Text from './Text.svelte';

	const { Story } = defineMeta({
		title: 'Typography/Heading',
		component: Heading,
		tags: ['autodocs'],
		args: { level: 2, as: undefined, size: 'md', tone: 'inherit', bleed: false },
		argTypes: {
			level: {
				control: 'inline-radio',
				options: [1, 2, 3, 4, 5, 6],
				description: 'Document outline only — independent of `size`. Ignored when `as` is set.'
			},
			as: {
				control: 'select',
				options: [undefined, 'p', 'div'],
				description:
					'Opt out of the outline: renders `p`/`div` and drops `level`. For display type that is not a section heading. Default is `h{level}`.'
			},
			size: {
				control: 'select',
				options: ['xl', 'lg', 'md', 'sm', 'xs'],
				description: 'Optical scale: xl hero → xs stay name'
			},
			tone: { control: 'inline-radio', options: ['inherit', 'content', 'accent'] },
			bleed: { control: 'boolean', description: 'Optical side-bearing pull for edge-bleed type' }
		}
	});

	const scale = [
		{ size: 'xl', note: 'text-display-xl · font-editorial (340) — the hero' },
		{ size: 'lg', note: 'text-display-lg · font-editorial (340) — the closing line' },
		{ size: 'md', note: 'text-display · font-statement (360) — section titles' },
		{ size: 'sm', note: 'text-display-sm · font-statement (360) — statements' },
		{ size: 'xs', note: 'text-display-xs · font-title (440) — stay names' }
	] as const;
</script>

<Story name="Section title">
	{#snippet template(args)}
		<Heading {...args}>Places with a point of view.</Heading>
	{/snippet}
</Story>

<Story name="Hero" args={{ level: 1, size: 'xl', bleed: true }}>
	{#snippet template(args)}
		<Heading {...args}>Every stay has a <em>story.</em></Heading>
	{/snippet}
</Story>

<!-- `<em>` renders italic Fraunces — the calligraphic accent word from DESIGN.md. -->
<Story name="Italic accent word" args={{ size: 'sm' }}>
	{#snippet template(args)}
		<Heading {...args}>A listing shows you a room. A <em>story</em> shows you a place.</Heading>
	{/snippet}
</Story>

<!-- The samples are specimens of the type, not headings of anything, so they take
     `as="p"` — five `h2`s all reading "Every stay has a story." would be five
     bogus rungs on this page's outline. -->
<Story name="Scale">
	{#snippet template()}
		<div class="flex flex-col gap-12">
			{#each scale as step (step.size)}
				<div>
					<Text size="sm" tone="muted" class="mb-3">{step.note}</Text>
					<Heading as="p" size={step.size}>Every stay has a story.</Heading>
				</div>
			{/each}
		</div>
	{/snippet}
</Story>

<!-- `as` is the escape hatch out of the outline: `as="p"` (or `"div"`) renders the
     Fraunces display voice as a non-heading and drops `level` entirely. Use it for
     type specimens, pull statements and decorative display lines — anything a
     screen-reader user should not land on when skimming the page by heading.
     `level` still owns semantics whenever `as` is absent, so the three axes never
     fight: `size` is optics, `level` is outline position, `as` is whether there is
     an outline entry at all. -->
<Story name="Outside the outline" args={{ as: 'p', size: 'sm' }}>
	{#snippet template(args)}
		<div class="flex flex-col gap-4">
			<Text size="sm" tone="muted">A pull statement — display type, no outline entry</Text>
			<Heading {...args}>A listing shows you a room.</Heading>
		</div>
	{/snippet}
</Story>

<Story name="On the dark tone" args={{ size: 'sm' }}>
	{#snippet template(args)}
		<div data-tone="inverse" class="rounded-frame bg-surface p-12 text-content">
			<Heading {...args}>Find your <em>story.</em></Heading>
		</div>
	{/snippet}
</Story>
