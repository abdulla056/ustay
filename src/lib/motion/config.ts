/**
 * The numbers behind "the easing is the brand" (DESIGN.md).
 *
 * Every utility in `$lib/motion` reads its defaults from here, so the motion
 * language is tuned in one place rather than per page. The values are the ones
 * validated in the art-direction prototype (`src/routes/prototype/`) — slow,
 * weighted, unhurried. Nothing here is snappy or bouncy on purpose.
 */

/** The media query the whole layer gates on. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Name of the GSAP `CustomEase` registered from the `--ease-editorial` token, so
 * a CSS transition and a GSAP tween ride the exact same curve. Prefer
 * `motionDefaults.ease` over hard-coding this.
 */
export const EDITORIAL_EASE = 'editorial';

/** Used if `CustomEase` can't be registered — the nearest built-in curve. */
export const FALLBACK_EASE = 'power3.out';

export const motionDefaults = {
	/** The brand curve: `--ease-editorial`, i.e. `cubic-bezier(0.16, 1, 0.3, 1)`. */
	ease: EDITORIAL_EASE,
	/** Gentler curve for secondary copy trailing a display line. */
	easeSoft: 'power2.out',
	/** Scrub-driven motion must be linear — the scroll position is the timeline. */
	easeScrub: 'none',

	/** Lenis momentum: heavy lerp, slightly damped wheel. This is the "calm heaviness". */
	lenis: { lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1 },

	/** Editorial entrance for a block of content. */
	reveal: { y: 40, duration: 1.1, delay: 0, stagger: 0, start: 'top 82%' },

	/** Display-type line rise (the hero headline). */
	displayEntrance: {
		yPercent: 115,
		duration: 1.15,
		stagger: 0.12,
		delay: 0.15,
		start: 'top 80%'
	},

	/** Cinematic media reveal: a clip wipe with a scale settle. */
	imageReveal: { scale: 1.12, duration: 1.4, delay: 0, start: 'top 85%' },

	/** Layered depth on photography, in `yPercent` across the scroll range. */
	parallax: { y: [-8, 8], start: 'top bottom', end: 'bottom top' },

	/** The signature dark→light dissolve, and where the nav flips inside it. */
	tonalScroll: { start: 'top 85%', end: 'top 35%', flipAt: 'top 60%' }
} as const;
