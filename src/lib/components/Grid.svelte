<script lang="ts">
	// Editorial grid. Collapses to a single column on small screens rather than
	// shrinking into an OTA-style listing grid (see DESIGN.md "never do").
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLDivElement> & {
		/** Columns at `md` and up; always 1 (or 2 for `4`) below that. */
		cols?: 1 | 2 | 3 | 4;
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
