<script lang="ts">
	// Inline text link. Hover resolves to the tonal accent (`text-accent-c`), which
	// holds AA on both the paper and the ink tone.
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes } from 'svelte/elements';

	type Props = HTMLAnchorAttributes & {
		href: string;
		/** `inline` is underlined in running copy; `quiet` underlines only on hover. */
		variant?: 'inline' | 'quiet';
		/** Opens in a new tab with a safe `rel`, and appends the editorial ↗ mark. */
		external?: boolean;
		children?: Snippet;
	};

	let {
		href,
		variant = 'inline',
		external = false,
		class: className,
		children,
		...rest
	}: Props = $props();

	const variants = {
		inline: 'underline decoration-1 underline-offset-4',
		quiet: 'no-underline hover:underline hover:underline-offset-4'
	};
</script>

<a
	{...rest}
	{href}
	target={external ? '_blank' : undefined}
	rel={external ? 'noopener noreferrer' : undefined}
	class={[
		'font-body transition-colors duration-500 ease-editorial hover:text-accent-c focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current',
		variants[variant],
		className
	]}
>
	{@render children?.()}{#if external}<span aria-hidden="true"> ↗</span>{/if}
</a>
