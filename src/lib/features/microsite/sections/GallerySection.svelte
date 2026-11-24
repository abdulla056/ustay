<script lang="ts">
	// The photographs. `zoom` is the ZoomGallery sequence (each frame opens the lightbox) with a
	// "View all photographs" button after it; `grid` and `default` are an editorial grid whose frames
	// open the lightbox directly. Every image but the first is lazy.
	import { Button, Container, Eyebrow, Heading, Image, Section } from '$lib';
	import ZoomGallery from '$lib/features/gallery/ZoomGallery.svelte';
	import { objectPosition } from '$lib/features/gallery/layouts';
	import { reveal } from '$lib/motion';
	import type { SectionProps } from '../types';
	import Lightbox from './gallery/Lightbox.svelte';

	let { data, variant }: SectionProps<'gallery'> = $props();

	let open = $state<number | null>(null);
	let opener = $state<HTMLElement | null>(null);

	// The opener is passed in explicitly: Safari does not focus a button on click, so the lightbox
	// cannot rely on `document.activeElement`.
	function show(index: number, from: HTMLElement) {
		opener = from;
		open = index;
	}

	// A repeating editorial rhythm: wide/narrow pairs that alternate sides, so rows fill 12 columns.
	// The last frame of an odd count has no partner and takes the whole row.
	const PATTERN = [
		{ span: 'md:col-span-7', ratio: '3/2' },
		{ span: 'md:col-span-5', ratio: '4/5' },
		{ span: 'md:col-span-5', ratio: '4/5' },
		{ span: 'md:col-span-7', ratio: '3/2' }
	] as const;
	const WHOLE_ROW = { span: 'md:col-span-12', ratio: '16/9' } as const;

	const cellFor = (i: number, n: number) =>
		i === n - 1 && n % 2 === 1 ? WHOLE_ROW : PATTERN[i % PATTERN.length];
</script>

<div data-section="gallery" data-variant={variant}>
	{#if variant === 'zoom'}
		<h2 class="sr-only">Photographs</h2>
		<ZoomGallery frames={data.frames} label="Photographs of the property" onselect={show} />
		{#if data.frames.length > 0}
			<Section space="sm">
				<Container class="flex justify-center">
					<Button variant="outline" onclick={(event) => show(0, event.currentTarget)}>
						View all photographs
					</Button>
				</Container>
			</Section>
		{/if}
	{:else}
		<Section label="Photographs" space="md">
			<Container size="wide">
				<div class="mb-12 max-w-2xl" {@attach reveal({ select: ':scope > *', stagger: 0.1 })}>
					<Eyebrow tone="accent">Photographs</Eyebrow>
					<Heading level={2} size="lg" tone="content" class="mt-4">A look around</Heading>
				</div>
				<ul class="grid grid-cols-1 items-end gap-x-6 gap-y-10 md:grid-cols-12">
					{#each data.frames as frame, i (i)}
						{@const cell = cellFor(i, data.frames.length)}
						<li class={['min-w-0', cell.span]}>
							<figure class="group">
								<!-- The button is stretched over the image only; the caption stays a caption. -->
								<div class="relative">
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
									<button
										type="button"
										class="absolute inset-0 cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-current"
										aria-label="View photograph {i + 1} of {data.frames.length}"
										onclick={(event) => show(i, event.currentTarget)}
									></button>
								</div>
								{#if frame.caption}
									<figcaption class="mt-3 text-sm text-content-muted">{frame.caption}</figcaption>
								{/if}
							</figure>
						</li>
					{/each}
				</ul>
			</Container>
		</Section>
	{/if}
	<Lightbox frames={data.frames} bind:index={open} {opener} />
</div>
