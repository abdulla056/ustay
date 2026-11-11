import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { Nav, Wordmark } from '$lib';
import { pageTone } from '$lib/motion';

// The stories cover how the chrome *looks* in both tones. These cover the parts a
// screenshot cannot: that the tone flip is driven by `pageTone` and nothing else,
// that in-page links are routed through the smooth scroller rather than jumping,
// and that the fixed bar does not trap a keyboard user above the page.
//
// `$lib` rather than a relative import on purpose — it is the path routes use.

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

		// A native hash jump would set the scroll position behind Lenis's back, so the
		// click is intercepted and sent through `scrollTo` instead.
		const clicked = vi.fn();
		document.addEventListener('click', clicked);
		await link.click();
		document.removeEventListener('click', clicked);

		expect(clicked).toHaveBeenCalled();
		expect(clicked.mock.calls[0][0].defaultPrevented).toBe(true);
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
	const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')!;
	// Matched on either name, since the name is what changes on open. The bar's toggle
	// precedes the dialog's own Close button in the DOM, hence `first()`.
	const findToggle = (screen: ReturnType<typeof render>) =>
		screen.getByRole('button', { name: /^(Open|Close) menu$/ }).first();

	it('is closed by default: the toggle says so and the panel is inert', async () => {
		const screen = render(Nav);

		const toggle = findToggle(screen);
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
		await expect.element(toggle).toHaveAttribute('aria-controls', dialog().id);
		expect(dialog().inert).toBe(true);
		expect(dialog().getAttribute('aria-modal')).toBe('true');
	});

	it('opens as a modal dialog, flips aria-expanded and the name, and moves focus in', async () => {
		const screen = render(Nav);

		const toggle = findToggle(screen);
		await toggle.click();

		await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect.element(toggle).toHaveAttribute('aria-label', 'Close menu');
		expect(dialog().inert).toBe(false);
		// Always the ink tone, whatever the page is doing.
		expect(dialog().dataset.tone).toBe('inverse');
		await expect.poll(() => dialog().contains(document.activeElement)).toBe(true);

		await screen.getByRole('dialog').getByRole('button', { name: 'Close menu' }).click();
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
	});

	it('closes on Escape and hands focus back to the toggle', async () => {
		const screen = render(Nav);

		const toggle = findToggle(screen);
		await toggle.click();
		await expect.poll(() => dialog().contains(document.activeElement)).toBe(true);

		document.activeElement!.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
		);

		await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(dialog().inert).toBe(true);
		expect(document.activeElement).toBe(toggle.element());
	});

	it('traps Tab inside the dialog in both directions', async () => {
		const screen = render(Nav);

		await screen.getByRole('button', { name: 'Open menu' }).click();
		await expect.poll(() => dialog().contains(document.activeElement)).toBe(true);

		const focusable = Array.from(
			dialog().querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
		);
		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		last.focus();
		last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
		expect(document.activeElement).toBe(first);

		first.dispatchEvent(
			new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })
		);
		expect(document.activeElement).toBe(last);

		// Focus that escapes by other means is pulled back in.
		(document.body.querySelector('header a[href="#content"]') as HTMLElement).focus();
		expect(dialog().contains(document.activeElement)).toBe(true);
	});

	it('locks the page scroll while open and releases it on close', async () => {
		const screen = render(Nav);
		const root = document.documentElement;
		const before = root.style.overflow;

		await screen.getByRole('button', { name: 'Open menu' }).click();
		expect(root.style.overflow).toBe('hidden');

		await screen.getByRole('dialog').getByRole('button', { name: 'Close menu' }).click();
		expect(root.style.overflow).toBe(before);
	});

	it('closes when an in-page link is followed, and scrolls instead of jumping', async () => {
		const screen = render(Nav, {
			links: [{ label: 'Stays', href: '#stays' }],
			cta: null
		});

		const toggle = findToggle(screen);
		await toggle.click();

		const clicked = vi.fn();
		document.addEventListener('click', clicked);
		await screen.getByRole('dialog').getByRole('link', { name: 'Stays' }).click();
		document.removeEventListener('click', clicked);

		expect(clicked.mock.calls[0][0].defaultPrevented).toBe(true);
		await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
		expect(document.activeElement).toBe(toggle.element());
	});

	it('numbers the links editorially without putting the numbers in their names', async () => {
		const screen = render(Nav);
		await screen.getByRole('button', { name: 'Open menu' }).click();

		const menu = screen.getByRole('dialog');
		await expect.element(menu.getByRole('link', { name: 'Stays', exact: true })).toBeVisible();
		await expect.element(menu.getByText('01')).toBeInTheDocument();
	});
});
