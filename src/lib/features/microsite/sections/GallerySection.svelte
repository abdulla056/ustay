<script lang="ts">
	// Placeholder gallery (UST-21). The `zoom` variant is the real ZoomGallery; UST-25 builds the
	// rest. The props contract stays.
	import { Container, Grid, Image } from '$lib';
	import ZoomGallery from '$lib/features/gallery/ZoomGallery.svelte';
	import { objectPosition } from '$lib/features/gallery/layouts';
	import type { SectionProps } from '../types';

	let { data, variant }: SectionProps<'gallery'> = $props();
</script>

<div data-section="gallery" data-variant={variant}>
	<h2 class="sr-only">Photographs</h2>
	{#if variant === 'zoom'}
		<ZoomGallery frames={data.frames} label="Photographs of the property" />
	{:else}
		<Container size="wide" class="py-section">
			<Grid cols={3} gap="tight">
				{#each data.frames as frame, i (i)}
					<figure>
						<Image
							src={frame.src}
							alt={frame.alt}
							width={frame.width}
							height={frame.height}
							ratio="4/3"
							style="object-position: {objectPosition(frame)}"
						/>
						{#if frame.caption}
							<figcaption class="mt-2 text-sm text-content-muted">{frame.caption}</figcaption>
						{/if}
					</figure>
				{/each}
			</Grid>
		</Container>
	{/if}
</div>
