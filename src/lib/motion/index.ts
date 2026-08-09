/**
 * Ustay's motion layer (UST-45) — Lenis + GSAP, wrapped as Svelte attachments.
 *
 * "The easing is the brand" (DESIGN.md). Motion here is a first-class brand
 * element, not decoration: slow, eased, weighted, never snappy or bouncy. The UI
 * primitives in `$lib/components` are deliberately static; these utilities
 * animate them **from the outside**, so a page never hand-rolls GSAP again.
 *
 * ## The surface
 *
 * | Utility            | What it is                                                     |
 * | ------------------ | -------------------------------------------------------------- |
 * | `smoothScroll()`   | Lenis momentum + ScrollTrigger wiring. Attach once, in a layout. |
 * | `scrollTo()`       | Anchor scrolling through the smooth scroller, with a fallback.  |
 * | `refreshMotion()`  | Re-measure after client navigation. Call from `afterNavigate`.  |
 * | `tonalScroll()`    | The signature dark→light dissolve, and the tone flip with it.   |
 * | `pageTone`         | Which tone the viewport is over — what the nav reads.           |
 * | `reveal()`         | Editorial rise-and-fade as content enters.                      |
 * | `displayEntrance()`| Oversized-serif lines rising out from behind their masks.        |
 * | `imageReveal()`    | Clip wipe + scale settle on a photograph.                       |
 * | `parallax()`       | Scrubbed drift (and optional Ken-Burns) on framed media.        |
 * | `reducedMotion`    | Reactive `prefers-reduced-motion`, for markup that must differ. |
 *
 * ## Usage
 *
 * Attachments, so they compose onto primitives and plain elements alike, and
 * clean themselves up when the element leaves the DOM:
 *
 * ```svelte
 * <script lang="ts">
 *   import { Heading, Image, Section, Text } from '$lib';
 *   import { displayEntrance, imageReveal, reveal, smoothScroll, tonalScroll } from '$lib/motion';
 * </script>
 *
 * <div data-tonal-backdrop class="fixed inset-0 -z-10 bg-ink"></div>
 *
 * <div {@attach smoothScroll()}>
 *   <Section tone="inherit">
 *     <Heading size="xl" {@attach displayEntrance()}>
 *       <span class="block"><span class="block">Every stay</span></span>
 *     </Heading>
 *   </Section>
 *
 *   <Section tone="inherit" {@attach tonalScroll()}>
 *     <Text {@attach reveal()}>…</Text>
 *     <Image src="…" alt="…" {@attach imageReveal()} />
 *   </Section>
 * </div>
 * ```
 *
 * ## Two rules this layer keeps for you
 *
 * - **Reduced motion.** Every utility is gated on `prefers-reduced-motion` in one
 *   place, and the gate is live — flipping the OS setting tears the motion down
 *   or builds it back without a reload. Suppressed means *no* motion and *no*
 *   scroll hijack, with all content in its natural, visible state. The single
 *   exception is `tonalScroll`, which still swaps the tone (discretely, no
 *   dissolve) because a nav in the wrong colour is a legibility bug, not motion.
 * - **Client-only.** `gsap` and `lenis` are loaded through dynamic `import()`
 *   inside the attachments, so importing `$lib/motion` from a module that renders
 *   on the server pulls in no animation code and cannot crash
 *   (`docs/ARCHITECTURE.md` → "Motion is client-only").
 *
 * Defaults live in `./config.ts` (`motionDefaults`) — tune the motion language
 * there rather than passing the same options at every call site.
 *
 * Deliberately **not** re-exported from `$lib/index.ts`: that barrel is the
 * static primitives. Import from `$lib/motion`.
 *
 * See `/motion` for the live demo of every utility on real primitives.
 */

export { motionDefaults, EDITORIAL_EASE, REDUCED_MOTION_QUERY } from './config';
export { prefersReducedMotion } from './internal';
export type { MotionApi } from './internal';
export { reducedMotion } from './reduced-motion.svelte';

export { smoothScroll, scrollTo, getSmoothScroller } from './smooth-scroll';
export type { SmoothScrollOptions, ScrollToOptions } from './smooth-scroll';

export { refreshMotion } from './router';
export type { RefreshMotionOptions } from './router';

export { tonalScroll } from './tonal-scroll';
export type { TonalScrollOptions } from './tonal-scroll';

export { pageTone } from './tone.svelte';
export type { Tone } from './tone.svelte';

export { reveal, displayEntrance } from './reveal';
export type { RevealOptions, DisplayEntranceOptions } from './reveal';

export { imageReveal, parallax } from './media';
export type { ImageRevealOptions, ParallaxOptions } from './media';
