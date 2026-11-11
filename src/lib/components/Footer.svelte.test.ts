import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { Footer, type FooterLinkGroup } from '$lib';

// The stories cover how the footer looks. These cover what a screenshot cannot: the
// landmarks a screen-reader user navigates by, and that it always sits in the ink
// tone regardless of where the page's tonal scroll has got to.

const groups: FooterLinkGroup[] = [
	{
		heading: 'Discover',
		links: [
			{ label: 'Destinations', href: '#' },
			{ label: 'Stays', href: '#' }
		]
	},
	{ heading: 'For owners', links: [{ label: 'Sign in', href: '/sign-in' }] }
];

describe('Footer', () => {
	it('is a contentinfo landmark in the ink tone', async () => {
		const screen = render(Footer);

		const footer = screen.getByRole('contentinfo');
		await expect.element(footer).toHaveAttribute('data-tone', 'inverse');
		await expect.element(footer).toHaveClass('bg-surface');
	});

	it('names each link group as its own nav, by its visible heading', async () => {
		const screen = render(Footer, { groups });

		const owners = screen.getByRole('navigation', { name: 'For owners' });
		await expect.element(owners).toBeInTheDocument();
		await expect
			.element(owners.getByRole('link', { name: 'Sign in' }))
			.toHaveAttribute('href', '/sign-in');
		await expect
			.element(screen.getByRole('heading', { level: 2, name: 'Discover' }))
			.toBeInTheDocument();
	});

	it('signs off with the mark as a home link, and the legal line', async () => {
		const screen = render(Footer, {
			legal: [{ label: 'Privacy', href: '/privacy' }],
			copyright: '© 2026 Ustay'
		});

		await expect.element(screen.getByRole('link', { name: 'Ustay' })).toHaveAttribute('href', '/');
		await expect
			.element(screen.getByRole('navigation', { name: 'Legal' }).getByRole('link'))
			.toHaveAttribute('href', '/privacy');
		await expect.element(screen.getByText('© 2026 Ustay')).toBeInTheDocument();
	});

	it('renders only the mark and copyright when given no content', async () => {
		const screen = render(Footer, { home: null });

		expect(screen.container.querySelector('nav')).toBeNull();
		expect(screen.container.querySelector('a')).toBeNull();
		await expect.element(screen.getByText('Ustay', { exact: true })).toBeInTheDocument();
		await expect
			.element(screen.getByText(`© ${new Date().getFullYear()} Ustay`))
			.toBeInTheDocument();
	});
});
