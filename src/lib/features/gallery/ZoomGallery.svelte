<script lang="ts">
	// The sticky zoom-out gallery (UST-52). One hero frame fills the viewport and,
	// as you scroll, zooms out to reveal a composed mosaic.
	//
	// There is one set of <img> elements and two presentations of them. The
	// server (and reduced motion, and a failed GSAP load) renders a static
	// editorial grid — no sticky stage, no extra scroll length. Once mounted with
	// motion allowed, the same frames are laid onto a sticky stage and scaled by
	// a scrubbed ScrollTrigger. Transforms only; nothing animates layout.
	import { tick } from 'svelte';
	import type { Attachment } from 'svelte/attachments';
	import { Image } from '$lib';
	import { refreshMotion } from '$lib/motion';
	import { loadMotion, motionGate } from '$lib/motion/internal';
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

	// Whether the sticky zoom presentation is on. Only the attachment below turns
	// it on, so the server render, reduced motion, fewer than three frames and a
	// failed GSAP load are all the static grid by construction.
	let zoom = $state(false);

	// `motionGate` re-evaluates `prefers-reduced-motion` live, and each activation
	// retries the GSAP load, so one failure is not permanent.
	const zoomGallery: Attachment<HTMLElement> = (section) => {
		const layout = slots; // read here so a change in frame count re-runs this
		if (!layout) return;
		const scales = layout.map((slot) => slot.scale);

		return motionGate(() => {
			let cancelled = false;
			let context: { revert: () => void } | undefined;
			zoom = true;

			void (async () => {
				try {
					const [{ gsap }] = await Promise.all([loadMotion(), tick()]);
					if (cancelled) return;
					context = gsap.context(() => {
						// Scrubbed 1:1 to the scroll position. Lenis (where a page runs it)
						// already supplies the easing; adding scrub smoothing on top would
						// stack two lags, and without Lenis the native scroll is direct.
						const timeline = gsap.timeline({
							defaults: { ease: 'none' },
							scrollTrigger: {
								trigger: section,
								start: 'top top',
								end: 'bottom bottom',
								scrub: true,
								// `will-change` only while the zoom is actually running.
								onToggle: (self) => {
									if (self.isActive) section.dataset.active = '';
									else delete section.dataset.active;
								}
							}
						});
						// Queried here, not held in state: no stale entries past the frame count.
						section.querySelectorAll('.zg__item').forEach((el, i) => {
							if (i < scales.length) timeline.fromTo(el, { scale: 1 }, { scale: scales[i] }, 0);
						});
					}, section);

					// Swapping to the sticky stage grew this section by the scroll length, so
					// every trigger below it is now mis-measured — always re-measure.
					refreshMotion({ scrollTo: false });

					// Photographs that land later can shift things again.
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
				} catch (error) {
					console.error('[ZoomGallery] GSAP failed to load; showing the static grid', error);
					if (!cancelled) zoom = false;
				}
			})();

			return () => {
				cancelled = true;
				context?.revert(); // kills every ScrollTrigger it created
				delete section.dataset.active;
				zoom = false;
			};
		});
	};
</script>

<section
	{@attach zoomGallery}
	aria-label={label}
	data-zoom-gallery
	data-mode={zoom ? 'zoom' : 'static'}
	data-count={shown.length}
	style:--zg-length={scrollLength}
	class={['zg px-gutter py-section-sm', className]}
>
	<div class="zg__stage gap-grid-tight">
		{#each shown as frame, i (i)}
			<figure
				class="zg__item"
				style:--x="{slots?.[i].x ?? 0}vw"
				style:--y="{slots?.[i].y ?? 0}vh"
				style:--w="{slots?.[i].w ?? 0}vw"
				style:--h="{slots?.[i].h ?? 0}vh"
			>
				<div class="zg__frame">
					<!-- In zoom mode every frame is on the stage (scaled, clipped), so none may lazy-load mid-scroll. -->
					<Image
						src={frame.src}
						alt={frame.alt}
						ratio="auto"
						rounded={zoom ? 'none' : 'image'}
						loading={i === 0 || zoom ? 'eager' : 'lazy'}
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
	/* Section padding, gutter and gap come from the theme utilities on the elements. */
	.zg__stage {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
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
	.zg__item:first-child .zg__frame {
		aspect-ratio: 16 / 9;
	}
	/* Phone: two across, the lead frame full width, and an orphan on the last row too. */
	@media (max-width: 47.99rem) {
		.zg__item:first-child,
		.zg__item:last-child:nth-child(even) {
			grid-column: 1 / -1;
		}
	}
	/* Desktop: the lead frame is full width; the rest tile in rows of 2 or 3 with no holes. */
	@media (min-width: 48rem) {
		.zg__item {
			grid-column: span 2;
		}
		.zg__item:first-child {
			grid-column: 1 / -1;
		}
		.zg__item:first-child .zg__frame {
			aspect-ratio: 21 / 9;
		}
		/* 2 frames: the second is a full row. 3 and 5: the rest pair up. 6: the last two pair. */
		.zg[data-count='2'] .zg__item:not(:first-child) {
			grid-column: 1 / -1;
		}
		.zg[data-count='3'] .zg__item:not(:first-child),
		.zg[data-count='5'] .zg__item:not(:first-child),
		.zg[data-count='6'] .zg__item:nth-child(n + 5) {
			grid-column: span 3;
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
