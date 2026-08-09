<script lang="ts">
	// Inline-SVG wrapper. Sized in `em` (`size-icon`) so an icon is always
	// proportional to the text it sits beside, and stroked in `currentColor` so it
	// inherits the tonal scope. Thin strokes by default — restraint over weight.
	//
	// Pass the paths as children:
	//   <Icon label="Open in a new tab"><path d="M7 17 17 7" /></Icon>
	//
	// Without a `label` the icon is `aria-hidden` — correct for decoration beside
	// text. With one it becomes an image with an accessible name.
	import type { Snippet } from 'svelte';
	import type { SVGAttributes } from 'svelte/elements';

	type Props = SVGAttributes<SVGSVGElement> & {
		/** Accessible name. Omit for purely decorative icons. */
		label?: string;
		viewBox?: string;
		children?: Snippet;
	};

	let { label, viewBox = '0 0 24 24', class: className, children, ...rest }: Props = $props();
</script>

<svg
	fill="none"
	stroke="currentColor"
	stroke-width="1.25"
	stroke-linecap="round"
	stroke-linejoin="round"
	{...rest}
	{viewBox}
	xmlns="http://www.w3.org/2000/svg"
	role={label ? 'img' : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
	class={['size-icon shrink-0', className]}
>
	{@render children?.()}
</svg>
