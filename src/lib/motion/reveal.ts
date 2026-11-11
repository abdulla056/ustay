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
	editorialEase,
	fontsReady,
	isInViewport,
	loadSplitText,
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
	/**
	 * ScrollTrigger start. Default `'top 82%'` — just before it is fully in
	 * view. Only applies to elements that are still below the fold when they
	 * mount; anything already in the initial viewport plays immediately
	 * instead of waiting on a scroll that may never bring it further into view.
	 */
	start?: string;
};

/**
 * Rise-and-fade as it enters the viewport — or immediately on mount, if it's
 * already there (below-the-fold content still waits for the scroll threshold).
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
					...(isInViewport(element)
						? null
						: { scrollTrigger: { trigger: element, start, once: true } })
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
	/** How far below its mask each line starts, in % of its own height. Default `115`. */
	yPercent?: number;
	duration?: number;
	stagger?: number;
	delay?: number;
	ease?: string;
	/**
	 * Play on scroll-in rather than on mount. Use for display type below the
	 * fold — though if it turns out to already be in the initial viewport
	 * anyway, it still plays immediately rather than waiting on a scroll.
	 */
	onScroll?: boolean;
	/** ScrollTrigger start, when `onScroll`. Default `'top 80%'`. */
	start?: string;
};

/**
 * The oversized-serif entrance: each line rises out from behind its own mask, in
 * sequence. This is the hero's load moment, so by default it plays immediately
 * on mount — pass `onScroll` for display type further down the page.
 *
 * Write the heading as plain text; the lines are found for you, at whatever
 * width the heading actually renders:
 *
 * ```svelte
 * <Heading size="xl" {@attach displayEntrance()}>Every stay has a <em>story.</em></Heading>
 * ```
 *
 * An art-directed break is just a `<br />` (`Every stay<br />has a <em>story.</em>`);
 * narrower viewports still wrap within each side of it.
 *
 * How it stays honest:
 *
 * - **Split late, measured right.** GSAP's `SplitText` breaks the text into
 *   masked lines only once web fonts have settled (the serif breaks lines
 *   differently from its fallback), and only at the moment the entrance plays —
 *   for `onScroll`, when it scrolls in, so the lines match the width at that
 *   moment. A resize mid-entrance re-splits (`autoSplit`) without restarting it.
 * - **Gone once it lands.** When the lines have risen, the split is reverted and
 *   the heading's own DOM is put back: it re-wraps naturally from then on, no
 *   mask clips an italic descender, and Svelte keeps updating the nodes it
 *   rendered. (The split works on a copy of them in the meantime.)
 * - **Same accessible name.** While split, the heading carries an `aria-label`
 *   of its original text and the line wrappers are `aria-hidden`.
 * - **Nothing to undo without motion.** The server renders the plain text; with
 *   no JS or reduced motion nothing is split or hidden at all. Until the split
 *   is ready the heading is only faded (never dropped from the accessibility
 *   tree), and a GSAP or plugin load failure fades it straight back.
 *
 * Hand-split markup (one block child per line) still works: each block child
 * simply becomes a line of the split.
 */
export function displayEntrance(options: DisplayEntranceOptions = {}): Attachment<Element> {
	const { yPercent, duration, stagger, delay, start } = {
		...motionDefaults.displayEntrance,
		...options
	};

	return motionAttachment(
		(element, { gsap, ScrollTrigger }, _reduced, SplitText) => {
			/** Splits and plays; returns the restore of the authored DOM. */
			const play = () => {
				// Svelte's own nodes are set aside untouched and SplitText cuts up a
				// copy, so the split's `innerHTML` revert never orphans the nodes
				// Svelte still holds references to.
				const authored = [...element.childNodes];
				const label = accessibleText(element);
				element.replaceChildren(...authored.map((node) => node.cloneNode(true)));

				let restored = false;
				const restore = () => {
					if (restored) return;
					restored = true;
					split.revert();
					element.replaceChildren(...authored);
				};

				const split = SplitText.create(element, {
					type: 'lines',
					mask: 'lines',
					tag: 'span',
					linesClass: 'display-line',
					aria: 'auto',
					autoSplit: true,
					// Returned, so a re-split on resize carries the progress over
					// instead of replaying from the top.
					onSplit: (self) => {
						// `aria: 'auto'` names the heading from `textContent`, which runs
						// words together across a `<br>` and overrides an authored label.
						element.setAttribute('aria-label', label);
						// `span`s keep the heading's content valid phrasing content, but
						// SplitText only styles its `div`s: a transform and a clip both
						// need a block box.
						for (const box of [...self.masks, ...self.lines]) {
							(box as HTMLElement).style.display = 'block';
						}
						return gsap.fromTo(
							self.lines,
							{ yPercent },
							{
								yPercent: 0,
								duration,
								stagger,
								delay,
								ease: options.ease ?? editorialEase(),
								onComplete: restore
							}
						);
					}
				});

				// The masks hide the lines now (`fromTo` rendered them at their start),
				// so the pre-split fade can come off.
				if (element instanceof HTMLElement) element.style.removeProperty('opacity');
				return restore;
			};

			if (options.onScroll && !isInViewport(element)) {
				// A nested context, so a split made on scroll-in is still reverted
				// with everything else on teardown.
				const later = gsap.context(() => {});
				ScrollTrigger.create({
					trigger: element,
					start,
					once: true,
					onEnter: () => later.add(play)
				});
				return;
			}

			return play();
		},
		{
			prepare: async () => {
				const [SplitText] = await Promise.all([loadSplitText(), fontsReady()]);
				return SplitText;
			},
			// Faded, not hidden: the heading stays in the accessibility tree while
			// GSAP, SplitText and the fonts arrive.
			prime: (element) => primeStyles([element], { opacity: '0' })
		}
	);
}

/**
 * The name a heading should keep while it is split: an authored `aria-label`,
 * or its text as rendered — `innerText`, so a `<br>` reads as a space.
 */
function accessibleText(element: Element): string {
	const authored = element.getAttribute('aria-label');
	if (authored) return authored;
	const text = element instanceof HTMLElement ? element.innerText : element.textContent;
	return (text ?? '').replace(/\s+/g, ' ').trim();
}
