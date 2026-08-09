<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Container from './Container.svelte';
	import Heading from './Heading.svelte';
	import Label from './Label.svelte';
	import Section from './Section.svelte';
	import Text from './Text.svelte';

	const { Story } = defineMeta({
		title: 'Layout/Section',
		component: Section,
		tags: ['autodocs'],
		args: { tone: 'surface', space: 'md' },
		argTypes: {
			tone: {
				control: 'inline-radio',
				options: ['inherit', 'surface', 'inverse'],
				description: 'Tonal scope — `inverse` re-points the semantic colour tokens'
			},
			space: { control: 'inline-radio', options: ['none', 'sm', 'md', 'lg'] }
		}
	});
</script>

<!-- Identical markup in every story below: only `tone` changes. The label, heading and
     body copy each resolve to the right value for the tone they land in, which is the
     whole point of the `data-tone` scope. -->
{#snippet band(number: string)}
	<Container>
		<Label {number}>The idea</Label>
		<Heading level={2} size="sm" class="mt-6">
			A listing shows you a room. A <em>story</em> shows you a place.
		</Heading>
		<Text size="lead" measure="default" class="mt-6">
			Ustay gives every independent property its own branded home — a page with the soul of a custom
			site and the reach of a platform.
		</Text>
	</Container>
{/snippet}

<Story name="Surface">
	{#snippet template(args)}
		<Section {...args}>{@render band('01')}</Section>
	{/snippet}
</Story>

<Story name="Inverse" args={{ tone: 'inverse' }}>
	{#snippet template(args)}
		<Section {...args}>{@render band('02')}</Section>
	{/snippet}
</Story>

<Story name="Tonal sequence" args={{ space: 'sm' }}>
	{#snippet template()}
		<Section tone="inverse" space="sm">{@render band('01')}</Section>
		<Section tone="surface" space="sm">{@render band('02')}</Section>
	{/snippet}
</Story>

<Story name="Spacing scale">
	{#snippet template()}
		<Section tone="surface" space="sm" class="border-b border-hairline-c">
			<Container><Text size="sm" tone="muted">space="sm" — py-section-sm</Text></Container>
		</Section>
		<Section tone="surface" space="md" class="border-b border-hairline-c">
			<Container><Text size="sm" tone="muted">space="md" — py-section</Text></Container>
		</Section>
		<Section tone="surface" space="lg">
			<Container><Text size="sm" tone="muted">space="lg" — py-section-lg</Text></Container>
		</Section>
	{/snippet}
</Story>
