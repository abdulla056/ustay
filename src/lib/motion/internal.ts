/**
 * Plumbing shared by every motion utility. Not part of the public surface except
 * for `prefersReducedMotion` (re-exported from `./index.ts`).
 *
 * Three jobs, done once here instead of in every utility:
 *
 * 1. **Loading GSAP lazily.** `gsap`/`lenis` touch `window` and the Cloudflare
 *    worker has a size budget, so they are never top-level imports — importing
 *    `$lib/motion` on the server pulls in no animation code at all
 *    (`docs/ARCHITECTURE.md` → "Motion is client-only").
 * 2. **Gating on `prefers-reduced-motion`,** live: flipping the OS setting tears
 *    the motion down or builds it back up without a reload.
 * 3. **Priming the "from" state synchronously.** Because GSAP arrives a tick
 *    late, an entrance would otherwise paint its final state and then jump back
 *    to hidden. Priming writes the inline start styles immediately, and every
 *    path that abandons the animation removes them again — so content is never
 *    left stranded in a hidden state.
 */
import { browser } from '$app/environment';
import type { Attachment } from 'svelte/attachments';
import { EDITORIAL_EASE, FALLBACK_EASE, REDUCED_MOTION_QUERY } from './config';

type GsapStatic = typeof import('gsap').gsap;
type ScrollTriggerStatic = typeof import('gsap/ScrollTrigger').ScrollTrigger;
type CustomEaseStatic = typeof import('gsap/CustomEase').CustomEase;
type GsapContext = ReturnType<GsapStatic['context']>;

/** GSAP handed to a utility's setup function, plugins already registered. */
export type MotionApi = {
	gsap: GsapStatic;
	ScrollTrigger: ScrollTriggerStatic;
};

let api: Promise<MotionApi> | undefined;
let resolved: MotionApi | undefined;
let easeName: string = FALLBACK_EASE;

/**
 * The registered brand ease. Resolves to the `--ease-editorial` `CustomEase`
 * once GSAP has loaded, and to the nearest built-in curve if it could not be
 * registered — so a tween never references an ease that doesn't exist.
 */
export function editorialEase(): string {
	return easeName;
}

/** Loads GSAP + ScrollTrigger once per session and registers the plugins. */
export function loadMotion(): Promise<MotionApi> {
	api ??= (async () => {
		const [core, scrollTrigger, customEase] = await Promise.all([
			import('gsap'),
			import('gsap/ScrollTrigger'),
			import('gsap/CustomEase')
		]);
		const { gsap } = core;
		const { ScrollTrigger } = scrollTrigger;
		gsap.registerPlugin(ScrollTrigger, customEase.CustomEase);
		registerEditorialEase(customEase.CustomEase);
		resolved = { gsap, ScrollTrigger };
		return resolved;
	})();
	return api;
}

/**
 * GSAP **if it is already here**, without triggering the import. For code that
 * wants to nudge an existing animation setup (`refreshMotion` after a client-side
 * navigation) but must not be the reason a reduced-motion visitor downloads GSAP.
 */
export function loadedMotion(): MotionApi | undefined {
	return resolved;
}

/**
 * Mirrors the `--ease-editorial` token as a GSAP ease, reading the curve from
 * CSS so the token stays the single source of truth for "the brand curve".
 */
function registerEditorialEase(CustomEase: CustomEaseStatic): void {
	const declared = cssVar('--ease-editorial');
	const parsed = declared
		.match(/cubic-bezier\(([^)]+)\)/)?.[1]
		.split(',')
		.map((part) => Number(part.trim()));
	const [x1, y1, x2, y2] =
		parsed?.length === 4 && parsed.every((n) => Number.isFinite(n)) ? parsed : [0.16, 1, 0.3, 1];

	try {
		CustomEase.create(EDITORIAL_EASE, `M0,0 C${x1},${y1} ${x2},${y2} 1,1`);
		easeName = EDITORIAL_EASE;
	} catch {
		easeName = FALLBACK_EASE;
	}
}

/** Reads a CSS custom property off `<html>` (where the Tailwind theme emits them). */
export function cssVar(name: string, element?: Element): string {
	if (!browser) return '';
	return getComputedStyle(element ?? document.documentElement)
		.getPropertyValue(name)
		.trim();
}

/**
 * Does this visitor want motion suppressed? On the server there is no
 * preference to read, so it answers `true` — the no-motion branch is always the
 * safe thing to render.
 */
