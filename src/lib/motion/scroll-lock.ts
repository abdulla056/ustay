import { getSmoothScroller } from './smooth-scroll';

type LenisInstance = NonNullable<ReturnType<typeof getSmoothScroller>>;

let holders = 0;
let restore: (() => void) | undefined;

/**
 * Lock page scroll: stop Lenis (if it is running) and clip the root. Ref-counted, so
 * overlapping locks (a menu and a dialog) share one lock; the page unlocks only when the
 * last holder releases. Returns an idempotent release function.
 *
 * ```ts
 * const release = lockScroll();
 * // …later
 * release();
 * ```
 */
export function lockScroll(): () => void {
	if (typeof document === 'undefined') return () => {};

	if (holders === 0) {
		const root = document.documentElement;
		const previous = root.style.overflow;
		const lenis: LenisInstance | undefined = getSmoothScroller();
		lenis?.stop();
		root.style.overflow = 'hidden';
		restore = () => {
			root.style.overflow = previous;
			lenis?.start();
		};
	}
	holders += 1;

	let released = false;
	return () => {
		if (released) return;
		released = true;
		holders -= 1;
		if (holders === 0) {
			restore?.();
			restore = undefined;
		}
	};
}
