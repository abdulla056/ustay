<script lang="ts">
	// Placeholder location (UST-21). UST-29 replaces the internals (maps included); the props
	// contract stays. Address lines arrive only when the owner shows the exact location.
	import { Container, Eyebrow, Grid, Heading, Link, Section, Stack, Text } from '$lib';
	import type { AttractionView, SectionProps } from '../types';

	let { data }: SectionProps<'location'> = $props();

	const travel = (a: AttractionView) =>
		a.travel ? `${a.travel.minutes} min by ${a.travel.mode}` : null;
	const place = $derived(data.place?.label ?? 'Nearby');
</script>

<Section label="Location" space="md" data-section="location">
	<Container size="content">
		<Stack gap="lg">
			<Stack gap="sm">
				<Eyebrow tone="accent">Around the house</Eyebrow>
				<Heading level={2} size="lg" tone="content">{place}</Heading>
				{#if data.place?.addressLines.length}
					<Text size="sm" tone="muted">{data.place.addressLines.join(', ')}</Text>
				{/if}
				{#if data.destination?.summary}
					<Text measure="default">{data.destination.summary}</Text>
				{/if}
			</Stack>
			{#if data.attractions.length > 0}
				<Grid cols={2}>
					{#each data.attractions as attraction, i (i)}
						<div>
							<Heading level={3} size="xs" tone="content">
								{#if attraction.url}
									<Link href={attraction.url} external variant="quiet">{attraction.name}</Link>
								{:else}
									{attraction.name}
								{/if}
							</Heading>
							{#if travel(attraction)}
								<Text size="sm" tone="muted">{travel(attraction)}</Text>
							{/if}
							{#if attraction.hostNote}
								<Text size="sm" class="mt-1">{attraction.hostNote}</Text>
							{/if}
						</div>
					{/each}
				</Grid>
			{/if}
		</Stack>
	</Container>
</Section>
