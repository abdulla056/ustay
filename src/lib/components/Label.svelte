<script lang="ts">
	// The numbered editorial section label — `01 — The idea`. DESIGN.md calls the
	// numbered, named spine a *signature element*, so it gets its own primitive
	// rather than being re-typed as a span on every section.
	//
	// On a real page the spine label usually *is* the section's heading — the
	// visual hierarchy and the document outline are the same thing there — so `as`
	// reaches up to `h2`–`h6`. Reach for that instead of pinning an `id` on a `<p>`
	// and pointing `aria-labelledby` at it from the band.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLElement> & {
		/**
		 * Render target. `h2`–`h6` when this label is the section's real heading —
		 * the styling is identical, only the outline changes. `h1` is deliberately
		 * absent: the page title is a `Heading`, never a spine label.
		 */
		as?: 'p' | 'span' | 'div' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
		/** Section number, e.g. `"01"`. Rendered as `01 — Label`. */
		number?: string;
		tone?: 'accent' | 'inherit' | 'muted';
		children?: Snippet;
	};

	let { as = 'p', number, tone = 'accent', class: className, children, ...rest }: Props = $props();

	const tones = {
		accent: 'text-accent-c',
		inherit: '',
		muted: 'text-content-muted'
	};

	// Built here rather than in the markup so the em dash and its spacing can't be
	// reflowed away by a formatter.
	const prefix = $derived(number ? `${number} — ` : '');
</script>

<svelte:element
	this={as}
	{...rest}
	class={['font-body text-label font-medium tracking-label uppercase', tones[tone], className]}
>
	{prefix}{@render children?.()}
</svelte:element>
