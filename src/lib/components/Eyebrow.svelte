<script lang="ts">
	// The small uppercase letter-spaced line that sits above a hero or a heading.
	// Widest tracking in the system (`tracking-eyebrow`, 0.22em).
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	type Props = HTMLAttributes<HTMLElement> & {
		as?: 'p' | 'span' | 'div';
		/** `inherit` is right over photography; `accent` on a paper surface. */
		tone?: 'inherit' | 'accent' | 'muted';
		children?: Snippet;
	};

	let { as = 'p', tone = 'inherit', class: className, children, ...rest }: Props = $props();

	const tones = {
		inherit: '',
		accent: 'text-accent-c',
		muted: 'text-content-muted'
	};
</script>

<svelte:element
	this={as}
	{...rest}
	class={['font-body text-eyebrow font-medium tracking-eyebrow uppercase', tones[tone], className]}
>
	{@render children?.()}
</svelte:element>
