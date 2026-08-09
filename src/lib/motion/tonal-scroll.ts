/**
 * The signature move: the dark cinematic hero tonally dissolving into the light
 * editorial sections as you scroll (DESIGN.md → "Signature elements").
 *
 * The page never picks a tone; it moves between them. Mechanically that is one
 * fixed backdrop element whose background colour is scrubbed from `ink` to
 * `paper` across the arrival of the first light section — plus a discrete tone
 * flip published to `pageTone` so the nav can change colour with it.
 */
import type { Attachment } from 'svelte/attachments';
import { motionDefaults } from './config';
import { cssVar, motionAttachment, warn } from './internal';
import { pageTone, type Tone } from './tone.svelte';

export type TonalScrollOptions = {
	/**
	 * The painted element — a fixed, full-bleed layer behind the content. Defaults
	 * to the first `[data-tonal-backdrop]` in the document:
	 *
	 * ```svelte
	 * <div data-tonal-backdrop class="fixed inset-0 -z-10 bg-ink"></div>
	 * ```
	 */
	backdrop?: HTMLElement | string;
	/** Colour to dissolve from. Defaults to the `--color-ink` token. */
	from?: string;
	/** Colour to dissolve to. Defaults to the `--color-paper` token. */
	to?: string;
	/** ScrollTrigger start of the dissolve. Default `'top 85%'`. */
	start?: string;
	/** ScrollTrigger end of the dissolve. Default `'top 35%'`. */
	end?: string;
	/** Where inside the dissolve the tone flips. Default `'top 60%'`. */
	flipAt?: string;
	/** Notified on every flip. `pageTone` is updated either way. */
	onTone?: (tone: Tone) => void;
};

/**
 * Attach to the **first light section** — the element whose arrival is the
 * transition:
 *
 * ```svelte
 * <Section tone="inherit" {@attach tonalScroll()}>…</Section>
 * ```
 *
 * Reduced motion keeps the tone *change* (a colour swap is not motion, and
 * without it the nav would be unreadable over the wrong background) but drops
 * the scrub: the backdrop switches at the threshold instead of dissolving.
 */
export function tonalScroll(options: TonalScrollOptions = {}): Attachment<Element> {
	const { start, end, flipAt } = { ...motionDefaults.tonalScroll, ...options };

	return motionAttachment(
		(element, { gsap, ScrollTrigger }, reduced) => {
			const backdrop = resolveBackdrop(options.backdrop);
			const from = options.from ?? cssVar('--color-ink');
			const to = options.to ?? cssVar('--color-paper');

			if (backdrop && !reduced) {
				gsap.fromTo(
					backdrop,
					{ backgroundColor: from },
					{
						backgroundColor: to,
						ease: motionDefaults.easeScrub,
						scrollTrigger: { trigger: element, start, end, scrub: true }
					}
				);
			}

			const setTone = (tone: Tone) => {
				pageTone.current = tone;
				options.onTone?.(tone);
				// No dissolve to carry the colour, so the backdrop follows the tone.
				if (backdrop && reduced) {
					gsap.set(backdrop, { backgroundColor: tone === 'light' ? to : from });
				}
			};

			ScrollTrigger.create({
				trigger: element,
				start: flipAt,
				onEnter: () => setTone('light'),
				onLeaveBack: () => setTone('dark'),
				// A reload halfway down the page never crosses the threshold, so the
				// tone is also settled from the current scroll position on every refresh.
				onRefresh: (self) => setTone(self.scroll() >= self.start ? 'light' : 'dark')
			});
		},
		{ always: true }
	);
}

function resolveBackdrop(backdrop: TonalScrollOptions['backdrop']): HTMLElement | null {
	if (backdrop && typeof backdrop !== 'string') return backdrop;

	const selector = backdrop ?? '[data-tonal-backdrop]';
	const element = document.querySelector<HTMLElement>(selector);
	if (!element) {
		warn(`tonalScroll found no backdrop matching "${selector}" — only the tone will flip.`);
	}
	return element;
}
