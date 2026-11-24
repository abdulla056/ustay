<script lang="ts">
	// The hero (UST-23): a full-viewport photograph, dark tone, with the name in display type over it.
	// The only `h1` on the page. The CTA anchors to the booking section, and only renders when one exists.
	import { Button, Container, Eyebrow, Heading, Image, Section, Text } from '$lib';
	import { jumpToAnchor } from '$lib/components/nav';
	import { objectPosition } from '$lib/features/gallery/layouts';
	import { displayEntrance, imageReveal, reveal } from '$lib/motion';
	import type { SectionProps } from '../types';

	let { data }: SectionProps<'hero'> = $props();

	// Clears the fixed nav (the same offset the nav's own anchor links use).
	const NAV_OFFSET = -96;

	// A plain click goes through the smooth scroller (modifier and non-primary clicks are left to
	// the browser, and the `href` still works without JS); focus then moves to the target so
	// keyboard users land in the booking section.
	function toBooking(event: MouseEvent, href: string) {
		if (!jumpToAnchor(event, href, NAV_OFFSET)) return;
		const target = document.getElementById(href.slice(1));
		if (!target) return;
		if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
		target.focus({ preventScroll: true });
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
			ratio="auto"
			rounded="none"
			loading="eager"
			fetchpriority="high"
			class="absolute inset-0 -z-20"
			imgClass="h-full!"
			style="object-position: {objectPosition(data.image)}"
			{@attach imageReveal({ wipe: 'none', duration: 2.4 })}
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
			<Eyebrow tone="inherit" class="mb-5" {@attach reveal({ y: 16, delay: 0.2 })}>
				{data.locationLabel}
			</Eyebrow>
		{/if}
		<Heading level={1} size="xl" bleed {@attach displayEntrance()}>
			{data.name}
		</Heading>
		<div class="mt-8 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
			{#if data.tagline}
				<Text size="lead" tone="inherit" measure="tight" {@attach reveal({ y: 20, delay: 0.5 })}>
					{data.tagline}
				</Text>
			{/if}
			{#if data.bookingAnchor}
				{@const href = data.bookingAnchor}
				<div {@attach reveal({ y: 20, delay: 0.7 })}>
					<Button variant="paper" {href} onclick={(event: MouseEvent) => toBooking(event, href)}>
						Request to stay
					</Button>
				</div>
			{/if}
		</div>
	</Container>
</Section>
