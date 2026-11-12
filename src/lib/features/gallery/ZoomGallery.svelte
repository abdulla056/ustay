<script lang="ts">
	// The sticky zoom-out gallery (UST-52). One hero frame fills the viewport and,
	// as you scroll, zooms out to reveal a composed mosaic.
	//
	// There is one set of <img> elements and two presentations of them. The
	// server (and reduced motion, and a failed GSAP load) renders a static
	// editorial grid — no sticky stage, no extra scroll length. Once mounted with
	// motion allowed, the same frames are laid onto a sticky stage and scaled by
	// a scrubbed ScrollTrigger. Transforms only; nothing animates layout.
	import { onMount } from 'svelte';
	import { Image } from '$lib';
	import { getSmoothScroller, reducedMotion, refreshMotion } from '$lib/motion';
	import { loadMotion } from '$lib/motion/internal';
	import { clampFrames, layoutFor, objectPosition } from './layouts';
	import type { GalleryFrame } from './types';

	type Props = {
		frames: GalleryFrame[];
		/** Accessible name for the region. */
		label: string;
		/** Scroll distance of the zoom as a CSS length. Default `300vh`, the prototype's. */
		scrollLength?: string;
		class?: string;
	};

	let { frames, label, scrollLength = '300vh', class: className }: Props = $props();

	const shown = $derived(clampFrames(frames));
	const slots = $derived(layoutFor(shown.length));

	// Server and first client render are static; enhance after mount.
	let mounted = $state(false);
	let failed = $state(false);
	onMount(() => {
		mounted = true;
	});

	const zoom = $derived(mounted && !failed && !reducedMotion.current && slots !== undefined);

	let root = $state<HTMLElement>();
	let items = $state<HTMLElement[]>([]);

	$effect(() => {
		if (!zoom || !root || !slots) return;
		const section = root;
		const targets = items.slice(0, slots.length);
		const scales = slots.map((slot) => slot.scale);
		let cancelled = false;
		let context: { revert: () => void } | undefined;

		loadMotion().then(
			({ gsap }) => {
				if (cancelled) return;
				context = gsap.context(() => {
					// Lenis already eases the scroll; without it, give the scrub its own weight.
					const scrub = getSmoothScroller() ? true : 0.6;
					const timeline = gsap.timeline({
						defaults: { ease: 'none' },
						scrollTrigger: {
							trigger: section,
							start: 'top top',
							end: 'bottom bottom',
							scrub,
							// `will-change` only while the zoom is actually running.
							onToggle: (self) => {
								if (self.isActive) section.dataset.active = '';
								else delete section.dataset.active;
							}
						}
					});
					targets.forEach((el, i) => timeline.fromTo(el, { scale: 1 }, { scale: scales[i] }, 0));
				}, section);

				// Late-loading photographs shouldn't leave the triggers mis-measured.
				const pending = [...section.querySelectorAll('img')].filter((img) => !img.complete);
				if (pending.length) {
					void Promise.all(
						pending.map(
							(img) =>
								new Promise((resolve) => {
									img.addEventListener('load', resolve, { once: true });
									img.addEventListener('error', resolve, { once: true });
								})
						)
					).then(() => {
						if (!cancelled) refreshMotion({ scrollTo: false });
					});
				}
			},
			(error: unknown) => {
				console.error('[ZoomGallery] GSAP failed to load; showing the static grid', error);
				failed = true;
			}
		);

		return () => {
			cancelled = true;
			context?.revert(); // kills every ScrollTrigger it created
			delete section.dataset.active;
		};
	});
</script>

<section
	bind:this={root}
	aria-label={label}
	data-zoom-gallery
	data-mode={zoom ? 'zoom' : 'static'}
	data-count={shown.length}
	style:--zg-length={scrollLength}
	class={['zg', className]}
>
	<div class="zg__stage">
		{#each shown as frame, i (i)}
			<figure
				class="zg__item"
				bind:this={items[i]}
				style:--x="{slots?.[i].x ?? 0}vw"
				style:--y="{slots?.[i].y ?? 0}vh"
				style:--w="{slots?.[i].w ?? 0}vw"
				style:--h="{slots?.[i].h ?? 0}vh"
			>
				<div class="zg__frame">
					<Image
						src={frame.src}
						alt={frame.alt}
						ratio="auto"
						rounded={zoom ? 'none' : 'image'}
						loading={i === 0 ? 'eager' : 'lazy'}
						width={frame.width}
						height={frame.height}
						class="h-full"
						imgClass="h-full!"
						style="object-position: {objectPosition(frame)}"
					/>
				</div>
				{#if frame.caption && !zoom}
					<figcaption class="zg__caption">{frame.caption}</figcaption>
				{/if}
			</figure>
		{/each}
	</div>
</section>

<style>
	/* ---------- static: the server, no-JS and reduced-motion presentation ---------- */
	.zg {
		padding: clamp(3rem, 8vh, 6rem) var(--spacing-gutter, 1.5rem);
	}
	.zg__stage {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: clamp(0.6rem, 1.5vw, 1.2rem);
	}
	.zg__item {
		margin: 0;
		grid-column: span 3;
	}
	.zg__frame {
		aspect-ratio: 4 / 3;
	}
	.zg__caption {
		margin-top: 0.5rem;
		font-size: 0.8125rem;
		opacity: 0.7;
	}
	/* The lead frame spans the full width; an orphan on the last row does too. */
	.zg__item:first-child,
	.zg__item:last-child:nth-child(even) {
		grid-column: 1 / -1;
	}
	.zg__item:first-child .zg__frame {
		aspect-ratio: 16 / 9;
	}
	@media (min-width: 48rem) {
		.zg__item {
			grid-column: span 2;
		}
		.zg__item:first-child .zg__frame {
			aspect-ratio: 21 / 9;
		}
		/* Rows of two where three would leave a gap: 3 and 5 frames, and the tail of 6. */
		.zg[data-count='2'] .zg__item,
		.zg[data-count='3'] .zg__item:not(:first-child),
		.zg[data-count='5'] .zg__item:not(:first-child),
		.zg[data-count='6'] .zg__item:nth-child(n + 5) {
			grid-column: span 3;
		}
		.zg__item:first-child {
			grid-column: 1 / -1;
		}
	}

	/* ---------- zoom: sticky stage, frames scaled from the centre ---------- */
	.zg[data-mode='zoom'] {
		height: var(--zg-length);
		padding: 0;
	}
	.zg[data-mode='zoom'] .zg__stage {
		position: sticky;
		top: 0;
		display: block;
		height: 100svh;
		overflow: hidden;
	}
	.zg[data-mode='zoom'] .zg__item {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		transform-origin: 50% 50%;
	}
	.zg[data-mode='zoom']:global([data-active]) .zg__item {
		will-change: transform;
	}
	.zg[data-mode='zoom'] .zg__frame {
		position: relative;
		top: var(--y);
		left: var(--x);
		width: var(--w);
		height: var(--h);
		aspect-ratio: auto;
	}
</style>
