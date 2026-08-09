<script lang="ts">
	// Editorial grid. Collapses to a single column on small screens rather than
	// shrinking into an OTA-style listing grid (see DESIGN.md "never do").
	//
	// The `gap` prop owns the `gap` shorthand outright — see its doc comment. A
	// `gap-*` utility passed through `class` is not an override; it is a second
	// declaration of the same property, and which one wins is decided by Tailwind's
	// stylesheet order, not by the order of your class list.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLDivElement> & {
		/** Columns at `md` and up; always 1 (or 2 for `4`) below that. */
		cols?: 1 | 2 | 3 | 4;
		/**
		 * Gutter between cells, from the grid spacing tokens — **the only gap seam on
		 * Grid.** Never pass a `gap-*` utility through `class`: it collides with this
		 * prop and the winner comes from Tailwind's CSS ordering rather than your
		 * class list. `gap-grid`/`gap-grid-tight` are fluid clamps, and keeping them
		 * behind the prop is what keeps every grid on the page breathing together.
		 *
		 * For different row and column gutters, set `gap="none"` and pass
		 * `gap-x-*`/`gap-y-*` — those declare separate properties and conflict with
		 * nothing.
		 */
		gap?: 'none' | 'tight' | 'default';
		align?: 'start' | 'center' | 'end' | 'stretch';
		children?: Snippet;
	};

	let {
		cols = 3,
		gap = 'default',
		align = 'start',
		class: className,
		children,
		...rest
	}: Props = $props();

	// A silent collision is the worst version of this, so dev says it out loud.
	// `gap-x-*`/`gap-y-*` pass without comment — they refine one axis and are the
	// sanctioned pairing with `gap="none"`.
	if (import.meta.env.DEV) {
		$effect(() => {
			if (/(?:^|[\s,])-?gap-(?!x-|y-)/.test([className].flat(9).join(' '))) {
				console.warn(
					'[Grid] a `gap-*` utility came in through `class`; it collides with the `gap` prop and Tailwind CSS order decides the winner. Use the `gap` prop, or `gap="none"` plus `gap-x-*`/`gap-y-*`.'
				);
			}
		});
	}

	const columns = {
		1: 'grid-cols-1',
		2: 'grid-cols-1 md:grid-cols-2',
		3: 'grid-cols-1 md:grid-cols-3',
		4: 'grid-cols-2 md:grid-cols-4'
	};

	const gaps = {
		none: 'gap-0',
		tight: 'gap-grid-tight',
		default: 'gap-grid'
	};

	const alignments = {
		start: 'items-start',
		center: 'items-center',
		end: 'items-end',
		stretch: 'items-stretch'
	};
</script>

<div {...rest} class={['grid', columns[cols], gaps[gap], alignments[align], className]}>
	{@render children?.()}
</div>
