<script lang="ts">
	import { onMount } from 'svelte';
	import { Container, Eyebrow, Heading, Section, Text } from '$lib';
	import { reveal } from '$lib/motion';
	import { amenityIcon } from './amenities/icons';
	import type { SectionProps } from '../types';

	let { data }: SectionProps<'amenities'> = $props();

	/** On phone widths, how many amenities show before "Show all". */
	const PHONE_LIMIT = 8;

	// Without JS nothing collapses (so nothing is unreachable); `enhanced` flips on mount.
	let enhanced = $state(false);
	let expanded = $state(false);
	onMount(() => {
		enhanced = true;
	});

	// Running index of each group's first item, to decide what the collapsed phone view hides.
	const groups = $derived.by(() => {
		let start = 0;
		return data.groups
			.filter((g) => g.items.length > 0)
			.map((g) => {
				const out = { ...g, start };
				start += g.items.length;
				return out;
			});
	});
	const total = $derived(groups.reduce((n, g) => n + g.items.length, 0));
	const collapsible = $derived(enhanced && total > PHONE_LIMIT);
	const collapsed = $derived(collapsible && !expanded);
</script>

<Section label="Amenities" space="md" data-section="amenities">
	<Container size="content">
		<div class="grid gap-12 lg:grid-cols-12 lg:gap-16">
			<div class="lg:col-span-4">
				<div class="lg:sticky lg:top-32" {@attach reveal()}>
					<Eyebrow tone="accent">What is here</Eyebrow>
					<Heading level={2} size="lg" tone="content" class="mt-4">Everything at hand</Heading>
				</div>
			</div>

			<div class="lg:col-span-8">
				{#if groups.length === 0}
					<Text tone="muted">The host has not listed amenities yet.</Text>
				{:else}
					<div id="amenity-groups" class="grid gap-x-12 gap-y-12 sm:grid-cols-2">
						{#each groups as group (group.category)}
							<div
								class={collapsed && group.start >= PHONE_LIMIT ? 'max-md:hidden' : ''}
								{@attach reveal()}
							>
								<Heading level={3} size="xs" tone="content" class="border-b border-hairline-c pb-3">
									{group.label}
								</Heading>
								<ul class="mt-5 space-y-5">
									{#each group.items as item, i (item.key + ':' + i)}
										{@const Icon = amenityIcon(item.icon)}
										<li
											class={[
												'flex gap-4',
												collapsed && group.start + i >= PHONE_LIMIT && 'max-md:hidden'
											]}
										>
											<Icon class="mt-1 size-5 shrink-0 text-accent-c" strokeWidth={1.25} />
											<div>
												<Text as="span" size="base" tone="content" class="block">{item.name}</Text>
												{#if item.note}
													<Text as="span" size="sm" tone="muted" class="mt-1 block"
														>{item.note}</Text
													>
												{/if}
											</div>
										</li>
									{/each}
								</ul>
							</div>
						{/each}
					</div>

					{#if collapsible}
						<button
							type="button"
							class="mt-10 border-b border-current pb-1 text-sm tracking-wide text-content focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-c md:hidden"
							aria-expanded={expanded}
							aria-controls="amenity-groups"
							onclick={() => (expanded = !expanded)}
						>
							{expanded ? 'Show fewer' : `Show all ${total} amenities`}
						</button>
					{/if}
				{/if}
			</div>
		</div>
	</Container>
</Section>
