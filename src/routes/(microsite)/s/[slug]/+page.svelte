<script lang="ts">
	import { page } from '$app/state';
	import MicrositeRenderer from '$lib/features/microsite/MicrositeRenderer.svelte';
	import { absoluteUrl, jsonLdScript, lodgingJsonLd } from '$lib/features/microsite/seo';

	const { data } = $props();

	const view = $derived(data.view);
	const origin = $derived(page.url.origin);
	const canonical = $derived(absoluteUrl(view.seo.canonicalPath, origin));
	const image = $derived(view.seo.image ? absoluteUrl(view.seo.image.src, origin) : null);
	const jsonLd = $derived(jsonLdScript(lodgingJsonLd(view, origin)));
</script>

<svelte:head>
	<title>{view.seo.title}</title>
	{#if view.seo.description}
		<meta name="description" content={view.seo.description} />
		<meta property="og:description" content={view.seo.description} />
		<meta name="twitter:description" content={view.seo.description} />
	{/if}
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={view.seo.title} />
	<meta property="og:url" content={canonical} />
	<meta name="twitter:title" content={view.seo.title} />
	{#if image}
		<meta property="og:image" content={image} />
		<meta property="og:image:alt" content={view.seo.image?.alt ?? ''} />
		<meta name="twitter:card" content="summary_large_image" />
		<meta name="twitter:image" content={image} />
	{:else}
		<meta name="twitter:card" content="summary" />
	{/if}
	<!-- Built by `jsonLdScript`, which escapes `<` so the data can never close the tag. -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLd}
</svelte:head>

<MicrositeRenderer {view} />
