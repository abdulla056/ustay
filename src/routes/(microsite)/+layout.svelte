<script lang="ts">
	// Deliberately bare (UST-21): a skip link and `<main>`. The property's own chrome (nav, footer,
	// theme) arrives with UST-31.
	const { children } = $props();
</script>

<a
	href="#content"
	class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-pill focus:bg-surface-inverse focus:px-4 focus:py-2 focus:text-content-on-inverse"
>
	Skip to content
</a>
<main id="content">
	{@render children()}
</main>
