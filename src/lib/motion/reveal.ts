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
	resolveTargets,
	type SplitTextStatic
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
 *   moment. A resize mid-entrance re-splits (`autoSplit`) without restarting it
 *   or its delay.
 * - **Gone once it lands.** When the lines have risen, the split is reverted and
 *   the heading's own DOM is put back: it re-wraps naturally from then on and no
 *   mask clips an italic descender.
 * - **Svelte's nodes are never split.** They wait in a detached holder while a
 *   copy is split, and go back as they are *now*. If Svelte touches them
 *   mid-entrance (a `{name}` update, an `{#if}` flip), the entrance stops there
 *   and the live content is shown at once rather than a stale copy.
 * - **Text only.** Only text and inline formatting (`em`, `strong`, `i`, `b`,
 *   `span`, `br`) is split. A heading holding a link, a button or anything else
 *   interactive keeps its real nodes and just fades in — a copy would lose its
 *   handlers and sit inside an `aria-hidden` line.
 * - **Same accessible name.** While split, the heading is labelled with its text
 *   as rendered (or its own `aria-label`), re-read on every re-split, and the
 *   line wrappers are `aria-hidden`.
 * - **Nothing to undo without motion.** The server renders the plain text; with
 *   no JS or reduced motion nothing is split or hidden at all. Until the split
 *   is ready the heading is only faded (never dropped from the accessibility
 *   tree), and a GSAP or plugin load failure fades it straight back.
 *
 * Hand-split markup (one block child per line) still works: each block child
 * simply becomes a line of the split.
 *
 * (UST-53 removed the old `select` option along with that hand-split contract.)
 */
export function displayEntrance(options: DisplayEntranceOptions = {}): Attachment<Element> {
	const { yPercent, duration, stagger, delay, start } = {
		...motionDefaults.displayEntrance,
		...options
	};
	const ease = () => options.ease ?? editorialEase();

	return motionAttachment(
		(element, { gsap, ScrollTrigger }, _reduced, SplitText) => {
			/** For content that can't be split: the same beat, as a fade. */
			const fade = () => {
				gsap.fromTo(
					element,
					{ opacity: 0 },
					{ opacity: 1, duration, delay, ease: ease(), clearProps: 'opacity' }
				);
			};

			/** Splits and plays; returns the teardown that hands Svelte's nodes back. */
			const split = () => {
				// Svelte's live nodes move to a detached holder — still parented, so
				// Svelte's own inserts keep landing somewhere we can watch — and
				// SplitText cuts up a copy.
				const holder = document.createElement('span');
				holder.append(...element.childNodes);
				element.append(...[...holder.childNodes].map((node) => node.cloneNode(true)));

				const authoredLabel = element.getAttribute('aria-label');
				const startedAt = gsap.ticker.time;
				// Assigned below, but read by `finish`, which can run before that.
				let instance: InstanceType<SplitTextStatic> | undefined = undefined;
				let finished = false;
				let landedEarly = false;

				const finish = () => {
					if (finished) return;
					// A tween that completes on creation (`duration: 0`) lands while
					// SplitText.create is still on the stack: finish right after it.
					if (!instance) {
						landedEarly = true;
						return;
					}
					finished = true;
					watcher.disconnect();
					instance.revert(); // also reverts the tween, if it is still running
					element.replaceChildren(...holder.childNodes);
				};

				// Svelte changed its content mid-entrance: stop, and show it as it is.
				const watcher = new MutationObserver(finish);
				watcher.observe(holder, {
					childList: true,
					subtree: true,
					characterData: true,
					attributes: true
				});

				instance = SplitText.create(element, {
					type: 'lines',
					mask: 'lines',
					tag: 'span',
					linesClass: 'display-line',
					// Handled below: `'auto'` names the heading from `textContent`, which
					// runs words together across a `<br>` and overrides an authored label.
					aria: 'none',
					autoSplit: true,
					// Runs again on every re-split (resize, late font). The tween is
					// returned so SplitText carries its progress over; the delay isn't
					// part of that progress, so only what's left of it is reapplied.
					onSplit: (self) => {
						// `span`s keep the heading valid phrasing content, but SplitText
						// only styles its `div`s: a transform and a clip need a block box.
						for (const box of [...self.masks, ...self.lines]) {
							(box as HTMLElement).style.display = 'block';
							box.setAttribute('aria-hidden', 'true');
						}
						element.setAttribute(
							'aria-label',
							authoredLabel ?? normaliseSpace((element as HTMLElement).innerText)
						);
						return gsap.fromTo(
							self.lines,
							{ yPercent },
							{
								yPercent: 0,
								duration,
								stagger,
								delay: Math.max(0, delay - (gsap.ticker.time - startedAt)),
								ease: ease(),
								onComplete: finish
							}
						);
					}
				});

				// The masks hide the lines now (`fromTo` rendered them at their start),
				// so the pre-split fade can come off.
				if (element instanceof HTMLElement) element.style.removeProperty('opacity');
				if (landedEarly) finish();
				return finish;
			};

			const play = () => (splittable(element) ? split() : fade());

			if (options.onScroll && !isInViewport(element)) {
				// A nested context, so whatever plays on scroll-in is still reverted
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

/** Inline formatting that is safe to copy: no behaviour, no semantics to lose. */
const SPLITTABLE = new Set(['EM', 'STRONG', 'I', 'B', 'SPAN', 'BR']);

/** Is this heading only text and inline formatting? */
function splittable(element: Element): boolean {
	return [...element.querySelectorAll('*')].every((child) => SPLITTABLE.has(child.tagName));
}

function normaliseSpace(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}
