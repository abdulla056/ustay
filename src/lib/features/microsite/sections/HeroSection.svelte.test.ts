import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import HeroSection from './HeroSection.svelte';
import type { HeroData } from '../types';

const full: HeroData = {
	name: 'Rumah Kabus',
	tagline: 'A quiet house above the cloud line.',
	locationLabel: 'Tanah Rata, Pahang',
	image: { src: '/prototype/hero-forest.jpg', alt: 'Misty ridges', width: 2400, height: 1430 },
	bookingAnchor: '#booking'
};

// `toBeInTheDocument`, not `toBeVisible`: the reveals fade content in, and visibility would race them.
describe('HeroSection', () => {
	it('renders the only h1, the place, the tagline, an eager image and the booking CTA', async () => {
		const screen = render(HeroSection, { data: full, variant: 'default' });
		await expect
			.element(screen.getByRole('heading', { level: 1, name: 'Rumah Kabus' }))
			.toBeInTheDocument();
		await expect.element(screen.getByText('Tanah Rata, Pahang')).toBeInTheDocument();
		await expect
			.element(screen.getByText('A quiet house above the cloud line.'))
			.toBeInTheDocument();
		expect(document.querySelector('[data-section="hero"]')).not.toBeNull();
		expect(document.querySelector('img')?.getAttribute('loading')).toBe('eager');
		expect(document.querySelector('img')?.getAttribute('alt')).toBe('Misty ridges');
		await expect
			.element(screen.getByRole('link', { name: 'Request to stay' }))
			.toHaveAttribute('href', '#booking');
	});

	it('hides the CTA when there is no booking section', async () => {
		const screen = render(HeroSection, {
			data: { ...full, bookingAnchor: null },
			variant: 'default'
		});
		await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
		expect(document.querySelector('a[href="#booking"]')).toBeNull();
	});

	it('copes with every optional field missing', async () => {
		const screen = render(HeroSection, {
			data: { name: 'Bare', tagline: null, locationLabel: null, image: null, bookingAnchor: null },
			variant: 'default'
		});
		await expect.element(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
		expect(document.querySelector('img')).toBeNull();
	});
});
