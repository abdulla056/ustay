import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import GallerySection from './GallerySection.svelte';

const frames = [1, 2, 3].map((n) => ({
	src: `/prototype/lake-mountain.jpg?${n}`,
	alt: `Photo ${n}`,
	width: 1200,
	height: 800,
	caption: `Caption ${n}`
}));

const dialog = () => document.querySelector('dialog') as HTMLDialogElement;

describe('GallerySection', () => {
	it('grid: opens the lightbox, steps with arrows, closes with Esc and restores focus', async () => {
		const screen = render(GallerySection, { data: { frames }, variant: 'grid' });
		const imgs = document.querySelectorAll('[data-section="gallery"] ul img');
		expect(imgs).toHaveLength(3);
		expect(imgs[0].getAttribute('loading')).toBe('eager');
		expect(imgs[1].getAttribute('loading')).toBe('lazy');

		const opener = screen.getByRole('button', { name: /Photo 2/ });
		// Keyboard path (Enter on a focused frame); the frames are taller than the test viewport.
		(opener.element() as HTMLElement).focus();
		await userEvent.keyboard('{Enter}');
		await expect.poll(() => dialog().open).toBe(true);
		const figure = () => dialog().querySelector('figure')!;
		expect(figure().textContent).toContain('Caption 2');
		expect(figure().querySelector('img')!.alt).toBe('Photo 2');

		await userEvent.keyboard('{ArrowRight}');
		expect(figure().textContent).toContain('Caption 3');
		await userEvent.keyboard('{ArrowRight}');
		expect(figure().textContent).toContain('Caption 1');
		await userEvent.keyboard('{ArrowLeft}');
		expect(figure().textContent).toContain('Caption 3');

		await userEvent.keyboard('{Escape}');
		await expect.poll(() => dialog().open).toBe(false);
		await expect.element(opener).toHaveFocus();
		expect(document.documentElement.style.overflow).not.toBe('hidden');
	});

	it('zoom: a "View all photographs" button opens the lightbox on the first frame', async () => {
		const screen = render(GallerySection, { data: { frames }, variant: 'zoom' });
		await screen.getByRole('button', { name: 'View all photographs' }).click();
		await expect.poll(() => dialog().open).toBe(true);
		expect(dialog().querySelector('figure img')!.getAttribute('alt')).toBe('Photo 1');
	});

	it('renders with no frames', async () => {
		render(GallerySection, { data: { frames: [] }, variant: 'grid' });
		expect(document.querySelectorAll('[data-section="gallery"] li')).toHaveLength(0);
	});
});
