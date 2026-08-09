<script lang="ts">
	// One-dimensional flex stack — the workhorse for label/heading/copy clusters
	// and for the baseline-aligned rows in a stay card.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLDivElement> & {
		direction?: 'column' | 'row';
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
