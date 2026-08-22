/**
 * Motion for the photography — the layer DESIGN.md spends its boldness on
 * ("the photograph leads", "layered parallax", "scale-on-scroll for image
 * moments").
 *
 * Both utilities are written to be attached straight to `<Image>`: it spreads
 * its rest props onto the inner `<img>`, and attachments travel through a spread,
 * so `{@attach imageReveal()}` animates the image inside its own cropped,
 * overflow-hidden frame without the frame moving. That is the same handle
 * `imgClass` exposes for the CSS-only case.
 */
import type { Attachment } from 'svelte/attachments';
import { motionDefaults } from './config';
import { editorialEase, isInViewport, motionAttachment, primeStyles } from './internal';

export type ImageRevealOptions = {
	/** Scale the media starts at, settling to 1. Default `1.12`. */
	scale?: number;
	/** Seconds. Default `1.4`. */
	duration?: number;
	ease?: string;
	delay?: number;
	/**
	 * Direction the clip wipe travels. `up` (default) uncovers from the bottom
	 * edge upward; `down` from the top edge down; `none` scales only.
	 */
	wipe?: 'up' | 'down' | 'none';
	/**
	 * ScrollTrigger start. Default `'top 85%'`. Only applies to frames still
	 * below the fold when they mount — one already in the initial viewport
	 * reveals immediately.
	 */
	start?: string;
};

const WIPES = {
	up: 'inset(100% 0% 0% 0%)',
	down: 'inset(0% 0% 100% 0%)',
	none: undefined
} as const;

/**
 * The cinematic media reveal: a clip wipe with a slow scale settle, once, as the
 * frame enters.
 *
 * ```svelte
 * <Image src="/prototype/misty-lake.jpg" alt="Misty lake at dawn" {@attach imageReveal()} />
 * ```
 */
export function imageReveal(options: ImageRevealOptions = {}): Attachment<Element> {
	const { scale, duration, delay, start } = { ...motionDefaults.imageReveal, ...options };
	const clipFrom = WIPES[options.wipe ?? 'up'];

	return motionAttachment(
		(element, { gsap }) => {
			gsap.fromTo(
				element,
				{ scale, ...(clipFrom ? { clipPath: clipFrom } : null) },
				{
					scale: 1,
					...(clipFrom ? { clipPath: 'inset(0%)' } : null),
					duration,
					delay,
					ease: options.ease ?? editorialEase(),
					clearProps: 'transform,clipPath',
					...(isInViewport(element)
						? null
						: { scrollTrigger: { trigger: element, start, once: true } })
				}
			);
		},
		{
			prime: (element) =>
				primeStyles([element], {
					transform: `scale(${scale})`,
					...(clipFrom ? { 'clip-path': clipFrom } : null)
				})
		}
	);
}

export type ParallaxOptions = {
	/** `yPercent` travel across the scroll range, `[from, to]`. Default `[-8, 8]`. */
	y?: readonly [number, number];
	/** Scale drift across the same range — the hero's slow Ken-Burns. */
	scale?: readonly [number, number];
	/**
	 * What drives the range. Defaults to the element itself. A string resolves to
	 * the nearest matching **ancestor** (`'section'` is the common case), falling
	 * back to the first match in the document.
	 */
	trigger?: Element | string;
	/** Default `'top bottom'` — the moment the element enters from below. */
	start?: string;
	/** Default `'bottom top'` — the moment it has fully left above. */
	end?: string;
};

/**
 * Layered depth: the framed media drifts against its frame as the page moves,
 * scrubbed to the scroll position.
 *
 * ```svelte
 * <!-- a card's media drifting inside its crop -->
 * <Image src="…" alt="…" {@attach parallax()} />
 *
 * <!-- the hero photograph: Ken-Burns in, parallax out, driven by the hero -->
 * <Image
 *   src="…"
 *   alt="…"
 *   {@attach parallax({ y: [0, -12], scale: [1, 1.12], trigger: 'section', start: 'top top', end: 'bottom top' })}
 * />
 * ```
 *
 * Give the media room to move — a frame that crops it (`Image` does) and a
 * slightly oversized `imgClass` (e.g. `h-[120%]`) for larger `y` values.
 */
export function parallax(options: ParallaxOptions = {}): Attachment<Element> {
	const { start, end } = { ...motionDefaults.parallax, ...options };
	const [yFrom, yTo] = options.y ?? motionDefaults.parallax.y;
	const scale = options.scale;

	// No priming: the correct scrubbed value for an element already in view is
	// somewhere mid-range, so the start state would be wrong more often than not.
	// The settle when GSAP lands is a few percent, and only above the fold.
	return motionAttachment((element, { gsap }) => {
		gsap.set(element, { willChange: 'transform' });
		gsap.fromTo(
			element,
			{ yPercent: yFrom, ...(scale ? { scale: scale[0] } : null) },
			{
				yPercent: yTo,
				...(scale ? { scale: scale[1] } : null),
				ease: motionDefaults.easeScrub,
				scrollTrigger: {
					trigger: resolveTrigger(element, options.trigger),
					start,
					end,
					scrub: true
				}
			}
		);
	});
}

function resolveTrigger(element: Element, trigger?: Element | string): Element {
	if (!trigger) return element;
	if (typeof trigger !== 'string') return trigger;
	return element.closest(trigger) ?? document.querySelector(trigger) ?? element;
}
