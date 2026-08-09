<script lang="ts">
	// One-dimensional flex stack — the workhorse for label/heading/copy clusters
	// and for the baseline-aligned rows in a stay card.
	//
	// The `gap` prop owns the `gap` shorthand outright — see its doc comment. A
	// `gap-*` utility passed through `class` is not an override; it is a second
	// declaration of the same property, and which one wins is decided by Tailwind's
	// stylesheet order, not by the order of your class list.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLDivElement> & {
		direction?: 'column' | 'row';
		/**
		 * Spacing between children, from the scale — **the only gap seam on Stack.**
		 * Never pass a `gap-*` utility through `class`: it collides with this prop
		 * and the winner comes from Tailwind's CSS ordering rather than your class
		 * list. The scale is the constraint that keeps the page rhythm on the
		 * spacing tokens, so there is no arbitrary-value escape hatch here.
		 *
		 * Needing one usually means one of two things: refine a single axis with
		 * `gap="none"` plus `gap-x-*`/`gap-y-*` (those conflict with nothing), or
		 * you want a one-off box rather than a rhythm primitive — use a plain
		 * `<div class="flex …">`.
		 */
		gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
		align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
		justify?: 'start' | 'center' | 'end' | 'between';
		wrap?: boolean;
		children?: Snippet;
	};

	let {
		direction = 'column',
		gap = 'md',
		align = 'stretch',
		justify = 'start',
		wrap = false,
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
					'[Stack] a `gap-*` utility came in through `class`; it collides with the `gap` prop and Tailwind CSS order decides the winner. Use the `gap` prop, or `gap="none"` plus `gap-x-*`/`gap-y-*`.'
				);
			}
		});
	}

	const directions = { column: 'flex-col', row: 'flex-row' };

	const gaps = {
		none: 'gap-0',
		xs: 'gap-2',
		sm: 'gap-4',
		md: 'gap-6',
		lg: 'gap-10',
		xl: 'gap-16'
	};

	const alignments = {
		start: 'items-start',
		center: 'items-center',
		end: 'items-end',
		baseline: 'items-baseline',
		stretch: 'items-stretch'
	};

	const justifications = {
		start: 'justify-start',
		center: 'justify-center',
		end: 'justify-end',
		between: 'justify-between'
	};
</script>

<div
	{...rest}
	class={[
		'flex',
		directions[direction],
		gaps[gap],
		alignments[align],
		justifications[justify],
		wrap && 'flex-wrap',
		className
	]}
>
	{@render children?.()}
</div>
