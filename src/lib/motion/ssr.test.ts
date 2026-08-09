import { describe, expect, it } from 'vitest';
import * as motion from './index';

// `gsap` and `lenis` touch `window`, and the Cloudflare worker has a size budget,
// so the motion layer must be importable from a module that renders on the server
// without pulling either of them in (docs/ARCHITECTURE.md → "Motion is
// client-only"). This suite runs in the `server` (node) project, where there is no
// DOM at all — if any of it needed one, these would throw.

describe('$lib/motion on the server', () => {
	it('imports without a DOM and still exposes the whole surface', () => {
		expect(Object.keys(motion).sort()).toEqual([
			'EDITORIAL_EASE',
			'REDUCED_MOTION_QUERY',
			'displayEntrance',
			'getSmoothScroller',
			'imageReveal',
			'motionDefaults',
			'pageTone',
			'parallax',
			'prefersReducedMotion',
			'reducedMotion',
			'refreshMotion',
			'reveal',
			'scrollTo',
			'smoothScroll',
			'tonalScroll'
		]);
	});

	it('reports reduced motion, so the no-motion branch is what renders', () => {
		expect(motion.prefersReducedMotion()).toBe(true);
		expect(motion.reducedMotion.current).toBe(true);
	});

	it('builds attachments that are inert instead of reaching for the DOM', () => {
		const element = {} as Element;

		// An attachment never runs on the server, but building one must not explode
		// either — and if it somehow is invoked, it does nothing to the element.
		for (const attachment of [
			motion.reveal(),
			motion.displayEntrance(),
			motion.imageReveal(),
			motion.parallax(),
			motion.tonalScroll(),
			motion.smoothScroll()
		]) {
			expect(attachment(element)).toBeTypeOf('function');
		}

		expect(Object.keys(element)).toEqual([]);
	});

	it('no-ops on scrollTo rather than reaching for `window`', () => {
		expect(motion.scrollTo('#stays')).toBeUndefined();
		expect(motion.getSmoothScroller()).toBeUndefined();
	});

	it('no-ops on refreshMotion, which a layout may call before hydration', () => {
		expect(motion.refreshMotion()).toBeUndefined();
	});

	it('opens on the dark tone', () => {
		expect(motion.pageTone.current).toBe('dark');
	});
});
