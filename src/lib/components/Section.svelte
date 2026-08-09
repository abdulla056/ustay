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

	type Props = HTMLAttributes<HTMLElement> & {
		/** Tonal scope. `inherit` paints nothing (use over imagery). */
		tone?: 'inherit' | 'surface' | 'inverse';
		/** Vertical rhythm. */
		space?: 'none' | 'sm' | 'md' | 'lg';
		children?: Snippet;
	};

	let { tone = 'surface', space = 'md', class: className, children, ...rest }: Props = $props();

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
</script>

<section {...rest} data-tone={scope} class={[painted, spaces[space], className]}>
	{@render children?.()}
</section>
