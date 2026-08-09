/**
 * Which tonal scope the viewport is currently sitting over.
 *
 * DESIGN.md's signature move is the dark→light dissolve on scroll, and its
 * consequence is layout principle #4: "Nav flips light→ink as the background
 * shifts". Rather than have the nav observe the scroll itself, `tonalScroll`
 * publishes the tone here and the nav just reads it — one source of truth, so
 * the flip can never drift out of step with the dissolve.
 *
 * ```svelte
 * <script>
 *   import { pageTone } from '$lib/motion';
 * </script>
 *
 * <nav class={pageTone.current === 'light' ? 'text-content' : 'text-on-dark'}>…</nav>
 * ```
 *
 * Client-only presentational state: nothing mutates it during SSR, so the
 * module-level singleton can't leak between requests. It starts at `dark`
 * because every Ustay page opens on the cinematic hero.
 */

export type Tone = 'dark' | 'light';

class PageTone {
	/** `dark` over the cinematic hero, `light` once the paper sections arrive. */
	current = $state<Tone>('dark');
}

export const pageTone = new PageTone();
