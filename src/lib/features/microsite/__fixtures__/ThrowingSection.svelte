<script lang="ts">
	let { data, variant }: { data: unknown; variant: string } = $props();

	const boom = $derived.by(() => {
		if (data) throw new Error('section exploded');
		return '';
	});
</script>

<section data-variant={variant}>never rendered {boom}</section>
