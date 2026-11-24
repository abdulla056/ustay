<script lang="ts">
	// The photographs. `zoom` is the ZoomGallery sequence with a "View all photographs" way into the
	// lightbox after it; `grid` and `default` are an editorial grid whose frames open the lightbox
	// directly. Every image but the first is lazy.
	import { Button, Container, Eyebrow, Heading, Image, Section } from '$lib';
	import ZoomGallery from '$lib/features/gallery/ZoomGallery.svelte';
	import { objectPosition } from '$lib/features/gallery/layouts';
	import { reveal } from '$lib/motion';
	import type { SectionProps } from '../types';
	import Lightbox from './gallery/Lightbox.svelte';

	let { data, variant }: SectionProps<'gallery'> = $props();

	let open = $state<number | null>(null);

	// A repeating editorial rhythm: wide/narrow pairs that alternate sides.
	const PATTERN = [
		{ span: 'md:col-span-7', ratio: '3/2' },
		{ span: 'md:col-span-5', ratio: '4/5' },
		{ span: 'md:col-span-5', ratio: '4/5' },
		{ span: 'md:col-span-7', ratio: '3/2' }
	] as const;
</script>

<div data-section="gallery" data-variant={variant}>
	{#if variant === 'zoom'}
		<h2 class="sr-only">Photographs</h2>
		<ZoomGallery frames={data.frames} label="Photographs of the property" />
		{#if data.frames.length > 0}
			<Section space="sm">
				<Container class="flex justify-center">
					<Button variant="outline" onclick={() => (open = 0)}>View all photographs</Button>
				</Container>
			</Section>
		{/if}
	{:else}
		<Section space="md">
			<Container size="wide">
				<div class="mb-12 max-w-2xl" {@attach reveal({ select: ':scope > *', stagger: 0.1 })}>
					<Eyebrow tone="accent">Photographs</Eyebrow>
					<Heading level={2} size="lg" tone="content" class="mt-4">A look around</Heading>
				</div>
				<ul class="grid grid-cols-1 items-end gap-x-6 gap-y-10 md:grid-cols-12">
					{#each data.frames as frame, i (i)}
						{@const cell = PATTERN[i % PATTERN.length]}
						<li class={['min-w-0', cell.span]}>
							<button
								type="button"
								class="group block w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
								onclick={() => (open = i)}
							>
								<Image
									src={frame.src}
									alt={frame.alt}
									width={frame.width}
									height={frame.height}
									ratio={cell.ratio}
									loading={i === 0 ? 'eager' : 'lazy'}
									imgClass="transition-transform duration-1000 ease-editorial group-hover:scale-[1.03] motion-reduce:transition-none"
									style="object-position: {objectPosition(frame)}"
								/>
								{#if frame.caption}
									<span class="mt-3 block text-sm text-content-muted">{frame.caption}</span>
								{/if}
							</button>
						</li>
					{/each}
				</ul>
			</Container>
		</Section>
	{/if}
	<Lightbox frames={data.frames} bind:index={open} />
</div>
