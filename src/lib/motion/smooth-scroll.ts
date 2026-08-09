/**
 * Smooth momentum scrolling — the single biggest contributor to the feel.
 *
 * DESIGN.md: "Smooth momentum scrolling (Lenis) sets the overall feel more than
 * any single effect." Everything else in this module rides on top of it, because
 * Lenis drives `ScrollTrigger.update` from GSAP's ticker, which keeps scrubbed
 * animations locked to the eased scroll position instead of the native one.
 */
import { browser } from '$app/environment';
import type { Attachment } from 'svelte/attachments';
import { motionDefaults } from './config';
import { loadMotion, motionGate, prefersReducedMotion } from './internal';

type LenisInstance = InstanceType<typeof import('lenis').default>;

/** The live instance, if a page has `smoothScroll` mounted and motion is allowed. */
let active: LenisInstance | undefined;

export type SmoothScrollOptions = {
	/** Momentum weight, 0–1. Lower is heavier. Default `0.085`. */
	lerp?: number;
	/** Wheel damping. Default `0.9`. */
	wheelMultiplier?: number;
	/** Touch damping. Default `1` (native-feeling on touch). */
	touchMultiplier?: number;
};

/**
 * Attach once, high up — the `(platform)` or `(microsite)` layout root:
 *
 * ```svelte
 * <div {@attach smoothScroll()}>{@render children()}</div>
 * ```
 *
 * Under `prefers-reduced-motion` no Lenis instance is created at all, so the
 * browser's own scrolling is untouched — no hijack, which is the one thing a
 * smooth-scroll library must never do to someone who asked for less motion.
 */
export function smoothScroll(options: SmoothScrollOptions = {}): Attachment<Element> {
	const { lerp, wheelMultiplier, touchMultiplier } = { ...motionDefaults.lenis, ...options };

	// The element is irrelevant — Lenis owns the document scroller. It is an
	// attachment purely so a layout gets the lifecycle for free.
	return () =>
		motionGate(() => {
			let cancelled = false;
			let stop: (() => void) | undefined;

			void Promise.all([loadMotion(), import('lenis')]).then(
				([{ gsap, ScrollTrigger }, { default: Lenis }]) => {
					if (cancelled) return;

					const root = document.documentElement;
					const previousScrollBehavior = root.style.scrollBehavior;
					// CSS smooth scrolling and Lenis fight over the scroll position.
					root.style.scrollBehavior = 'auto';

					const lenis = new Lenis({ lerp, wheelMultiplier, touchMultiplier });
					active = lenis;

					lenis.on('scroll', ScrollTrigger.update);
					const tick = (time: number) => lenis.raf(time * 1000);
					gsap.ticker.add(tick);
					// GSAP's lag smoothing would fight the momentum on a slow frame.
					gsap.ticker.lagSmoothing(0);
					ScrollTrigger.refresh();

					stop = () => {
						gsap.ticker.remove(tick);
						gsap.ticker.lagSmoothing(500, 33); // GSAP's default
						lenis.destroy();
						if (active === lenis) active = undefined;
						root.style.scrollBehavior = previousScrollBehavior;
						ScrollTrigger.refresh();
					};
				}
			);

			return () => {
				cancelled = true;
				stop?.();
				stop = undefined;
			};
		});
}

export type ScrollToOptions = {
	/** Pixel offset from the target, e.g. `-96` to clear a fixed nav. */
	offset?: number;
	/** Seconds. Defaults to Lenis's own eased duration. */
	duration?: number;
	/** Jump instead of animating. Defaults to the visitor's motion preference. */
	immediate?: boolean;
};

/**
 * Scroll to an anchor through the smooth scroller when there is one, and through
 * the browser when there isn't (reduced motion, or a page without
 * `smoothScroll`). Anchor navigation in the nav should go through this rather
 * than a bare `#id` href, otherwise the jump fights the momentum.
 */
export function scrollTo(
	target: string | number | HTMLElement,
	options: ScrollToOptions = {}
): void {
	if (!browser) return;

	const { offset = 0, duration } = options;
	const immediate = options.immediate ?? prefersReducedMotion();

	if (active) {
		active.scrollTo(target, { offset, duration, immediate });
		return;
	}

	const behavior = immediate ? 'auto' : 'smooth';

	if (typeof target === 'number') {
		window.scrollTo({ top: target + offset, behavior });
		return;
	}

	const element = typeof target === 'string' ? document.querySelector(target) : target;
	if (!element) return;

	window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY + offset, behavior });
}

/** The live Lenis instance, or `undefined` when scrolling is native. Escape hatch. */
export function getSmoothScroller(): LenisInstance | undefined {
	return active;
}
