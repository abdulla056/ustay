<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Footer from './Footer.svelte';

	const { Story } = defineMeta({
		title: 'Chrome/Footer',
		component: Footer,
		tags: ['autodocs'],
		args: {
			tagline: 'Independent stays, beautifully told.',
			groups: [
				{
					heading: 'Discover',
					links: [
						{ label: 'Destinations', href: '#' },
						{ label: 'Stays', href: '#' },
						{ label: 'Journal', href: '#' }
					]
				},
				{
					heading: 'For owners',
					links: [
						{ label: 'List your property', href: '#' },
						{ label: 'How it works', href: '#' },
						{ label: 'Sign in', href: '/sign-in' }
					]
				},
				{
					heading: 'Ustay',
					links: [
						{ label: 'About', href: '#' },
						{ label: 'Contact', href: '#' }
					]
				}
			],
			legal: [
				{ label: 'Privacy', href: '#' },
				{ label: 'Terms', href: '#' }
			]
		},
		argTypes: {
			tagline: { control: 'text' },
			copyright: { control: 'text' },
			home: { control: 'text' }
		},
		parameters: { layout: 'fullscreen' }
	});
</script>

<!--
	The platform footer: a closing statement, three quiet indexes, then the mark set
	large as the sign-off. Always the ink tone — it closes the dark → light → dark arc.
-->
<Story name="Default" />

<!--
	The minimum it renders: no statement and no indexes, just the mark and the legal
	line. What a microsite page or a sparse interim layout would carry.
-->
<Story name="Minimal" args={{ tagline: undefined, groups: [], legal: [] }} />

<!--
	After a paper section, the way it lands at the foot of a real page: the editorial
	tone gives way to ink rather than fading into it.
-->
<Story name="After a paper section">
	{#snippet template(args)}
		<div data-tone="light" class="bg-surface px-gutter py-section-sm">
			<p class="max-w-measure text-lead text-content-prose">
				The last paper section of a page. The footer below closes the tonal arc back on ink.
			</p>
		</div>
		<Footer {...args} />
	{/snippet}
</Story>
