<script lang="ts">
	// Host and story (UST-28): the authenticity centrepiece. A long-form, well-measured read, then
	// the host. The spine label is the section's h2; the story heading is display type. Owner prose
	// arrives as server-rendered markdown and goes through `RichText`.
	import { Container, Eyebrow, Heading, Image, Label, RichText, Section } from '$lib';
	import { objectPosition } from '$lib/features/gallery/layouts';
	import { reveal } from '$lib/motion';
	import { languageName } from '../format';
	import type { SectionProps } from '../types';

	let { data, number = null }: SectionProps<'host_story'> = $props();

	const languages = $derived((data.host?.languages ?? []).map(languageName));
	const initial = $derived(Array.from(data.host?.displayName.trim() ?? '')[0]?.toUpperCase() ?? '');
</script>

<Section aria-labelledby="host-story-heading" space="lg" data-section="host_story">
	<Container size="content">
		<div class="space-y-24 md:space-y-32">
			{#if data.story}
				<div class="grid gap-8 lg:grid-cols-12 lg:gap-12">
					<header class="lg:sticky lg:top-28 lg:col-span-5 lg:self-start" {@attach reveal()}>
						<Label as="h2" id="host-story-heading" number={number ?? undefined}>The story</Label>
						<Heading as="p" size="lg" tone="content" class="mt-4">
							{data.story.heading ?? 'Our story'}
						</Heading>
					</header>
					<div class="lg:col-span-7">
						<RichText html={data.story.body.html} {@attach reveal({ y: 24 })} />
					</div>
				</div>
			{/if}

			{#if data.host}
				<div
					class="grid items-start gap-10 md:grid-cols-12 md:gap-12"
					data-part="host"
					{@attach reveal({ y: 24 })}
				>
					<div class="md:col-span-5">
						{#if data.host.avatar}
							<Image
								src={data.host.avatar.src}
								alt={data.host.avatar.alt}
								width={data.host.avatar.width}
								height={data.host.avatar.height}
								ratio="4/5"
								class="w-full max-w-sm"
								style="object-position: {objectPosition(data.host.avatar)}"
							/>
						{:else}
							<div
								class="flex aspect-[4/5] w-full max-w-sm items-center justify-center rounded-image bg-content/5 font-display text-7xl text-accent-c"
								aria-hidden="true"
							>
								{initial}
							</div>
						{/if}
					</div>
					<div class="md:col-span-7">
						{#if data.story}
							<Eyebrow tone="accent">Your host</Eyebrow>
						{:else}
							<Label as="h2" id="host-story-heading" number={number ?? undefined}>Your host</Label>
						{/if}
						<Heading level={3} size="md" tone="content" class="mt-4">
							{data.host.displayName}
						</Heading>
						{#if data.host.bio}
							<RichText html={data.host.bio.html} class="mt-8" />
						{/if}
						{#if data.host.hostingSince || languages.length > 0}
							<dl class="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-t border-hairline-c pt-6">
								{#if data.host.hostingSince}
									<div>
										<Eyebrow as="dt" tone="muted">Hosting since</Eyebrow>
										<dd class="mt-2 font-display text-display-xs text-content">
											{data.host.hostingSince}
										</dd>
									</div>
								{/if}
								{#if languages.length > 0}
									<div>
										<Eyebrow as="dt" tone="muted">Speaks</Eyebrow>
										<dd class="mt-2 font-display text-display-xs text-content">
											{languages.join(', ')}
										</dd>
									</div>
								{/if}
							</dl>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</Container>
</Section>
