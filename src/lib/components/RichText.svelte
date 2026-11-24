<script lang="ts">
	// Server-sanitised owner prose (UST-28). `html` MUST come from `renderMarkdown`
	// (`$lib/server/microsite/markdown.ts`): `html: false`, safe links, headings already shifted to
	// h3-h6, no images, code or tables. This is the one place sections turn it into markup, and the
	// prose elements are styled here so every section reads the same.
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLDivElement> & {
		/** Sanitised HTML from the server markdown renderer; never pass anything else. */
		html: string;
	};

	let { html, class: className, ...rest }: Props = $props();
</script>

<div {...rest} class={['rich-text max-w-measure', className]}>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html html}
</div>

<style>
	.rich-text :global(p) {
		font-size: var(--text-lead);
		line-height: var(--text-lead--line-height);
		color: var(--color-content-prose);
		margin: 0 0 1.5em;
	}
	.rich-text :global(p:last-child) {
		margin-bottom: 0;
	}
	.rich-text :global(strong) {
		font-weight: 600;
		color: var(--color-content);
	}
	.rich-text :global(em) {
		font-style: italic;
	}
	.rich-text :global(a) {
		color: var(--color-content);
		text-decoration: underline;
		text-underline-offset: 0.2em;
		text-decoration-thickness: 1px;
	}
	.rich-text :global(a:hover) {
		color: var(--color-accent-c);
	}
	.rich-text :global(a:focus-visible) {
		outline: 2px solid var(--color-accent-c);
		outline-offset: 3px;
	}
	.rich-text :global(h3),
	.rich-text :global(h4),
	.rich-text :global(h5),
	.rich-text :global(h6) {
		font-family: var(--font-display);
		color: var(--color-content);
		margin: 2em 0 0.6em;
	}
	.rich-text :global(h3) {
		font-size: var(--text-display-xs);
		line-height: var(--text-display-xs--line-height);
	}
	.rich-text :global(h4),
	.rich-text :global(h5),
	.rich-text :global(h6) {
		font-size: var(--text-lead);
		line-height: var(--text-lead--line-height);
		font-style: italic;
	}
	.rich-text :global(ul),
	.rich-text :global(ol) {
		margin: 0 0 1.5em;
		padding-left: 1.4em;
		color: var(--color-content-prose);
		font-size: var(--text-lead);
		line-height: var(--text-lead--line-height);
	}
	.rich-text :global(ul) {
		list-style: disc;
	}
	.rich-text :global(ol) {
		list-style: decimal;
	}
	.rich-text :global(blockquote) {
		margin: 2em 0;
		padding-left: 1.5em;
		border-left: 1px solid var(--color-accent-c);
		font-family: var(--font-display);
		font-style: italic;
		font-size: var(--text-display-xs);
		line-height: var(--text-display-xs--line-height);
		color: var(--color-content);
	}
	.rich-text :global(blockquote p) {
		font-size: inherit;
		line-height: inherit;
		color: inherit;
	}
	.rich-text :global(hr) {
		margin: 2.5em 0;
		border: 0;
		border-top: 1px solid var(--color-hairline);
	}
</style>
