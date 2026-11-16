<script lang="ts">
	// Placeholder rooms (UST-21). UST-26 replaces the internals; the props contract stays.
	import { Container, Eyebrow, Grid, Heading, Image, Section, Stack, Text } from '$lib';
	import { formatMoney } from '../format';
	import type { SectionProps } from '../types';

	let { data }: SectionProps<'rooms'> = $props();

	const bedLabel = (bed: { type: string; count: number }) => `${bed.count} ${bed.type}`;
</script>

<Section label="Rooms" space="md" data-section="rooms">
	<Container size="wide">
		<Stack gap="lg">
			<Stack gap="sm">
				<Eyebrow tone="accent">Where you sleep</Eyebrow>
				<Heading level={2} size="lg" tone="content">Rooms</Heading>
			</Stack>
			<Grid cols={2}>
				{#each data.rooms as room (room.name)}
					<article>
						{#if room.image}
							<Image
								src={room.image.src}
								alt={room.image.alt}
								width={room.image.width}
								height={room.image.height}
								ratio="4/3"
							/>
						{/if}
						<Heading level={3} size="sm" tone="content" class="mt-4">{room.name}</Heading>
						<Text size="sm" tone="muted">
							{formatMoney(room.nightly)} a night · up to {room.maxGuests}
							{room.maxGuests === 1 ? 'guest' : 'guests'}
							{#if room.beds.length > 0}
								· {room.beds.map(bedLabel).join(', ')}
							{/if}
						</Text>
						{#if room.description}
							<Text size="sm" class="mt-2">{room.description}</Text>
						{/if}
					</article>
				{/each}
			</Grid>
		</Stack>
	</Container>
</Section>
