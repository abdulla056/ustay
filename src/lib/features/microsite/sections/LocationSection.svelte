<script lang="ts">
	// Location, map and attractions (UST-29). The list is the content; the map is a lazy
	// enhancement (location/LocationMap.svelte). Address lines arrive only when the owner shows the
	// exact location (decision 8); otherwise the map draws an approximate circle, never a pin.
	import { Container, Eyebrow, Heading, Image, Link, Section, Stack, Text } from '$lib';
	import { displayEntrance, reveal } from '$lib/motion';
	import { objectPosition } from '$lib/features/gallery/layouts';
	import type { SectionProps } from '../types';
	import LocationMap from './location/LocationMap.svelte';
	import { travelLabel } from './location/geo';

	let { data }: SectionProps<'location'> = $props();

	const place = $derived(data.place);
	const markers = $derived(
		data.attractions.flatMap((a, i) =>
			a.latitude != null && a.longitude != null
				? [{ n: i + 1, name: a.name, latitude: a.latitude, longitude: a.longitude }]
				: []
		)
	);
	const label = $derived(place?.label ?? data.destination?.name ?? 'the house');
</script>

<Section label="Location" space="lg" data-section="location">
	<Container size="wide">
		<div class="grid gap-12 lg:grid-cols-12 lg:gap-16">
			<div class="lg:col-span-5">
				<Stack gap="lg">
					<Stack gap="sm">
						<Eyebrow tone="accent">Around the house</Eyebrow>
						<div {@attach displayEntrance()}>
							<Heading level={2} size="lg" tone="content">{label}</Heading>
						</div>
						{#if place?.addressLines.length}
							<Text size="sm" tone="muted">{place.addressLines.join(', ')}</Text>
						{/if}
						{#if data.destination?.summary}
							<div {@attach reveal()}>
								<Text measure="default">{data.destination.summary}</Text>
							</div>
						{/if}
					</Stack>
					{#if place && place.latitude != null && place.longitude != null}
						<div class="lg:sticky lg:top-24" {@attach reveal()}>
							<LocationMap
								latitude={place.latitude}
								longitude={place.longitude}
								exact={place.exact}
								{label}
								{markers}
							/>
						</div>
					{/if}
				</Stack>
			</div>

			{#if data.attractions.length > 0}
				<div class="lg:col-span-7">
					<ol class="divide-y divide-content/15 border-y border-content/15">
						{#each data.attractions as attraction, i (i)}
							{@const travel = travelLabel(attraction)}
							<li id="attraction-{i + 1}" class="scroll-mt-24 py-8" {@attach reveal({ y: 24 })}>
								<div class="grid gap-5 sm:grid-cols-[minmax(0,1fr)_11rem] sm:gap-8">
									<div class="min-w-0">
										<p class="text-xs tracking-[0.14em] text-accent-c uppercase">
											{attraction.category}
											{#if travel}<span class="text-content-muted">· {travel}</span>{/if}
										</p>
										<Heading level={3} size="xs" tone="content" class="mt-2">
											{#if attraction.url}
												<Link href={attraction.url} external variant="quiet">{attraction.name}</Link
												>
											{:else}
												{attraction.name}
											{/if}
										</Heading>
										{#if attraction.hostNote}
											<Text size="sm" class="mt-3 max-w-prose">{attraction.hostNote}</Text>
										{/if}
									</div>
									{#if attraction.image}
										<Image
											src={attraction.image.src}
											alt={attraction.image.alt}
											width={attraction.image.width}
											height={attraction.image.height}
											ratio="4/3"
											class="order-first w-full sm:order-last"
											style="object-position: {objectPosition(attraction.image)}"
										/>
									{/if}
								</div>
							</li>
						{/each}
					</ol>
				</div>
			{/if}
		</div>
	</Container>
</Section>
