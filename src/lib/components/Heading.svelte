<script lang="ts">
	// The Fraunces display voice. `level` is the document outline, `size` is the
	// optical scale — they are deliberately independent so a visually huge line can
	// still be an `h2`. Weights come from the named display-weight tokens (340/360/440
	// on the variable axis), which is what keeps the serif elegant rather than bold.
	//
	// `<em>` inside a heading renders italic Fraunces — the calligraphic accent word
	// ("has a *story*") from DESIGN.md's signature elements.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLHeadingElement> & {
		/** Renders `h1`–`h6`. Semantics only. */
		level?: 1 | 2 | 3 | 4 | 5 | 6;
		/** Optical scale: `xl` hero → `xs` stay name. */
		size?: 'xl' | 'lg' | 'md' | 'sm' | 'xs';
		/** `inherit` keeps the surrounding colour (e.g. over photography). */
		tone?: 'inherit' | 'content' | 'accent';
		/** Pull the first glyph to the optical edge — for edge-bleeding hero type. */
		bleed?: boolean;
		children?: Snippet;
	};

	let {
		level = 2,
		size = 'md',
		tone = 'inherit',
		bleed = false,
		class: className,
		children,
		...rest
	}: Props = $props();

	const sizes = {
		xl: 'text-display-xl font-editorial',
		lg: 'text-display-lg font-editorial',
		md: 'text-display font-statement',
		sm: 'text-display-sm font-statement',
		xs: 'text-display-xs font-title'
	};

	const tones = {
		inherit: '',
		content: 'text-content',
		accent: 'text-accent-c'
	};
</script>

<svelte:element
	this={`h${level}`}
	{...rest}
	class={[
		'font-display tracking-display text-balance [&_em]:italic',
		sizes[size],
		tones[tone],
		bleed && '-ml-optical',
		className
	]}
>
	{@render children?.()}
</svelte:element>
