<script lang="ts">
	// The stay card, lifted from the prototype: a cropped image frame above a
	// baseline-aligned row of name / location / price. No border, no elevation —
	// the photograph is the card, the type sits quietly underneath.
	//
	// Composable three ways: pass `src`/`title`/`location`/`price` for the standard
	// stay card, a `media` snippet to replace the frame, or `children` to replace the
	// content row entirely. With `href` the whole card becomes one click target via a
	// stretched link, so the accessible name is the stay's name and nothing is nested
	// inside anything interactive.
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Heading from './Heading.svelte';
	import Image from './Image.svelte';
	import Text from './Text.svelte';
	import type { Ratio } from './ratio';

	type Props = HTMLAttributes<HTMLElement> & {
		/** The stay's name — also the card's accessible name when `href` is set. */
		title?: string;
		location?: string;
		/** Pre-formatted, e.g. `"$220"` — currency formatting is the caller's job. */
		price?: string;
		/** e.g. `"/night"`. Set in Inter so the price keeps the serif voice. */
		priceUnit?: string;
		href?: string;
		src?: string;
		alt?: string;
		ratio?: Ratio;
		/** Replaces the image frame. */
		media?: Snippet;
		/** Replaces the name/location/price row. */
		children?: Snippet;
	};

	let {
		title,
		location,
		price,
		priceUnit,
		href,
		src,
		alt = '',
		ratio = '4/5',
		media,
		children,
		class: className,
		...rest
	}: Props = $props();
</script>

<article {...rest} class={['group relative', className]}>
	{#if media}
		{@render media()}
	{:else if src}
		<Image
			{src}
			{alt}
			{ratio}
			rounded="frame"
			imgClass="transition-transform duration-700 ease-editorial group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
		/>
	{/if}

	{#if children}
		<div class="mt-4">{@render children()}</div>
	{:else}
		<div class="mt-4 flex items-baseline justify-between gap-4">
			<div>
				<Heading level={3} size="xs" tone="content">
					{#if href}
						<a
							{href}
							class="rounded-image after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
						>
							{title}
						</a>
					{:else}
						{title}
					{/if}
				</Heading>
				{#if location}
					<Text size="sm" tone="muted" class="mt-1">{location}</Text>
				{/if}
			</div>
			{#if price}
				<p class="font-display text-display-xs whitespace-nowrap text-content">
					{price}{#if priceUnit}<span class="font-body text-sm text-content-muted">{priceUnit}</span
						>{/if}
				</p>
			{/if}
		</div>
	{/if}
</article>
