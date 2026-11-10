<script lang="ts">
	// A band of the page: vertical rhythm plus an optional tonal scope.
	//
	// `tone="inverse"` stamps `data-tone="inverse"`, which re-points the semantic
	// colour vars in layout.css — so everything inside (text, muted copy, accent,
	// hairlines) resolves to its dark-tone value without any component knowing it
	// is on dark. `tone="inherit"` leaves the background alone, which is what you
	// want for a section sitting over full-bleed photography.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { warnClassCollision } from './dev';

	type Props = HTMLAttributes<HTMLElement> & {
		/** Tonal scope. `inherit` paints nothing (use over imagery). */
		tone?: 'inherit' | 'surface' | 'inverse';
		/** Vertical rhythm. */
		space?: 'none' | 'sm' | 'md' | 'lg';
		/**
		 * Accessible name for the band. Given → renders `<section>`, which is a
		 * `region` landmark. Without a name (here, or `aria-label` /
		 * `aria-labelledby`) it renders a plain `<div>`, since an unnamed `section`
		 * is not a landmark and only adds noise to the outline.
		 */
		label?: string;
		children?: Snippet;
	};

	let {
		tone = 'surface',
		space = 'md',
		label,
		class: className,
		children,
		...rest
	}: Props = $props();

	const spaces = {
		none: '',
		sm: 'py-section-sm',
		md: 'py-section',
		lg: 'py-section-lg'
	};

	// `bg-surface`/`text-content` mean different things in different scopes, which
	// is the point — one class pair covers both the paper and the ink tone.
	const painted = $derived(tone !== 'inherit' && 'bg-surface text-content');
	const scope = $derived(tone === 'inverse' ? 'inverse' : tone === 'surface' ? 'light' : undefined);

	// `space="none"` generates no padding, so only a padding utility that the
	// `space` prop would own is worth warning about.
	if (import.meta.env.DEV) {
		$effect(() => {
			if (space !== 'none') {
				warnClassCollision(
					'Section',
					className,
					/(?:^|[\s,])(?:py|pt|pb)-/,
					'a `py-*`/`pt-*`/`pb-*` utility came in through `class`; the `space` prop owns vertical rhythm and Tailwind CSS order decides the winner. Use `space`, or `space="none"` if the band should have no rhythm.'
				);
			}
		});
	}

	const named = $derived(label !== undefined || 'aria-label' in rest || 'aria-labelledby' in rest);
</script>

<svelte:element
	this={named ? 'section' : 'div'}
	{...rest}
	aria-label={label ?? rest['aria-label']}
	data-tone={scope}
	class={[painted, spaces[space], className]}
>
	{@render children?.()}
</svelte:element>