export function prefersReducedMotion(): boolean {
	if (!browser || typeof window.matchMedia !== 'function') return true;
	return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Runs `activate` only while motion is allowed, and re-evaluates when the OS
 * preference changes. Returns the teardown for the caller's lifecycle.
 *
 * @param always Keep running `activate` under reduced motion too — it receives
 * `reduced: true` and is then responsible for doing something that isn't motion
 * (only `tonalScroll` needs this, to keep the nav's tone correct).
 */
export function motionGate(
	activate: (reduced: boolean) => (() => void) | void,
	always = false
): () => void {
	if (!browser || typeof window.matchMedia !== 'function') return () => {};

	const query = window.matchMedia(REDUCED_MOTION_QUERY);
	let deactivate: (() => void) | void;

	const sync = () => {
		deactivate?.();
		deactivate = undefined;
		if (query.matches && !always) return;
		deactivate = activate(query.matches);
	};

	sync();
	query.addEventListener('change', sync);

	return () => {
		query.removeEventListener('change', sync);
		deactivate?.();
		deactivate = undefined;
	};
}

/** Builds the animation for an element, inside a scoped `gsap.context`. */
export type MotionSetup<T extends Element> = (el: T, api: MotionApi, reduced: boolean) => void;

export type MotionAttachmentOptions<T extends Element> = {
	/**
	 * Writes the animation's start styles synchronously, before GSAP loads, and
	 * returns a function restoring the untouched element. Skipped entirely under
	 * reduced motion, so the content simply renders as authored.
	 */
	prime?: (el: T) => () => void;
	/** See `motionGate`'s `always`. */
	always?: boolean;
};

/**
 * Turns a GSAP setup function into a Svelte attachment: `{@attach reveal()}`.
 *
 * Attachments spread through components, so any primitive that forwards rest
 * props can be animated from the outside — `{@attach imageReveal()}` on
 * `<Image>` lands on the inner `<img>`, which is exactly the handle we want.
 */
export function motionAttachment<T extends Element>(
	setup: MotionSetup<T>,
	options: MotionAttachmentOptions<T> = {}
): Attachment<T> {
	const { prime, always = false } = options;

	return (element) =>
		motionGate((reduced) => {
			const unprime = reduced ? undefined : prime?.(element);
			let context: GsapContext | undefined;
			let cancelled = false;

			void loadMotion().then(
				(loaded) => {
					if (cancelled) return;
					context = loaded.gsap.context(() => setup(element, loaded, reduced), element);
				},
				(error: unknown) => {
					// Never leave primed content stranded in its hidden start state.
					unprime?.();
					console.error('[motion] GSAP failed to load; motion is off for this element', error);
				}
			);

			return () => {
				cancelled = true;
				context?.revert();
				unprime?.();
			};
		}, always);
}

/** The element itself, or the descendants matching `select` (`:scope > *` works). */
export function resolveTargets(element: Element, select?: string): Element[] {
	if (!select) return [element];
	return [...element.querySelectorAll(select)];
}

/**
 * Writes inline styles now and hands back their removal. Property names are CSS
 * (`clip-path`), not camelCase, because these bypass GSAP entirely.
 */
export function primeStyles(targets: Element[], styles: Record<string, string>): () => void {
	const elements = targets.filter((el): el is HTMLElement => el instanceof HTMLElement);

	for (const element of elements) {
		for (const [property, value] of Object.entries(styles)) {
			element.style.setProperty(property, value);
		}
	}

	return () => {
		for (const element of elements) {
			for (const property of Object.keys(styles)) {
				element.style.removeProperty(property);
			}
		}
	};
}

/** Composes several teardown functions into one. */
export function composeCleanup(...cleanups: Array<(() => void) | undefined>): () => void {
	return () => {
		for (const cleanup of cleanups) cleanup?.();
	};
}

/** Dev-only nudge for a mis-wired utility. Silent in production. */
export function warn(message: string): void {
	if (import.meta.env.DEV) console.warn(`[motion] ${message}`);
}

/**
 * Is `element` already (at least partly) inside the viewport, right now?
 *
 * A reveal's scroll threshold (`start: 'top 82%'` and friends) exists for
 * content still below the fold. Content already on screen at mount has, by
 * definition, already "arrived" — gating it behind the same threshold means
 * anything in roughly the bottom fifth of the initial viewport is primed to
 * opacity 0 and stays invisible until the visitor's first scroll (UST-59).
 * Checking the actual viewport rather than reproducing the threshold's own
 * math is also what makes this robust to the sub-pixel misses that caused
 * that bug in the first place.
 */
export function isInViewport(element: Element): boolean {
	if (!browser) return false;
	const { top, bottom } = element.getBoundingClientRect();
	return top < window.innerHeight && bottom > 0;
}
