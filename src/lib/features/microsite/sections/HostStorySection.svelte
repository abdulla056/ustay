<script lang="ts">
	// Placeholder host and story (UST-21). UST-28 replaces the internals; the props contract stays.
	// `html` is server-rendered markdown (`html: false`, safe links): the only thing `{@html}` may take.
	import { Container, Eyebrow, Heading, Image, Section, Stack, Text } from '$lib';
	import type { SectionProps } from '../types';

	let { data }: SectionProps<'host_story'> = $props();
</script>

<Section label="Host and story" space="md" data-section="host_story">
	<Container size="narrow">
		<Stack gap="lg">
			{#if data.story}
				<Stack gap="sm">
					<Eyebrow tone="accent">The story</Eyebrow>
					<Heading level={2} size="lg" tone="content">
						{data.story.heading ?? 'Our story'}
					</Heading>
					<div class="space-y-4 text-content-prose">
						<!-- eslint-disable-next-line svelte/no-at-html-tags -->
						{@html data.story.body.html}
					</div>
				</Stack>
			{/if}
			{#if data.host}
				<Stack gap="sm">
					<Eyebrow tone="accent">Your host</Eyebrow>
					<Heading level={data.story ? 3 : 2} size="md" tone="content">
						{data.host.displayName}
					</Heading>
					{#if data.host.avatar}
						<Image
							src={data.host.avatar.src}
							alt={data.host.avatar.alt}
							width={data.host.avatar.width}
							height={data.host.avatar.height}
							ratio="1/1"
							class="w-32"
						/>
					{/if}
					{#if data.host.bio}
						<div class="space-y-4 text-content-prose">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html data.host.bio.html}
						</div>
					{/if}
					<Text size="sm" tone="muted">
						{#if data.host.hostingSince}Hosting since {data.host.hostingSince}.{/if}
						{#if data.host.languages.length > 0}
							Speaks {data.host.languages.join(', ')}.
						{/if}
					</Text>
				</Stack>
			{/if}
		</Stack>
	</Container>
</Section>
