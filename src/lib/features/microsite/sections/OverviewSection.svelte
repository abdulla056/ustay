<script lang="ts">
	// The overview (UST-24): the house in words. A numbered spine label, the short description as a
	// lead, the long description in a measured column, key facts, and reviews as a quiet pull-quote
	// moment rather than a review widget. Imported reviews always carry their origin.
	import { Container, Eyebrow, Label, Section, Text } from '$lib';
	import { reveal } from '$lib/motion';
	import { formatMoney, pickFeaturedQuote, plural, QUOTE_MAX, typeLabel } from '../format';
	import type { ReviewView, SectionProps } from '../types';

	let { data, number = null }: SectionProps<'overview'> = $props();

	const facts = $derived(
		[
			{ term: 'Stay', value: typeLabel(data.type) },
			data.placeLabel ? { term: 'Place', value: data.placeLabel } : null,
			data.roomCount > 0 ? { term: 'Rooms', value: String(data.roomCount) } : null,
			data.maxGuests ? { term: 'Sleeps', value: `Up to ${data.maxGuests}` } : null,
			data.fromPrice ? { term: 'From', value: `${formatMoney(data.fromPrice)} a night` } : null,
			data.reviews?.summary.average != null
				? { term: 'Guests rate', value: `${data.reviews.summary.average.toFixed(1)} / 5` }
				: null
		].filter((f): f is { term: string; value: string } => f !== null)
	);

	// A short review leads as the pull-quote (never a wall of text); up to two more sit beneath it.
	const quotes = $derived.by(() => {
		const items = data.reviews?.items ?? [];
		const featured = pickFeaturedQuote(items);
		const rest = items
			.filter((r, i) => i !== featured?.index && r.body.length <= QUOTE_MAX)
			.slice(0, 2);
		return { featured, rest };
	});

	const hasDescription = $derived(Boolean(data.shortDescription) || data.paragraphs.length > 0);

	const reviewNote = $derived.by(() => {
		const summary = data.reviews?.summary;
		if (!summary) return '';
		const count = plural(summary.count, 'review', 'reviews');
		return summary.importedCount > 0
			? `${count}, ${summary.importedCount} imported and labelled with their source.`
			: `${count}.`;
	});

	const origin = (r: ReviewView) =>
		r.source === 'imported' ? (r.origin ? `via ${r.origin}` : 'Imported review') : 'Verified guest';
</script>

{#snippet attribution(review: ReviewView)}
	<p class="mt-6 text-sm text-content-muted">
		<span class="font-medium text-content">{review.authorName}</span>
		<span aria-hidden="true"> · </span>
		<span aria-hidden="true">{review.rating}/5</span>
		<span class="sr-only">rated {review.rating} out of 5</span>
		<span> · </span>
		<span data-origin={review.source}>{origin(review)}</span>
	</p>
{/snippet}

<Section aria-labelledby="overview-heading" space="lg" data-section="overview">
	<Container>
		<div class="grid gap-10 lg:grid-cols-12 lg:gap-x-12">
			<div class="lg:col-span-3">
				<Label as="h2" id="overview-heading" number={number ?? undefined}>The house</Label>
			</div>

			{#if hasDescription}
				<div class="flex flex-col gap-8 lg:col-span-8 lg:col-start-4" {@attach reveal()}>
					{#if data.shortDescription}
						<p
							class="max-w-measure-tight font-display text-3xl leading-snug text-content sm:text-4xl"
						>
							{data.shortDescription}
						</p>
					{/if}
					{#if data.paragraphs.length > 0}
						<div class="flex max-w-measure flex-col gap-5">
							{#each data.paragraphs as paragraph, i (i)}
								<Text tone="prose" measure="none">{paragraph}</Text>
							{/each}
						</div>
					{/if}
				</div>
			{/if}

			{#if facts.length > 0}
				<dl
					class="grid grid-cols-2 gap-x-6 gap-y-8 border-t border-hairline-c pt-8 sm:grid-cols-3 lg:col-span-8 lg:col-start-4"
					{@attach reveal()}
				>
					{#each facts as fact (fact.term)}
						<div>
							<Eyebrow as="dt" tone="muted">{fact.term}</Eyebrow>
							<dd class="mt-2 font-display text-xl text-content">{fact.value}</dd>
						</div>
					{/each}
				</dl>
			{/if}

			{#if data.reviews}
				<div
					class="flex flex-col gap-12 border-t border-hairline-c pt-12 lg:col-span-8 lg:col-start-4"
					{@attach reveal()}
				>
					{#if quotes.featured}
						<figure data-testid="featured-review">
							<blockquote
								class="max-w-measure-tight font-display text-3xl leading-snug text-content italic sm:text-4xl"
							>
								<p>“{quotes.featured.text}”</p>
							</blockquote>
							{@render attribution(quotes.featured.review)}
						</figure>
					{/if}

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

					<p class="text-sm text-content-muted">
						{reviewNote}
					</p>
				</div>
			{/if}
		</div>
	</Container>
</Section>
