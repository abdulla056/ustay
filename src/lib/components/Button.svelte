<script lang="ts">
	// The pill CTA. Renders a real `<button>`, or an `<a>` when given `href`, so
	// semantics and keyboard behaviour are never faked.
	//
	// Variants, in DESIGN.md terms:
	//   solid   — tone-aware filled chip: ink-on-paper in the light tone, paper-on-ink
	//             in an inverse section. The default primary CTA.
	//   paper   — always warm-cream fill + ink text. For CTAs over photography, where
	//             there is no tonal scope to inherit from (the hero "Explore stays").
	//             It is the one variant that ignores the tone scope, which is exactly
	//             why it looks broken in the wrong place: on a paper surface it is
	//             cream-on-cream and reads as an unstyled chip. Not a bug — put it on
	//             an image, and use `solid` on paper (it already flips per tone).
	//   outline — 1px currentColor hairline on transparent (the nav "Reserve ↗").
	//   ghost   — no border, a whisper of tint on hover.
	//
	// Hover resolves to the olive accent with white text in every variant, which holds
	// AA on both tones. Transitions use `ease-editorial` — slow and weighted, never snappy.
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';

	type Props = HTMLButtonAttributes &
		HTMLAnchorAttributes & {
			/**
			 * `solid` is the default primary CTA and is tone-aware.
			 *
			 * ⚠️ `paper` is **always** cream fill + ink text — it is for CTAs over
			 * photography and ignores the surrounding tone scope. On a paper surface
			 * it is cream-on-cream, i.e. all but invisible. That is by design, not a
			 * rendering bug; reach for `solid` there.
			 */
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
