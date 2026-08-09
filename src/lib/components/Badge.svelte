<script lang="ts">
	// Small uppercase pill for a stay's attributes — "Cabin", "Sleeps 4", "Sea view".
	// Same type treatment as the section label so tags read as part of the editorial
	// spine rather than as UI chrome. (This is the Badge/Tag primitive; one component
	// covers both — a "tag" is a Badge with `variant="outline"`.)
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLSpanElement> & {
		variant?: 'outline' | 'solid' | 'accent';
		children?: Snippet;
	};

	let { variant = 'outline', class: className, children, ...rest }: Props = $props();

	const variants = {
		outline: 'border border-current/30',
		solid: 'bg-surface-inverse text-content-on-inverse',
		accent: 'bg-accent text-on-dark'
	};
</script>

<span
	{...rest}
	class={[
		'inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 font-body text-label font-medium tracking-label uppercase',
		variants[variant],
		className
	]}
>
	{@render children?.()}
</span>
