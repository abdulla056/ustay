<script lang="ts">
	// The hero (UST-23): a full-viewport photograph, dark tone, with the name in display type over it.
	// The only `h1` on the page. The CTA anchors to the booking section (`#booking`, owned by UST-30).
	import { Button, Container, Eyebrow, Heading, Image, Section, Text } from '$lib';
	import { objectPosition } from '$lib/features/gallery/layouts';
	import { displayEntrance, reveal, scrollTo } from '$lib/motion';
	import type { SectionProps } from '../types';

	let { data }: SectionProps<'hero'> = $props();

	// Through the smooth scroller when it is running; the plain `#booking` href still works without JS.
	function toBooking(event: MouseEvent) {
		const target = document.getElementById('booking');
		if (!target) return;
		event.preventDefault();
		scrollTo(target);
		history.replaceState(history.state, '', '#booking');
	}
</script>

<Section
	tone="inverse"
	space="none"
	data-section="hero"
	class="relative isolate flex min-h-svh items-end overflow-hidden"
>
	{#if data.image}
		<Image
			src={data.image.src}
			alt={data.image.alt}
			width={data.image.width}
			height={data.image.height}
			ratio="16/9"
			rounded="none"
			loading="eager"
			fetchpriority="high"
			class="absolute inset-0 -z-20 h-full w-full"
			imgClass="hero-settle"
			style="object-position: {objectPosition(data.image)}"
		/>
		<!-- Scrim: keeps the type legible whatever the photograph does behind it. -->
		<div
			aria-hidden="true"
			class="absolute inset-0 -z-10 bg-linear-to-t from-ink/80 via-ink/25 to-ink/45"
		></div>
	{/if}

	<!-- The top padding leaves room for the fixed nav. -->
	<Container size="wide" class="relative pt-32 pb-16 md:pb-20">
		{#if data.locationLabel}
			<Eyebrow tone="inherit" class="mb-5 opacity-90" {@attach reveal({ y: 16, delay: 0.2 })}>
				{data.locationLabel}
			</Eyebrow>
		{/if}
		<Heading level={1} size="xl" bleed class="text-balance" {@attach displayEntrance()}>
			{data.name}
		</Heading>
		<div class="mt-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
			{#if data.tagline}
				<Text size="lead" tone="inherit" measure="tight" {@attach reveal({ y: 20, delay: 0.5 })}>
					{data.tagline}
				</Text>
			{/if}
			<div {@attach reveal({ y: 20, delay: 0.7 })}>
				<Button variant="paper" href="#booking" onclick={toBooking}>Request to stay</Button>
			</div>
		</div>
	</Container>
</Section>

<style>
	/* A slow scale-settle on load; reduced motion gets the finished frame. */
	@media (prefers-reduced-motion: no-preference) {
		:global(.hero-settle) {
			animation: hero-settle 2.4s var(--ease-editorial, cubic-bezier(0.22, 1, 0.36, 1)) both;
		}
	}
	@keyframes hero-settle {
		from {
			transform: scale(1.08);
		}
		to {
			transform: scale(1);
		}
	}
</style>
