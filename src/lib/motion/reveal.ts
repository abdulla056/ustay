/**
 * Entrances for type and content — the "editorial reveals" and the hero
 * headline's line rise, extracted from the prototype.
 *
 * Both play **once**. DESIGN.md asks for "big orchestrated moments over
 * scattered micro-animations", and content that re-animates every time it
 * re-enters reads as decoration rather than choreography.
 */
import type { Attachment } from 'svelte/attachments';
import { motionDefaults } from './config';
import {
	composeCleanup,
	editorialEase,
	motionAttachment,
	primeStyles,
	resolveTargets
} from './internal';

export type RevealOptions = {
	/** Pixels the content rises from. Default `40`. */
	y?: number;
	/** Seconds. Default `1.1` — slow on purpose. */
	duration?: number;
	/** GSAP ease. Defaults to the `--ease-editorial` curve. */
	ease?: string;
	/** Seconds before it starts. */
	delay?: number;
	/** Seconds between targets. Only meaningful with `select`. */
	stagger?: number;
	/** Animate the descendants matching this selector instead of the element. */
	select?: string;
	/** ScrollTrigger start. Default `'top 82%'` — just before it is fully in view. */
	start?: string;
};

/**
 * Rise-and-fade as it enters the viewport.
 *
 * ```svelte
 * <Heading {@attach reveal()}>A listing shows you a room.</Heading>
 * <Stack {@attach reveal({ select: ':scope > *', stagger: 0.1 })}>…</Stack>
 * ```
 */
export function reveal(options: RevealOptions = {}): Attachment<Element> {
	const { y, duration, delay, stagger, start } = { ...motionDefaults.reveal, ...options };
	const { select } = options;

	return motionAttachment(
		(element, { gsap }) => {
			gsap.fromTo(
				resolveTargets(element, select),
				{ y, opacity: 0 },
				{
					y: 0,
					opacity: 1,
					duration,
					delay,
					stagger,
					ease: options.ease ?? editorialEase(),
					clearProps: 'opacity,transform',
					scrollTrigger: { trigger: element, start, once: true }
				}
			);
		},
		{
			prime: (element) =>
				primeStyles(resolveTargets(element, select), {
					opacity: '0',
					transform: `translateY(${y}px)`
				})
		}
	);
}

export type DisplayEntranceOptions = {
	/**
	 * The line elements. Default: the element's direct children. Each is treated
	 * as a mask and its single child is what rises, so the markup contract is:
	 *
	 * ```svelte
	 * <Heading size="xl" {@attach displayEntrance()}>
	 *   <span class="block"><span class="block">Every stay</span></span>
	 *   <span class="block"><span class="block">has a <em>story.</em></span></span>
	 * </Heading>
	 * ```
	 *
	 * A line with no child element still animates — it just rises unmasked.
	 */
	select?: string;
	/** How far below its mask each line starts, in % of its own height. Default `115`. */
	yPercent?: number;
	duration?: number;
	stagger?: number;
	delay?: number;
	ease?: string;
	/** Play on scroll-in rather than on mount. Use for display type below the fold. */
	onScroll?: boolean;
	/** ScrollTrigger start, when `onScroll`. Default `'top 80%'`. */
	start?: string;
};

/**
 * The oversized-serif entrance: each line rises out from behind its own mask, in
 * sequence. This is the hero's load moment, so by default it plays immediately
 * on mount — pass `onScroll` for display type further down the page.
 *
 * The masks are applied by this utility, not by the markup, so with no JS or
 * reduced motion the headline is simply *there*, unclipped.
 */
export function displayEntrance(options: DisplayEntranceOptions = {}): Attachment<Element> {
	const { yPercent, duration, stagger, delay, start } = {
		...motionDefaults.displayEntrance,
		...options
	};
	const select = options.select ?? ':scope > *';

	/** Each direct child masks the element that actually moves. */
	const lines = (element: Element) =>
		resolveTargets(element, select).map((mask) => ({ mask, line: mask.firstElementChild ?? mask }));

	return motionAttachment(
		(element, { gsap }) => {
			const pairs = lines(element);
			const masks = pairs.filter(({ mask, line }) => mask !== line).map(({ mask }) => mask);

			gsap.fromTo(
				pairs.map(({ line }) => line),
				{ yPercent },
				{
					yPercent: 0,
					duration,
					stagger,
					delay,
					ease: options.ease ?? editorialEase(),
					clearProps: 'transform',
					// Released once the lines have landed: a permanent `overflow: hidden`
					// on a 0.92 line-height display line would clip italic descenders.
					onComplete: () => {
						for (const mask of masks) {
							if (mask instanceof HTMLElement) mask.style.removeProperty('overflow');
						}
					},
					...(options.onScroll ? { scrollTrigger: { trigger: element, start, once: true } } : null)
				}
			);
		},
		{
			prime: (element) => {
				const pairs = lines(element);
				return composeCleanup(
					primeStyles(
						pairs.filter(({ mask, line }) => mask !== line).map(({ mask }) => mask),
						{ overflow: 'hidden' }
					),
					primeStyles(
						pairs.map(({ line }) => line),
						{ transform: `translateY(${yPercent}%)` }
					)
				);
			}
		}
	);
}
