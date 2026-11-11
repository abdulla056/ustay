import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
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

function mount(html = '<p>Every stay has a story.</p>', tag = 'div'): HTMLElement {
	const element = document.createElement(tag);
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

	it('plays on mount, with no scroll threshold, for content already in the viewport', async () => {
		// UST-59: an element inside the initial viewport — including the bottom
		// slice the default `start: 'top 82%'` sits above — must not wait on a
		// scroll that may never happen.
		const element = mount();
		const before = ScrollTrigger.getAll().length;

		attach(reveal({ duration: 0.2 })(element));

		await expect.poll(() => element.style.opacity, { timeout: 5000 }).toBe('');
		expect(ScrollTrigger.getAll().length).toBe(before);
	});

	it('keeps the scroll threshold for content that starts below the fold', async () => {
		const element = mount();
		element.style.marginTop = `${window.innerHeight * 2}px`;
		const before = ScrollTrigger.getAll().length;

		const teardown = attach(reveal({ duration: 0.2 })(element));

		await vi.waitUntil(() => ScrollTrigger.getAll().length > before, { timeout: 5000 });
		expect(ScrollTrigger.getAll().length).toBe(before + 1);
		// Still off-screen, so still primed — nothing has scrolled it into view.
		expect(element.style.opacity).toBe('0');

		teardown();
	});
});

