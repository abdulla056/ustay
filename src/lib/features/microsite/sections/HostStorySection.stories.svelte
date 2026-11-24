<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import HostStorySection from './HostStorySection.svelte';
	import type { HostStoryData } from '../types';

	const rumahKabus: HostStoryData = {
		story: {
			heading: 'A house built to watch the weather',
			body: {
				html: `<p>Cheong Yew Meng built Rumah Kabus in 1954. He was a tea taster at the estate below the ridge, and he wanted a house from which he could see what the morning was going to do. The veranda faces the valley because the fog comes up from that side.</p><p>He built it with what the highlands offered: <strong>meranti</strong> from a sawmill at Ringlet, granite from the stream bed for the chimney, and roof tiles carried up the hill on the back of the estate lorry. The floorboards are the originals, and they creak in the same places they always did.</p><p>We have kept to Mr Cheong’s one rule, which is that the day starts with the view.</p>`
			}
		},
		host: {
			displayName: 'Hajar Mansor',
			bio: {
				html: `<p>I grew up in the estate village below the house and left at eighteen to study in Kuala Lumpur, as everyone did. I came back in 2016.</p><p>I look after the guests, the kitchen garden and most of the breakfast. I would rather answer a question than leave you with a map.</p>`
			},
			avatar: {
				src: '/prototype/lake-mountain.jpg',
				alt: 'Hajar Mansor on the veranda',
				width: 2000,
				height: 1333,
				focalX: 0.4
			},
			hostingSince: 2019,
			languages: ['en', 'ms']
		}
	};

	const { Story } = defineMeta({
		title: 'Features/Microsite/HostStorySection',
		component: HostStorySection,
		tags: ['autodocs'],
		parameters: { layout: 'fullscreen' },
		args: { data: rumahKabus, variant: 'default' }
	});
</script>

<Story name="Rumah Kabus" />

<Story
	name="Host only, no avatar or bio"
	args={{
		data: {
			story: null,
			host: { ...rumahKabus.host!, avatar: null, bio: null, hostingSince: null }
		}
	}}
/>

<Story name="Story only" args={{ data: { story: rumahKabus.story, host: null } }} />
