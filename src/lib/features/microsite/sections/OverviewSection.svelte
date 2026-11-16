<script lang="ts">
	// Placeholder overview (UST-21). UST-24 replaces the internals; the props contract stays.
	import { Badge, Container, Eyebrow, Heading, Section, Stack, Text } from '$lib';
	import { formatMoney } from '../format';
	import type { SectionProps } from '../types';

	let { data }: SectionProps<'overview'> = $props();

	const guestLabel = (n: number) => (n === 1 ? '1 guest' : `${n} guests`);
</script>

<Section label="Overview" space="md" data-section="overview">
	<Container size="content">
		<Stack gap="md">
			<Eyebrow tone="accent">The stay</Eyebrow>
			<Heading level={2} size="lg" tone="content">About this {data.type}</Heading>
			{#if data.shortDescription}
				<Text size="lead" measure="default">{data.shortDescription}</Text>
			{/if}
			{#each data.paragraphs as paragraph (paragraph)}
				<Text measure="default">{paragraph}</Text>
			{/each}
			<Stack direction="row" gap="sm" wrap>
				{#if data.roomCount > 0}
					<Badge>{data.roomCount} {data.roomCount === 1 ? 'room' : 'rooms'}</Badge>
				{/if}
				{#if data.maxGuests}
					<Badge>Up to {guestLabel(data.maxGuests)}</Badge>
				{/if}
				{#if data.fromPrice}
					<Badge>From {formatMoney(data.fromPrice)} a night</Badge>
				{/if}
			</Stack>
			{#if data.reviews}
				<Stack gap="sm">
					<Heading level={3} size="xs" tone="content">
						Guest reviews
						{#if data.reviews.summary.average !== null}
							· {data.reviews.summary.average.toFixed(1)} from {data.reviews.summary.count}
						{/if}
					</Heading>
					{#each data.reviews.items.slice(0, 3) as review (review.authorName + review.body)}
						<figure>
							<blockquote>
								<Text size="sm">“{review.body}”</Text>
							</blockquote>
							<figcaption class="text-sm text-content-muted">
								{review.authorName}, {review.rating}/5 ·
								{#if review.source === 'imported'}
									Imported review{review.origin ? ` from ${review.origin}` : ''}
								{:else}
									Verified guest
								{/if}
							</figcaption>
						</figure>
					{/each}
				</Stack>
			{/if}
		</Stack>
	</Container>
</Section>
