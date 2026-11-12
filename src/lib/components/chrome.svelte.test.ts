import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import { Nav, Wordmark } from '$lib';
import { pageTone } from '$lib/motion';

// The stories cover how the chrome *looks* in both tones. These cover the parts a
// screenshot cannot: that the tone flip is driven by `pageTone` and nothing else,
// that in-page links are routed through the smooth scroller rather than jumping,
// and that the fixed bar does not trap a keyboard user above the page.
//
// `$lib` rather than a relative import on purpose — it is the path routes use.

/** A scroll target for an in-page link. Callers remove it when done. */
function withTarget(id: string): HTMLElement {
	const target = document.createElement('section');
	target.id = id;
	document.body.append(target);
	return target;
}

describe('Wordmark', () => {
	it('renders the mark as plain text, so it inherits the tonal colour', async () => {
		const screen = render(Wordmark);

		const mark = screen.getByText('Ustay');
		await expect.element(mark).toHaveClass('font-display');
		await expect.element(mark).toHaveClass('italic');
	});

	it('becomes a link when given href', async () => {
		const screen = render(Wordmark, { href: '/' });

		await expect.element(screen.getByRole('link', { name: 'Ustay' })).toHaveAttribute('href', '/');
	});
});

describe('Nav', () => {
	it('exposes a banner landmark and a named primary nav', async () => {
		const screen = render(Nav);

		await expect.element(screen.getByRole('banner')).toBeInTheDocument();
		await expect.element(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
	});

	it('opens a skip link ahead of the bar, pointing at the page content', async () => {
		const screen = render(Nav);

		const skip = screen.getByRole('link', { name: 'Skip to content' });
		await expect.element(skip).toHaveAttribute('href', '#content');
		// Present but out of flow until focused — a fixed bar must not cost a keyboard
		// user four tab stops before they reach the page.
		await expect.element(skip).toHaveClass('sr-only');
	});

	it('renders the default platform links and the Reserve pill', async () => {
		const screen = render(Nav);

		await expect
			.element(screen.getByRole('link', { name: 'Stays' }))
			.toHaveAttribute('href', '/stays');
		await expect
			.element(screen.getByRole('link', { name: 'Reserve' }))
			.toHaveAttribute('href', '/stays');
	});

	it('follows pageTone: dark takes the inverse scope, light takes the paper one', async () => {
		pageTone.current = 'dark';
		const screen = render(Nav);

		const banner = screen.getByRole('banner');
		await expect.element(banner).toHaveAttribute('data-tone', 'inverse');

		// The whole point of reading the singleton: the flip needs no scroll listener
		// of its own, so publishing a new tone is all it takes.
		pageTone.current = 'light';
		await expect.element(banner).toHaveAttribute('data-tone', 'light');

		pageTone.current = 'dark';
	});

	it('lets a pinned tone win, for a page with no tonal scroll to publish one', async () => {
		pageTone.current = 'dark';
		const screen = render(Nav, { tone: 'light' });

		await expect.element(screen.getByRole('banner')).toHaveAttribute('data-tone', 'light');
	});

	it('keeps a real href on an in-page link but handles the click itself', async () => {
		const screen = render(Nav, {
			links: [{ label: 'Stays', href: '#stays' }],
			cta: null
		});

		const link = screen.getByRole('link', { name: 'Stays' });
		await expect.element(link).toHaveAttribute('href', '#stays');
		const target = withTarget('stays');

		// A native hash jump would set the scroll position behind Lenis's back, so the
		// click is intercepted and sent through `scrollTo` instead.
		const clicked = vi.fn();
		document.addEventListener('click', clicked);
		await link.click();
		document.removeEventListener('click', clicked);

		target.remove();
		expect(clicked).toHaveBeenCalled();
		expect(clicked.mock.calls[0][0].defaultPrevented).toBe(true);
	});

	it('finds an anchor by id, so an id that is not a valid selector still works', async () => {
		const screen = render(Nav, {
			links: [{ label: 'Retreats', href: '#2026-retreats' }],
			cta: null
		});
		const target = withTarget('2026-retreats');

		const clicked = vi.fn();
		document.addEventListener('click', clicked);
		await screen.getByRole('link', { name: 'Retreats' }).click();
		document.removeEventListener('click', clicked);
		target.remove();

		expect(clicked.mock.calls[0][0].defaultPrevented).toBe(true);
	});

	it('leaves an anchor with no target to the browser', async () => {
		const screen = render(Nav, { links: [{ label: 'Gone', href: '#nowhere' }], cta: null });

		let preventedByNav: boolean | undefined;
		const clicked = (event: Event) => {
			preventedByNav = event.defaultPrevented;
			event.preventDefault();
		};
		document.addEventListener('click', clicked);
		await screen.getByRole('link', { name: 'Gone' }).click();
		document.removeEventListener('click', clicked);

		expect(preventedByNav).toBe(false);
	});

	it('leaves a route link alone', async () => {
		const screen = render(Nav, { links: [{ label: 'Stays', href: '/stays' }], cta: null });

		const clicked = vi.fn((event: Event) => event.preventDefault());
		document.addEventListener('click', clicked);
		await screen.getByRole('link', { name: 'Stays' }).click();
		document.removeEventListener('click', clicked);

		// Nothing of ours ran: the handler above is the only reason it is prevented.
		expect(clicked).toHaveBeenCalledOnce();
	});

	it('drops the links but keeps the mark and the CTA when given none', async () => {
		const screen = render(Nav, { links: [] });

		await expect.element(screen.getByRole('link', { name: 'Ustay' })).toBeInTheDocument();
		await expect.element(screen.getByRole('link', { name: 'Reserve' })).toBeInTheDocument();
		expect(document.querySelector('nav[aria-label="Primary"]')).toBeNull();
		// Nothing to put in a menu, so no toggle either.
		expect(screen.container.querySelector('[aria-controls]')).toBeNull();
	});
});

// The mobile menu's a11y contract (UST-60). The browser-mode viewport is phone-sized,
// so these run below `md`, where the toggle is the way to the links.
describe('Nav mobile menu', () => {
	// The exit animation is real time; with transitions off, `close()` reads a zero
	// duration and closes on the next tick, so these stay fast and deterministic.
	const still = document.createElement('style');
	still.textContent = 'dialog, dialog * { transition: none !important; }';
	beforeAll(() => document.head.append(still));
	afterAll(() => still.remove());

	const dialog = () => document.querySelector('dialog')!;
	const inDialog = () => dialog().contains(document.activeElement);

	/** Blocks the browser's own navigation for a click, after the nav has seen it. */
	function holdNavigation() {
		const events: MouseEvent[] = [];
		const prevented: boolean[] = [];
		const listener = (event: MouseEvent) => {
			events.push(event);
			prevented.push(event.defaultPrevented);
			event.preventDefault();
		};
		document.addEventListener('click', listener);
		return { events, prevented, release: () => document.removeEventListener('click', listener) };
	}

	async function openMenu(screen: ReturnType<typeof render>) {
		const toggle = screen.getByRole('button', { name: 'Open menu' });
		await toggle.click();
		await expect.poll(inDialog).toBe(true);
		return toggle;
	}

	it('is a closed native dialog by default, controlled by an Open menu toggle', async () => {
		const screen = render(Nav);

		const toggle = screen.getByRole('button', { name: 'Open menu' });
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
		await expect.element(toggle).toHaveAttribute('aria-haspopup', 'dialog');
		await expect.element(toggle).toHaveAttribute('aria-controls', dialog().id);
		expect(dialog().open).toBe(false);
	});

	it('opens modally in the ink tone, flips aria-expanded and moves focus in', async () => {
		const screen = render(Nav);
		const toggle = await openMenu(screen);

		await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
		// `showModal()`: the page behind is inert and the dialog is in the top layer.
		expect(dialog().matches(':modal')).toBe(true);
		expect(dialog().dataset.tone).toBe('inverse');
		const close = screen.getByRole('button', { name: 'Close menu' });
		expect(document.activeElement).toBe(close.element());

		await close.click();
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(dialog().open).toBe(false);
		expect(document.activeElement).toBe(toggle.element());
	});

	it('closes on Escape and hands focus back to the toggle', async () => {
		const screen = render(Nav);
		const toggle = await openMenu(screen);

		await userEvent.keyboard('{Escape}');

		await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(dialog().open).toBe(false);
		expect(document.activeElement).toBe(toggle.element());
	});

	it('never lets Tab reach the page behind the dialog', async () => {
		const screen = render(Nav);
		await openMenu(screen);

		// A native modal makes the page inert. Tabbing past the last stop may leave the
		// document for the browser's own UI (that is the platform behaviour), but focus
		// must never land on anything behind the dialog.
		const onPage = () => {
			const active = document.activeElement;
			return active !== null && active !== document.body && !inDialog();
		};
		const stops = dialog().querySelectorAll('a[href], button').length;
		for (let i = 0; i <= stops; i++) {
			await userEvent.tab();
			expect(onPage()).toBe(false);
		}
		for (let i = 0; i <= stops; i++) {
			await userEvent.tab({ shift: true });
			expect(onPage()).toBe(false);
		}
	});

	it('locks the page scroll while open and releases it on close', async () => {
		const screen = render(Nav);
		const root = document.documentElement;
		const before = root.style.overflow;

		await openMenu(screen);
		expect(root.style.overflow).toBe('hidden');

		await screen.getByRole('button', { name: 'Close menu' }).click();
		await expect.poll(() => dialog().open).toBe(false);
		expect(root.style.overflow).toBe(before);
	});

	it('closes when an in-page link is followed, and scrolls instead of jumping', async () => {
		const screen = render(Nav, { links: [{ label: 'Stays', href: '#stays' }], cta: null });
		const toggle = await openMenu(screen);
		const target = withTarget('stays');

		const held = holdNavigation();
		dialog().querySelector<HTMLElement>('a[href="#stays"]')!.click();
		held.release();
		target.remove();

		expect(held.prevented[0]).toBe(true);
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(document.activeElement).toBe(toggle.element());
	});

	it('finds an anchor whose id is not a valid selector', async () => {
		const screen = render(Nav, {
			links: [{ label: 'Retreats', href: '#2026-retreats' }],
			cta: null
		});
		const toggle = await openMenu(screen);
		const target = withTarget('2026-retreats');

		const held = holdNavigation();
		dialog().querySelector<HTMLElement>('a[href="#2026-retreats"]')!.click();
		held.release();
		target.remove();

		expect(held.prevented[0]).toBe(true);
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
	});

	it('leaves a modified or middle click to the browser, with the menu still open', async () => {
		const screen = render(Nav, { links: [{ label: 'Stays', href: '#stays' }], cta: null });
		const toggle = await openMenu(screen);
		const target = withTarget('stays');
		const link = dialog().querySelector<HTMLElement>('a[href="#stays"]')!;

		const held = holdNavigation();
		link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
		link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 1 }));
		held.release();
		target.remove();

		expect(held.prevented).toEqual([false, false]);
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(dialog().open).toBe(true);
	});

	it('leaves a route link to the router: the menu stays open until it navigates', async () => {
		const screen = render(Nav, { links: [{ label: 'Stays', href: '/stays' }], cta: null });
		const toggle = await openMenu(screen);
		const link = dialog().querySelector<HTMLElement>('a[href="/stays"]')!;
		link.focus();

		// Stands in for a navigation that failed or was cancelled: the menu must still
		// be open with focus where it was. A real one closes it from `afterNavigate`.
		const held = holdNavigation();
		link.click();
		held.release();

		expect(held.prevented[0]).toBe(false);
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
		expect(document.activeElement).toBe(link);
	});

	it('numbers the links editorially without putting the numbers in their names', async () => {
		const screen = render(Nav);
		await openMenu(screen);

		const menu = screen.getByRole('dialog');
		await expect.element(menu.getByRole('link', { name: 'Stays', exact: true })).toBeVisible();
		await expect.element(menu.getByText('01')).toBeInTheDocument();
	});
});
