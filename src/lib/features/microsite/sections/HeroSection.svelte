<script lang="ts">
	// Placeholder hero (UST-21). UST-23 replaces the internals; the props contract stays.
	import { Container, Eyebrow, Heading, Image, Section, Text } from '$lib';
	import { objectPosition } from '$lib/features/gallery/layouts';
	import type { SectionProps } from '../types';

	let { data }: SectionProps<'hero'> = $props();
</script>

<Section tone="inverse" space="lg" data-section="hero">
	<Container size="wide">
		{#if data.locationLabel}
			<Eyebrow tone="accent">{data.locationLabel}</Eyebrow>
		{/if}
		<Heading level={1} size="xl">{data.name}</Heading>
		{#if data.tagline}
			<Text size="lead" tone="inherit" class="mt-6">{data.tagline}</Text>
		{/if}
		{#if data.image}
			<Image
				src={data.image.src}
				alt={data.image.alt}
				width={data.image.width}
				height={data.image.height}
				ratio="16/9"
				loading="eager"
				class="mt-12"
				style="object-position: {objectPosition(data.image)}"
			/>
		{/if}
	</Container>
</Section>
