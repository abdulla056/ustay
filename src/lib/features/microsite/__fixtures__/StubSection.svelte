<script lang="ts">
	let {
		data,
		variant,
		number = null
	}: { data: unknown; variant: string; number?: string | null } = $props();
	const label = $derived((data as { label: string }).label);
</script>

<section data-section={label} data-variant={variant} data-number={number}>{label}</section>
