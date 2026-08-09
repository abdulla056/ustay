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
	});
});