describe('displayEntrance', () => {
	const headline = 'Every stay has a <em>story.</em>';
	const name = 'Every stay has a story.';

	/** The masked lines SplitText built, or none once the split is reverted. */
	const lines = (element: Element) => [...element.querySelectorAll<HTMLElement>('.display-line')];

	it('fades the plain-text heading synchronously, then splits it into masked lines', async () => {
		const element = mount(headline, 'h1');

		// A delay holds the lines at their start long enough to inspect them.
		attach(displayEntrance({ duration: 2, delay: 2 })(element));

		// Before GSAP, SplitText and the fonts are here: faded, not yet split.
		expect(element.style.opacity).toBe('0');
		expect(lines(element)).toHaveLength(0);

		await expect.poll(() => lines(element).length, { timeout: 5000 }).toBeGreaterThan(0);
		const [line] = lines(element);
		const mask = line.parentElement as HTMLElement;

		expect(mask.classList.contains('display-line-mask')).toBe(true);
		expect(mask.style.overflow).toBe('clip');
		// Block boxes, or neither the clip nor the rise would take effect.
		expect(getComputedStyle(mask).display).toBe('block');
		expect(getComputedStyle(line).display).toBe('block');
		// Pushed below its mask, so the mask really is hiding it.
		expect(line.getBoundingClientRect().top).toBeGreaterThanOrEqual(
			mask.getBoundingClientRect().bottom - 1
		);
		// The fade comes off as soon as the masks are holding the lines down.
		expect(element.style.opacity).toBe('');
	});

	it('breaks lines where the text actually wraps, and re-splits on resize', async () => {
		const element = mount(headline, 'h1');
		element.style.width = '6ch';

		attach(displayEntrance({ duration: 3, delay: 0 })(element));

		await expect.poll(() => lines(element).length, { timeout: 5000 }).toBeGreaterThan(1);
		// Every line is a single row of text, so the split matches the wrap.
		for (const line of lines(element)) {
			expect(line.getClientRects()).toHaveLength(1);
		}

		element.style.width = '60ch';
		await expect.poll(() => lines(element).length, { timeout: 5000 }).toBe(1);
	});

	it('keeps the original text as the accessible name while split', async () => {
		const element = mount(headline, 'h1');

		attach(displayEntrance({ duration: 2, delay: 0 })(element));
		await expect.poll(() => lines(element).length, { timeout: 5000 }).toBeGreaterThan(0);

		expect(element.getAttribute('aria-label')).toBe(name);
		for (const line of lines(element)) expect(line.getAttribute('aria-hidden')).toBe('true');
		// Computed by the browser's accessibility tree, not by reading attributes.
		await expect.element(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
	});

	it('names the heading as it reads across an art-directed <br>, or by its authored label', async () => {
		const broken = mount('Every stay<br>has a <em>story.</em>', 'h1');
		const labelled = mount('Every stay has a <em>story.</em>', 'h2');
		labelled.setAttribute('aria-label', 'Our story');

		attach(displayEntrance({ duration: 2, delay: 0 })(broken));
		attach(displayEntrance({ duration: 2, delay: 0 })(labelled));
		await expect.poll(() => lines(broken).length, { timeout: 5000 }).toBe(2);
		await expect.poll(() => lines(labelled).length, { timeout: 5000 }).toBeGreaterThan(0);

		// `textContent` alone would give "Every stayhas a story.".
		await expect.element(page.getByRole('heading', { level: 1, name, exact: true })).toBeVisible();
		expect(labelled.getAttribute('aria-label')).toBe('Our story');
	});

	it('reverts the split once it lands, handing back the very nodes it was given', async () => {
		const element = mount(headline, 'h1');
		const authored = [...element.childNodes];

		attach(displayEntrance({ duration: 0.2, delay: 0 })(element));
		await expect.poll(() => lines(element).length, { timeout: 5000 }).toBeGreaterThan(0);
		// What Svelte would do to a `{name}` mid-entrance: update its own text node.
		(authored[0] as Text).nodeValue = 'Every room has a ';

		await expect.poll(() => lines(element).length, { timeout: 5000 }).toBe(0);
		expect([...element.childNodes]).toEqual(authored);
		expect(element.textContent).toBe('Every room has a story.');
		expect(element.hasAttribute('aria-label')).toBe(false);
		expect(element.getAttribute('style') ?? '').toBe('');
	});

	it('restores the authored DOM when torn down mid-entrance', async () => {
		const element = mount(headline, 'h1');
		const authored = [...element.childNodes];

		const teardown = attach(displayEntrance({ duration: 2, delay: 0 })(element));
		await expect.poll(() => lines(element).length, { timeout: 5000 }).toBeGreaterThan(0);

		teardown();

		expect([...element.childNodes]).toEqual(authored);
		expect(element.hasAttribute('aria-label')).toBe(false);
		expect(element.style.opacity).toBe('');
	});

	it('still accepts hand-split markup, one line per block child', async () => {
		const element = mount(
			'<span class="block">Every stay</span><span class="block">has a <em>story.</em></span>',
			'h1'
		);
		for (const block of element.children) (block as HTMLElement).style.display = 'block';

		attach(displayEntrance({ duration: 2, delay: 0 })(element));

		await expect.poll(() => lines(element).length, { timeout: 5000 }).toBe(2);
	});

	it('plays immediately when the onScroll variant is already in the viewport', async () => {
		// `onScroll` is meant for display type below the fold, but it should never
		// leave already-visible content waiting on a scroll (the same UST-59 edge).
		const element = mount(headline, 'h2');
		const before = ScrollTrigger.getAll().length;

		attach(displayEntrance({ duration: 2, delay: 0, onScroll: true })(element));

		await expect.poll(() => lines(element).length, { timeout: 5000 }).toBeGreaterThan(0);
		expect(ScrollTrigger.getAll().length).toBe(before);
	});

	it('waits for the scroll, unsplit, when the onScroll variant is below the fold', async () => {
		const element = mount(headline, 'h2');
		element.style.marginTop = `${window.innerHeight * 2}px`;
		const before = ScrollTrigger.getAll().length;

		const teardown = attach(displayEntrance({ duration: 0.2, delay: 0, onScroll: true })(element));

		await vi.waitUntil(() => ScrollTrigger.getAll().length > before, { timeout: 5000 });
		expect(ScrollTrigger.getAll().length).toBe(before + 1);
		// Split only when it scrolls in, so its lines match the width at that moment.
		expect(lines(element)).toHaveLength(0);
		expect(element.style.opacity).toBe('0');

		teardown();
		expect(ScrollTrigger.getAll().length).toBe(before);
		expect(element.style.opacity).toBe('');
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

	it('plays on mount, with no scroll threshold, for a frame already in the viewport', async () => {
		const element = mount();
		const before = ScrollTrigger.getAll().length;

		attach(imageReveal({ duration: 0.2 })(element));

		await expect.poll(() => element.style.clipPath, { timeout: 5000 }).toBe('');
		expect(ScrollTrigger.getAll().length).toBe(before);
	});

	it('keeps the scroll threshold for a frame that starts below the fold', async () => {
		const element = mount();
		element.style.marginTop = `${window.innerHeight * 2}px`;
		const before = ScrollTrigger.getAll().length;

		const teardown = attach(imageReveal({ duration: 0.2 })(element));

		await vi.waitUntil(() => ScrollTrigger.getAll().length > before, { timeout: 5000 });
		expect(ScrollTrigger.getAll().length).toBe(before + 1);
		expect(element.style.clipPath).toContain('inset(100%');

		teardown();
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

	it('never splits display type: the heading is just its text, visible', async () => {
		reduceMotion();
		const element = mount('Every stay has a <em>story.</em>', 'h1');
		const authored = [...element.childNodes];

		attach(displayEntrance()(element));
		// Give a split every chance to (wrongly) happen.
		await new Promise((resolve) => setTimeout(resolve, 300));

		expect(element.style.opacity).toBe('');
		expect(element.querySelector('.display-line')).toBeNull();
		expect([...element.childNodes]).toEqual(authored);
		expect(element.hasAttribute('aria-label')).toBe(false);
		await expect
			.element(page.getByRole('heading', { level: 1, name: 'Every stay has a story.' }))
			.toBeVisible();
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
