<script lang="ts">
	// Host and story (UST-28): the authenticity centrepiece. A long-form, well-measured read, then
	// the host as a signed-off page. `html` is server-rendered markdown (`html: false`, safe links):
	// the only thing `{@html}` may take, so its prose elements are styled here with `.prose-story`.
	import { Container, Eyebrow, Heading, Image, Label, Section } from '$lib';
	import { objectPosition } from '$lib/features/gallery/layouts';
	import { reveal } from '$lib/motion';
	import type { SectionProps } from '../types';

	let { data, number = null }: SectionProps<'host_story'> = $props();

	const languageNames = (() => {
		try {
			return new Intl.DisplayNames(['en'], { type: 'language' });
		} catch {
			return null;
		}
	})();

	function languageLabel(code: string): string {
		try {
			return languageNames?.of(code) ?? code;
		} catch {
			return code;
		}
	}

	const languages = $derived((data.host?.languages ?? []).map(languageLabel));
	const initial = $derived(data.host?.displayName.trim().charAt(0).toUpperCase() ?? '');
</script>

<Section label="Host and story" space="lg" data-section="host_story">
	<Container size="content">
		<div class="space-y-24 md:space-y-32">
			{#if data.story}
				<div class="grid gap-8 lg:grid-cols-12 lg:gap-12">
					<header class="lg:sticky lg:top-28 lg:col-span-5 lg:self-start" {@attach reveal()}>
						<Label number={number ?? undefined}>The story</Label>
						<Heading level={2} size="lg" tone="content" class="mt-4">
							{data.story.heading ?? 'Our story'}
						</Heading>
					</header>
					<div class="lg:col-span-7">
						<div class="prose-story max-w-measure" {@attach reveal({ y: 24 })}>
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html data.story.body.html}
						</div>
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
						{#if data.story}<Eyebrow tone="accent">Your host</Eyebrow>{:else}<Label
								number={number ?? undefined}>Your host</Label
							>{/if}
						<Heading level={data.story ? 3 : 2} size="md" tone="content" class="mt-4">
							{data.host.displayName}
						</Heading>
						{#if data.host.bio}
							<div class="prose-story mt-8 max-w-measure">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html data.host.bio.html}
							</div>
						{/if}
						{#if data.host.hostingSince || languages.length > 0}
							<dl class="mt-10 flex flex-wrap gap-x-12 gap-y-6 border-t border-content/15 pt-6">
								{#if data.host.hostingSince}
									<div>
										<dt class="font-body text-xs tracking-wide text-content-muted uppercase">
											Hosting since
										</dt>
										<dd class="mt-1 font-display text-display-xs text-content">
											{data.host.hostingSince}
										</dd>
									</div>
								{/if}
								{#if languages.length > 0}
									<div>
										<dt class="font-body text-xs tracking-wide text-content-muted uppercase">
											Speaks
										</dt>
										<dd class="mt-1 font-display text-display-xs text-content">
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

<style>
	.prose-story :global(p) {
		font-size: var(--text-lead);
		line-height: 1.75;
		color: var(--color-content-prose);
		margin: 0 0 1.5em;
	}
	.prose-story :global(p:last-child) {
		margin-bottom: 0;
	}
	.prose-story :global(strong) {
		font-weight: 600;
		color: var(--color-content);
	}
	.prose-story :global(em) {
		font-style: italic;
	}
	.prose-story :global(a) {
		color: var(--color-content);
		text-decoration: underline;
		text-underline-offset: 0.2em;
		text-decoration-thickness: 1px;
	}
	.prose-story :global(a:hover) {
		color: var(--color-accent-c);
	}
	.prose-story :global(a:focus-visible) {
		outline: 2px solid var(--color-accent-c);
		outline-offset: 3px;
	}
	.prose-story :global(h2),
	.prose-story :global(h3),
	.prose-story :global(h4) {
		font-family: var(--font-display);
		color: var(--color-content);
		margin: 2em 0 0.75em;
		line-height: 1.2;
	}
	.prose-story :global(h2) {
		font-size: 1.75rem;
	}
	.prose-story :global(h3),
	.prose-story :global(h4) {
		font-size: 1.35rem;
	}
	.prose-story :global(ul),
	.prose-story :global(ol) {
		margin: 0 0 1.5em;
		padding-left: 1.4em;
		color: var(--color-content-prose);
		font-size: var(--text-lead);
		line-height: 1.7;
	}
	.prose-story :global(ul) {
		list-style: disc;
	}
	.prose-story :global(ol) {
		list-style: decimal;
	}
	.prose-story :global(blockquote) {
		margin: 2em 0;
		padding-left: 1.5em;
		border-left: 1px solid var(--color-accent-c);
		font-family: var(--font-display);
		font-style: italic;
		font-size: 1.4rem;
		line-height: 1.45;
		color: var(--color-content);
	}
	.prose-story :global(blockquote p) {
		font-size: inherit;
		color: inherit;
	}
	.prose-story :global(hr) {
		margin: 2.5em 0;
		border: 0;
		border-top: 1px solid color-mix(in srgb, var(--color-content) 15%, transparent);
	}
</style>
