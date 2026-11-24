<script lang="ts">
	import { tick } from 'svelte';
	import { Container, Eyebrow, Grid, Heading, Section, Stack, Text } from '$lib';
	import { refreshMotion, reveal } from '$lib/motion';
	import { amenityIcon } from './amenities/icons';
	import type { SectionProps } from '../types';

	let { data }: SectionProps<'amenities'> = $props();

	/** On phone widths, how many amenities show before "Show all". */
	const PHONE_LIMIT = 8;

	const uid = $props.id();
	const regionId = `${uid}-groups`;

	// Collapsed from the first (server) render, so phone users never see the full list and then
	// watch it fold away on hydration. The collapse is CSS-only (see the style block) and only applies
	// where scripting is on, so without JS everything stays visible.
	let expanded = $state(false);
	let toggle: HTMLButtonElement | undefined = $state();

	// Running index of each group's first item, to decide what the collapsed phone view hides.
	const groups = $derived.by(() => {
		let start = 0;
		return data.groups.map((g) => {
			const out = { ...g, start };
			start += g.items.length;
			return out;
		});
	});
	const total = $derived(groups.reduce((n, g) => n + g.items.length, 0));
	const collapsible = $derived(total > PHONE_LIMIT);

	async function onToggle() {
		expanded = !expanded;
		// The page height just changed: wait for the DOM, then re-measure the scroll triggers so
		// reveals further down fire at the right position.
		await tick();
		refreshMotion({ scrollTo: false });
		if (!expanded) toggle?.scrollIntoView({ block: 'nearest' });
		toggle?.focus({ preventScroll: true });
	}
</script>

<Section label="Amenities" space="md" data-section="amenities">
	<Container size="content">
		<Grid cols={3}>
			<div class="md:sticky md:top-32" {@attach reveal()}>
				<Stack gap="sm">
					<Eyebrow tone="accent">What is here</Eyebrow>
					<Heading level={2} size="lg" tone="content">Everything at hand</Heading>
				</Stack>
			</div>

			<div class="md:col-span-2">
				<Stack gap="lg">
					<div id={regionId} data-collapsed={collapsible && !expanded}>
						<Grid cols={2}>
							{#each groups as group (group.category)}
								<div data-more={group.start >= PHONE_LIMIT} {@attach reveal()}>
									<Stack gap="md">
										<Heading
											level={3}
											size="xs"
											tone="content"
											class="border-b border-hairline-c pb-3"
										>
											{group.label}
										</Heading>
										<!-- Stack renders a div, so a list needs its own flex column. -->
										<ul class="flex flex-col gap-6">
											{#each group.items as item, i (item.key)}
												{@const Icon = amenityIcon(item.icon)}
												<li class="flex gap-4" data-more={group.start + i >= PHONE_LIMIT}>
													<Icon
														class="mt-1 size-icon shrink-0 text-accent-c"
														strokeWidth={1.25}
														aria-hidden="true"
													/>
													<div>
														<Text as="span" size="base" tone="content" class="block">
															{item.name}
														</Text>
														{#if item.note}
															<Text as="span" size="sm" tone="muted" class="mt-1 block">
																{item.note}
															</Text>
														{/if}
													</div>
												</li>
											{/each}
										</ul>
									</Stack>
								</div>
							{/each}
						</Grid>
					</div>

					{#if collapsible}
						<button
							bind:this={toggle}
							type="button"
							class="toggle w-fit border-b border-current pb-1 text-sm tracking-wide text-content focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-c md:hidden"
							aria-expanded={expanded}
							aria-controls={regionId}
							onclick={onToggle}
						>
							{expanded ? 'Show fewer' : `Show all ${total} amenities`}
						</button>
					{/if}
				</Stack>
			</div>
		</Grid>
	</Container>
</Section>

<style>
	/* Phone widths (below Tailwind's `md`, 48rem), scripting on: fold away everything past the
	   limit. A group with nothing before the limit folds whole; one that straddles it folds its
	   tail. With scripting off the rules do not apply and the toggle is hidden. */
	@media (max-width: 47.999rem) and (scripting: enabled) {
		[data-collapsed='true'] [data-more='true'] {
			display: none;
		}
	}
	@media (scripting: none) {
		.toggle {
			display: none;
		}
	}
</style>
