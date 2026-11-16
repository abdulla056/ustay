<script lang="ts">
	// Placeholder booking call to action (UST-21). The request form is UST-30 / Phase 6; until
	// then this says so plainly instead of offering a control that does nothing.
	import { Container, Eyebrow, Heading, Section, Stack, Text } from '$lib';
	import { formatMoney } from '../format';
	import type { SectionProps } from '../types';

	let { data }: SectionProps<'booking_cta'> = $props();
</script>

<Section tone="inverse" label="Book" space="lg" data-section="booking_cta">
	<Container size="narrow">
		<Stack gap="md" align="start">
			<Eyebrow tone="accent">Stay with us</Eyebrow>
			<Heading level={2} size="lg">Stay at {data.name}</Heading>
			{#if data.fromPrice}
				<Text size="lead" tone="inherit">From {formatMoney(data.fromPrice)} a night.</Text>
			{/if}
			<Text tone="inherit">Booking requests are opening soon.</Text>
		</Stack>
	</Container>
</Section>
