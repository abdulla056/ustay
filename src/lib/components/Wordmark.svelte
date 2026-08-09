<script lang="ts">
	// The calligraphic `Ustay` wordmark — one of DESIGN.md's four signature elements,
	// and deliberately *type* rather than an image asset: Fraunces italic straight off
	// the token layer. Because it is text, it inherits `currentColor`, so the nav's
	// dark→light tone flip carries the mark for free with no second implementation.
	//
	// `size` mirrors `Heading`'s optical scale (and its display-weight per step, so a
	// large mark stays elegant instead of turning bold) and defaults to `xs`, the fixed
	// nav being where the mark mostly lives.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLElement> & {
		/** Optical scale — same names and steps as `Heading`. */
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		/** Present ⇒ renders an `<a>` (the nav's home link) instead of a `<span>`. */
		href?: string;
		/** Override the word — a microsite's own mark. Defaults to `Ustay`. */
		children?: Snippet;
	};

	let { size = 'xs', href, class: className, children, ...rest }: Props = $props();

	const sizes = {
		xs: 'text-display-xs font-title',
		sm: 'text-display-sm font-statement',
		md: 'text-display font-statement',
		lg: 'text-display-lg font-editorial',
		xl: 'text-display-xl font-editorial'
	};

	// `duration-700 ease-editorial` matches the nav's tone flip: an inherited colour
	// change does not transition on a descendant unless the descendant transitions it
	// too, so without this the mark would snap while the links around it crossfaded.
	const base =
		'inline-block font-display tracking-display whitespace-nowrap italic transition-colors duration-700 ease-editorial motion-reduce:transition-none';

	const interactive =
		'hover:text-accent-c focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current';
</script>

<svelte:element
	this={href ? 'a' : 'span'}
	{...rest}
	{href}
	class={[base, sizes[size], href && interactive, className]}
>
	{#if children}{@render children()}{:else}Ustay{/if}
</svelte:element>
