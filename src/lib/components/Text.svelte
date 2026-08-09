<script lang="ts">
	// Inter body copy. `measure` caps the line length in `ch` — line length is a
	// type decision, so it comes from the measure tokens rather than a one-off width.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLElement> & {
		as?: 'p' | 'span' | 'div';
		/** `lead` is the editorial intro voice; `base`/`sm` are plain body copy. */
		size?: 'lead' | 'base' | 'sm';
		tone?: 'inherit' | 'content' | 'prose' | 'muted';
		/** Cap the line length: `default` 52ch, `tight` 34ch. */
		measure?: 'none' | 'default' | 'tight';
		children?: Snippet;
	};

	let {
		as = 'p',
		size = 'base',
		tone = 'prose',
		measure = 'none',
		class: className,
		children,
		...rest
	}: Props = $props();

	const sizes = {
		lead: 'text-lead',
		base: 'text-base/relaxed',
		sm: 'text-sm/relaxed'
	};

	const tones = {
		inherit: '',
		content: 'text-content',
		prose: 'text-content-prose',
		muted: 'text-content-muted'
	};

	const measures = {
		none: '',
		default: 'max-w-measure',
		tight: 'max-w-measure-tight'
	};
</script>

<svelte:element
	this={as}
	{...rest}
	class={['font-body [&_em]:italic', sizes[size], tones[tone], measures[measure], className]}
>
	{@render children?.()}
</svelte:element>
