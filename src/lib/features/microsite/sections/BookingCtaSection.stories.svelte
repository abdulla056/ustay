<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import BookingCtaSection from './BookingCtaSection.svelte';

	const { Story } = defineMeta({
		title: 'Microsite/BookingCtaSection',
		component: BookingCtaSection,
		parameters: { layout: 'fullscreen' }
	});

	// The reveal rises and fades in; let it settle so the a11y check measures the final colours.
	const settled = async () => {
		await new Promise((resolve) => setTimeout(resolve, 1800));
	};
</script>

<Story
	name="Rumah Kabus"
	play={settled}
	args={{
		variant: 'default',
		data: {
			name: 'Rumah Kabus',
			rooms: [
				{ key: 'r1', name: 'Garden Room' },
				{ key: 'r2', name: 'Loft' }
			],
			fromPrice: { amountMinor: 28000, currency: 'MYR' },
			maxGuests: 8
		}
	}}
/>

<Story
	name="No price, long name"
	play={settled}
	args={{
		variant: 'default',
		data: {
			name: 'The Very Long Named Heritage Boutique Residence of the Highlands',
			rooms: [],
			fromPrice: null,
			maxGuests: null
		}
	}}
/>
