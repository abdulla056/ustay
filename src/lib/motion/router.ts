/**
 * Keeping the motion layer honest across client-side navigation (UST-51).
 *
 * `smoothScroll()` is attached once, in a layout, and that layout **survives**
 * navigation while the page inside it is replaced. So the attachment's own
 * mount-time `ScrollTrigger.refresh()` runs exactly once, and every trigger the
 * new page creates is measured against a document whose height and offsets were
 * cached for the old one. Symptom: reveals that fire at the wrong place, or a
 * tonal dissolve that never reaches its end.
 *
 * Lenis has the mirror-image problem. SvelteKit resets the native scroll position
 * on navigation, but Lenis keeps its own eased `animatedScroll` — so the next
 * wheel event eases back towards where the *previous* page was.
 *
 * Both are one call from a layout's `afterNavigate`.
 */
import { browser } from '$app/environment';
import { loadedMotion } from './internal';
import { getSmoothScroller } from './smooth-scroll';

export type RefreshMotionOptions = {
	/**
	 * Where to put the scroller. `0` (the default) starts the new page at the top,
	 * the way a browser navigation would; `false` leaves the position alone, which
	 * is what a hash link or a restored history entry wants.
	 */
	scrollTo?: number | false;
};

/**
 * Re-measure every ScrollTrigger and re-seat the smooth scroller, after the DOM
 * they were describing has been swapped out:
 *
 * ```svelte
 * <script lang="ts">
 *   import { afterNavigate } from '$app/navigation';
 *   import { refreshMotion, smoothScroll } from '$lib/motion';
 *
 *   afterNavigate(({ from, to }) => {
 *     const changedPage = from?.url.pathname !== to?.url.pathname;
 *     refreshMotion({ scrollTo: changedPage && !to?.url.hash ? 0 : false });
 *   });
 * </script>
 * ```
 *
 * A no-op when there is nothing to refresh — on the server, under reduced motion,
 * and on any page that never mounted the layer — so it never becomes the reason
 * GSAP gets downloaded.
 */
export function refreshMotion(options: RefreshMotionOptions = {}): void {
	if (!browser) return;

	const { scrollTo = 0 } = options;

	if (scrollTo !== false) {
		// `force` because the scroller may be stopped mid-navigation, and `immediate`
		// because this is a page change, not a movement the visitor should watch.
		getSmoothScroller()?.scrollTo(scrollTo, { immediate: true, force: true });
	}

	// Order matters: measure after the scroll position has been re-seated, or every
	// trigger records its progress against the position we are about to leave.
	loadedMotion()?.ScrollTrigger.refresh();
}
