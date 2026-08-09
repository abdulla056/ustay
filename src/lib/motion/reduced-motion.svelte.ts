import { MediaQuery } from 'svelte/reactivity';
import { REDUCED_MOTION_QUERY } from './config';

/**
 * Reactive `prefers-reduced-motion`.
 *
 * The utilities already gate themselves, so reach for this only when reduced
 * motion means rendering something *different* rather than skipping an
 * animation — a static gallery in place of a scroll-driven one, say, which is
 * how the prototype degraded its zoom-parallax.
 *
 * ```svelte
 * {#if reducedMotion.current}
 *   <Grid cols={3}>…static frames…</Grid>
 * {:else}
 *   <ZoomGallery />
 * {/if}
 * ```
 *
 * Falls back to `true` on the server: no motion is the safe first render. That
 * does mean the value can change on hydration, so prefer a CSS `motion-reduce:`
 * variant whenever CSS alone can express the difference.
 */
export const reducedMotion = new MediaQuery(REDUCED_MOTION_QUERY, true);
