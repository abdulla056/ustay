<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import BookingCtaSection from './BookingCtaSection.svelte';

	const { Story } = defineMeta({
		title: 'Microsite/BookingCtaSection',
		component: BookingCtaSection,
		parameters: { layout: 'fullscreen' }
	});
</script>

<Story
	name="Rumah Kabus"
	args={{
		variant: 'default',
		data: {
			name: 'Rumah Kabus',
			fromPrice: { amountMinor: 28000, currency: 'MYR' },
			maxGuests: 8
		}
	}}
/>

<Story
	name="No price, long name"
	args={{
		variant: 'default',
		data: {
			name: 'The Very Long Named Heritage Boutique Residence of the Highlands',
			fromPrice: null,
			maxGuests: null
		}
	}}
/>
