<script lang="ts">
	// Self-hosted fonts (no Google Fonts CDN). Fraunces with the optical-size axis
	// for editorial display + its italic for the calligraphic `Ustay` wordmark; Inter
	// for body/utility. Family names ('Fraunces Variable' / 'Inter Variable') are
	// wired into the type tokens in layout.css.
	import '@fontsource-variable/fraunces/opsz.css';
	import '@fontsource-variable/fraunces/opsz-italic.css';
	import '@fontsource-variable/inter/index.css';
	import './layout.css';

	const { children } = $props();
</script>

{@render children()}
