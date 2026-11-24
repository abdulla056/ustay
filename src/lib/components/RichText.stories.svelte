<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import RichText from './RichText.svelte';

	const { Story } = defineMeta({
		title: 'Components/RichText',
		component: RichText,
		tags: ['autodocs'],
		args: {
			html: `<p>Cheong Yew Meng built the house in 1954. He was a <strong>tea taster</strong> who wanted to see what the morning would do.</p><h3>The restoration</h3><p>It took three years, and <a href="/">every beam</a> was replaced by hand.</p><ul><li>Meranti floors</li><li>Granite chimney</li></ul><blockquote><p>The day starts with the view.</p></blockquote><h4>A note</h4><p>Ask us what the weather will do.</p>`
		}
	});
</script>

<Story name="Prose" />

<Story name="One paragraph" args={{ html: '<p>Just one plain paragraph of text.</p>' }} />
