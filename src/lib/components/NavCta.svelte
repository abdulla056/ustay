<script lang="ts">
	// The nav's single outline pill (`Reserve ↗`). One component so the bar and the
	// mobile menu's mirrored top row render the exact same CTA and cannot drift.
	import Button from './Button.svelte';
	import type { NavLink } from './nav';

	type Props = {
		cta: NavLink;
		onclick?: (event: MouseEvent) => void;
	};

	let { cta, onclick }: Props = $props();
</script>

<Button variant="outline" size="sm" href={cta.href} class="duration-700" {onclick}>
	{cta.label}<span aria-hidden="true">↗</span>
</Button>
