<script lang="ts">
	// The overview (UST-24): the house in words. A numbered spine label, the short description as a
	// lead, the long description in a measured column, key facts, and reviews as a quiet pull-quote
	// moment rather than a review widget. Imported reviews always carry their origin.
	import { Container, Label, Section, Text } from '$lib';
	import { reveal } from '$lib/motion';
	import { formatMoney } from '../format';
	import type { ReviewView, SectionProps } from '../types';

	let { data }: SectionProps<'overview'> = $props();

	const typeLabels = {
		homestay: 'Homestay',
		resort: 'Resort',
		boutique: 'Boutique stay',
		rental: 'Rental'
	} as const;

	const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

	const facts = $derived(
		[
			{ term: 'Stay', value: typeLabels[data.type] },
			data.roomCount > 0 ? { term: 'Rooms', value: String(data.roomCount) } : null,
			data.maxGuests ? { term: 'Sleeps', value: `Up to ${data.maxGuests}` } : null,
			data.fromPrice ? { term: 'From', value: `${formatMoney(data.fromPrice)} a night` } : null,
			data.reviews?.summary.average != null
				? { term: 'Guests rate', value: `${data.reviews.summary.average.toFixed(1)} / 5` }
				: null
		].filter((f): f is { term: string; value: string } => f !== null)
	);

	// Lead with a quote short enough to read as a pull-quote; up to two more sit smaller beneath it.
	const quotes = $derived.by(() => {
		const items = data.reviews?.items ?? [];
		const featuredIndex = Math.max(
			0,
			items.findIndex((r) => r.body.length <= 280)
		);
		const featured = items[featuredIndex] ?? null;
		const rest = items.filter((_, i) => i !== featuredIndex).slice(0, 2);
		return { featured, rest };
	});

	const origin = (r: ReviewView) =>
		r.source === 'imported' ? (r.origin ? `via ${r.origin}` : 'Imported review') : 'Verified guest';
</script>

{#snippet attribution(review: ReviewView)}
	<p class="mt-6 text-sm text-content-muted">
		<span class="font-medium text-content">{review.authorName}</span>
		<span aria-hidden="true"> · </span>{review.rating}/5<span aria-hidden="true"> · </span>
		<span data-origin={review.source}>{origin(review)}</span>
	</p>
{/snippet}

<Section aria-labelledby="overview-heading" space="lg" data-section="overview">
	<Container>
		<div class="grid gap-10 lg:grid-cols-12 lg:gap-x-12">
			<div class="lg:col-span-3">
				<Label as="h2" id="overview-heading" number="01">The house</Label>
			</div>

			<div class="flex flex-col gap-8 lg:col-span-8 lg:col-start-4" {@attach reveal()}>
				{#if data.shortDescription}
					<p class="max-w-[34ch] font-display text-3xl leading-snug text-content sm:text-4xl">
						{data.shortDescription}
					</p>
				{/if}
				<div class="flex max-w-measure flex-col gap-5">
					{#each data.paragraphs as paragraph, i (i)}
						<Text tone="prose" measure="none">{paragraph}</Text>
					{/each}
				</div>
			</div>

			{#if facts.length > 0}
				<dl
					class="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-hairline-c pt-8 sm:grid-cols-3 lg:col-span-8 lg:col-start-4 lg:grid-cols-5"
					{@attach reveal()}
				>
					{#each facts as fact (fact.term)}
						<div>
							<dt
								class="font-body text-eyebrow font-medium tracking-eyebrow text-content-muted uppercase"
							>
								{fact.term}
							</dt>
							<dd class="mt-2 font-display text-xl text-content">{fact.value}</dd>
						</div>
					{/each}
				</dl>
			{/if}

			{#if quotes.featured}
				{@const featured = quotes.featured}
				<div
					class="flex flex-col gap-12 border-t border-hairline-c pt-12 lg:col-span-8 lg:col-start-4"
					{@attach reveal()}
				>
					<figure data-testid="featured-review">
						<blockquote
							class="max-w-[30ch] font-display text-3xl leading-snug text-content italic sm:text-4xl"
						>
							<p>“{featured.body}”</p>
						</blockquote>
						{@render attribution(featured)}
					</figure>

					{#if quotes.rest.length > 0}
						<div class="grid gap-10 sm:grid-cols-2">
							{#each quotes.rest as review, i (i)}
								<figure>
									<blockquote class="font-display text-lg leading-relaxed text-content-prose">
										<p>“{review.body}”</p>
									</blockquote>
									{@render attribution(review)}
								</figure>
							{/each}
						</div>
					{/if}

					{#if data.reviews}
						<p class="text-sm text-content-muted">
							{plural(
								data.reviews.summary.count,
								'review',
								'reviews'
							)}{#if data.reviews.summary.importedCount > 0},
								{data.reviews.summary.importedCount} imported and labelled with their source{/if}.
						</p>
					{/if}
				</div>
			{/if}
		</div>
	</Container>
</Section>
