<script lang="ts">
	// Placeholder amenities (UST-21). UST-27 replaces the internals (icons included); the props
	// contract stays.
	import { Container, Eyebrow, Grid, Heading, Section, Stack, Text } from '$lib';
	import type { SectionProps } from '../types';

	let { data }: SectionProps<'amenities'> = $props();
</script>

<Section label="Amenities" space="md" data-section="amenities">
	<Container size="content">
		<Stack gap="lg">
			<Stack gap="sm">
				<Eyebrow tone="accent">What is here</Eyebrow>
				<Heading level={2} size="lg" tone="content">Amenities</Heading>
			</Stack>
			<Grid cols={2}>
				{#each data.groups as group (group.category)}
					<div>
						<Heading level={3} size="xs" tone="content">{group.label}</Heading>
						<ul class="mt-2 space-y-1">
							{#each group.items as item (item.key)}
								<li>
									<Text as="span" size="sm">{item.name}</Text>
									{#if item.note}
										<Text as="span" size="sm" tone="muted">&nbsp;· {item.note}</Text>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</Grid>
		</Stack>
	</Container>
</Section>
