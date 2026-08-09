<script lang="ts">
	// Horizontal frame for editorial content: a max measure, centred, inside the
	// fluid page gutter. Generous margins are a DESIGN.md layout principle, so the
	// gutter is on by default and full-bleed is the explicit opt-out.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLDivElement> & {
		/** Max content width. `content` is the editorial default. */
		size?: 'narrow' | 'content' | 'wide' | 'full';
		/** Apply the fluid page inset (`px-gutter`). Off for full-bleed media. */
		gutter?: boolean;
		children?: Snippet;
	};

	let { size = 'content', gutter = true, class: className, children, ...rest }: Props = $props();

	const widths = {
		narrow: 'max-w-3xl',
		content: 'max-w-5xl',
		wide: 'max-w-7xl',
		full: 'max-w-none'
	};
</script>

<div {...rest} class={['mx-auto w-full', widths[size], gutter && 'px-gutter', className]}>
	{@render children?.()}
</div>
