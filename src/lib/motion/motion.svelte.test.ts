import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	displayEntrance,
	getSmoothScroller,
	imageReveal,
	pageTone,
	parallax,
	prefersReducedMotion,
	reveal,
	smoothScroll,
	tonalScroll
} from './index';

// The utilities are attachments — plain `(element) => cleanup` functions — so they
// are tested by calling them on a real element rather than through a component.
// What matters is the contract every one of them shares: prime synchronously so
// content can't flash, tear everything down on cleanup, and do nothing at all
// when the visitor asked for reduced motion.

const mounted: HTMLElement[] = [];
const teardowns: Array<() => void> = [];

function mount(html = '<p>Every stay has a story.</p>'): HTMLElement {
	const element = document.createElement('div');
	element.innerHTML = html;
	document.body.append(element);
	mounted.push(element);
	return element;
}

/** Calls an attachment and registers its cleanup, mirroring Svelte's lifecycle. */
function attach(cleanup: void | (() => void)): () => void {
	const teardown = cleanup ?? (() => {});
	teardowns.push(teardown);
	return teardown;
}

/** Pretends the OS is set to "reduce motion" for the rest of the test. */
function reduceMotion(): void {
	const query = {
		matches: true,
		media: '(prefers-reduced-motion: reduce)',
		addEventListener: vi.fn(),
		removeEventListener: vi.fn()
	};
	vi.spyOn(window, 'matchMedia').mockReturnValue(query as unknown as MediaQueryList);
}

afterEach(() => {
	for (const teardown of teardowns.splice(0)) teardown();
	for (const element of mounted.splice(0)) element.remove();
	vi.restoreAllMocks();
	pageTone.current = 'dark';
});

describe('reveal', () => {
	it('primes its hidden start state synchronously, then clears it once it lands', async () => {
		const element = mount();

		attach(reveal()(element));

		// Before GSAP has even loaded — otherwise the content paints in its final
		// position and jumps back to hidden a tick later.
		expect(element.style.opacity).toBe('0');
		expect(element.style.transform).toContain('40px');

		await expect.poll(() => element.style.opacity, { timeout: 5000 }).toBe('');
		expect(element.style.transform).toBe('');
	});
});

describe('displayEntrance', () => {
	it('masks each display line while it rises, and releases the mask afterwards', async () => {
		const element = mount('<span class="block"><span class="block">Every stay</span></span>');
		const mask = element.firstElementChild as HTMLElement;
		const line = mask.firstElementChild as HTMLElement;

		attach(displayEntrance({ duration: 0.2, delay: 0 })(element));

		expect(mask.style.overflow).toBe('hidden');
		expect(line.style.transform).toContain('115%');

		// Released once landed: a permanent overflow clip would cut italic descenders.
		await expect.poll(() => mask.style.overflow, { timeout: 5000 }).toBe('');
	});
});

describe('imageReveal', () => {
	it('opens the media from a clipped, over-scaled start state', async () => {
		const element = mount();

		attach(imageReveal({ duration: 0.2 })(element));

		// The browser collapses the inset shorthand, hence the loose match.
		expect(element.style.clipPath).toContain('inset(100%');
		expect(element.style.transform).toContain('1.12');

		await expect.poll(() => element.style.clipPath, { timeout: 5000 }).toBe('');
	});
});

describe('parallax', () => {
	it('registers a ScrollTrigger and takes it away again on teardown', async () => {
		const element = mount();
		const before = ScrollTrigger.getAll().length;

		const teardown = attach(parallax()(element));
		await vi.waitUntil(() => ScrollTrigger.getAll().length > before, { timeout: 5000 });
		expect(ScrollTrigger.getAll().length).toBe(before + 1);

		teardown();
		expect(ScrollTrigger.getAll().length).toBe(before);
	});
});

describe('smoothScroll', () => {
	it('installs Lenis and removes every trace of it on teardown', async () => {
		const teardown = attach(smoothScroll()(mount('')));

		await vi.waitUntil(() => getSmoothScroller() !== undefined, { timeout: 5000 });
		// CSS smooth scrolling is suppressed while Lenis owns the scroller.
		expect(document.documentElement.style.scrollBehavior).toBe('auto');

		teardown();
		expect(getSmoothScroller()).toBeUndefined();
		expect(document.documentElement.style.scrollBehavior).toBe('');
	});
});

describe('prefers-reduced-motion', () => {
	it('leaves the content untouched and creates no scroll machinery', () => {
		reduceMotion();
		const element = mount();
		const before = ScrollTrigger.getAll().length;

		attach(reveal()(element));

		expect(prefersReducedMotion()).toBe(true);
		expect(element.style.opacity).toBe(''); // never primed — it just renders
		expect(ScrollTrigger.getAll().length).toBe(before);
	});

	it('never hijacks the scroll', () => {
		reduceMotion();

		attach(smoothScroll()(mount('')));

		expect(getSmoothScroller()).toBeUndefined();
		expect(document.documentElement.style.scrollBehavior).toBe('');
	});

	it('still flips the page tone, because nav legibility is not decoration', async () => {
		reduceMotion();
		const backdrop = mount('');
		backdrop.dataset.tonalBackdrop = '';
		const section = mount('<p>01 — The dissolve</p>');

		attach(tonalScroll({ from: 'rgb(11, 15, 14)', to: 'rgb(244, 239, 230)' })(section));

		await expect.poll(() => pageTone.current, { timeout: 5000 }).toBe('light');
		// Switched, not dissolved: no scrubbed tween to carry the colour.
		expect(backdrop.style.backgroundColor).toBe('rgb(244, 239, 230)');
	});
});

describe('pageTone', () => {
	it('starts dark, because every page opens on the cinematic hero', () => {
		expect(pageTone.current).toBe('dark');
	});
});
