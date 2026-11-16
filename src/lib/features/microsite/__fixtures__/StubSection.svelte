<script lang="ts">
	let { data, variant }: { data: unknown; variant: string } = $props();
	const label = $derived((data as { label: string }).label);
</script>

<section data-section={label} data-variant={variant}>{label}</section>
