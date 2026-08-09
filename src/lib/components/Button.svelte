<script lang="ts">
	// The pill CTA. Renders a real `<button>`, or an `<a>` when given `href`, so
	// semantics and keyboard behaviour are never faked.
	//
	// Variants, in DESIGN.md terms:
	//   solid   — tone-aware filled chip: ink-on-paper in the light tone, paper-on-ink
	//             in an inverse section. The default primary CTA.
	//   paper   — always warm-cream fill + ink text. For CTAs over photography, where
	//             there is no tonal scope to inherit from (the hero "Explore stays").
	//   outline — 1px currentColor hairline on transparent (the nav "Reserve ↗").
	//   ghost   — no border, a whisper of tint on hover.
	//
	// Hover resolves to the olive accent with white text in every variant, which holds
	// AA on both tones. Transitions use `ease-editorial` — slow and weighted, never snappy.
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Props = HTMLButtonAttributes &
		HTMLAnchorAttributes & {
			variant?: 'solid' | 'paper' | 'outline' | 'ghost';
			size?: 'sm' | 'md';
			/** Present ⇒ renders an `<a>` instead of a `<button>`. */
			href?: string;
			children?: Snippet;
		};

	let {
		variant = 'solid',
		size = 'md',
		href,
		type = 'button',
		class: className,
		children,
		...rest
	}: Props = $props();

	const base =
		'inline-flex cursor-pointer items-center justify-center gap-2 rounded-pill font-body font-medium whitespace-nowrap transition-colors duration-500 ease-editorial focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:pointer-events-none disabled:opacity-50';

	const variants = {
		solid: 'bg-surface-inverse text-content-on-inverse hover:bg-accent hover:text-on-dark',
		paper: 'bg-paper text-ink hover:bg-accent hover:text-on-dark',
		outline: 'border border-current bg-transparent hover:bg-current/10',
		ghost: 'bg-transparent hover:bg-current/10'
	};

	const sizes = {
		sm: 'px-5 py-2.5 text-sm',
		md: 'px-7 py-3.5 text-base'
	};

	const classes = $derived([base, variants[variant], sizes[size], className]);
</script>

{#if href}
	<a {...rest} {href} class={classes}>{@render children?.()}</a>
{:else}
	<button {...rest} {type} class={classes}>{@render children?.()}</button>
{/if}
