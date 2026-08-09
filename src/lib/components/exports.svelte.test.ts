import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { Card, Image } from '$lib';

// The stories import the components by relative path, so they prove the components
// render but not that the `$lib` barrel is wired up. This does — it is the import
// path every route and microsite section will actually use.
describe('$lib', () => {
	it('renders Image with a required alt and lazy loading', async () => {
		const screen = render(Image, {
			src: '/prototype/hero-forest.jpg',
			alt: 'Mist drifting through a forest of tall pines',
			ratio: '3/2'
		});

		const img = screen.getByRole('img', { name: 'Mist drifting through a forest of tall pines' });
		await expect.element(img).toHaveAttribute('loading', 'lazy');
		await expect.element(img).toHaveClass('object-cover');
	});

	it('renders a linked Card whose accessible name is the stay', async () => {
		const screen = render(Card, {
			src: '/prototype/lake-mountain.jpg',
			alt: 'A still lake below snow-lined mountains',
			title: 'Stillwater Cabin',
			location: 'Lofoten, Norway',
			price: '$220',
			priceUnit: '/night',
			href: '/stays/stillwater-cabin'
		});

		const link = screen.getByRole('link', { name: 'Stillwater Cabin' });
		await expect.element(link).toHaveAttribute('href', '/stays/stillwater-cabin');
		await expect.element(screen.getByText('Lofoten, Norway')).toBeInTheDocument();
	});
});
