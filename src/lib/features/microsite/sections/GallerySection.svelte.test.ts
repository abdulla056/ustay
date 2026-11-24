import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import GallerySection from './GallerySection.svelte';
import Lightbox from './gallery/Lightbox.svelte';

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

		const opener = screen.getByRole('button', { name: 'View photograph 2 of 3' });
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
		await expect.poll(() => document.documentElement.style.overflow).not.toBe('hidden');
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

	it('zoom: a frame opens the lightbox on that frame', async () => {
		const screen = render(GallerySection, { data: { frames }, variant: 'zoom' });
		const third = screen.getByRole('button', { name: 'View photograph 3 of 3' });
		(third.element() as HTMLElement).focus();
		await userEvent.keyboard('{Enter}');
		await expect.poll(() => dialog().open).toBe(true);
		expect(dialog().querySelector('figure img')!.getAttribute('alt')).toBe('Photo 3');
	});

	it('grid: the band is a named region and odd counts end on a full row', async () => {
		const screen = render(GallerySection, { data: { frames }, variant: 'grid' });
		await expect.element(screen.getByRole('region', { name: 'Photographs' })).toBeInTheDocument();
		const items = document.querySelectorAll('[data-section="gallery"] ul > li');
		expect(items[2].className).toContain('md:col-span-12');
		expect(items[0].className).toContain('md:col-span-7');
	});
});

describe('Lightbox', () => {
	it('closes and releases scroll when index is cleared from outside', async () => {
		const screen = render(Lightbox, { frames, index: 0, opener: null });
		await expect.poll(() => dialog().open).toBe(true);
		expect(document.documentElement.style.overflow).toBe('hidden');
		await screen.rerender({ index: null });
		await expect.poll(() => dialog().open).toBe(false);
		await expect.poll(() => document.documentElement.style.overflow).not.toBe('hidden');
	});

	it('closes on a tap outside the photograph, but not on one inside', async () => {
		render(Lightbox, { frames, index: 0, opener: null });
		await expect.poll(() => dialog().open).toBe(true);
		const img = dialog().querySelector('img')!;
		img.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		img.click();
		expect(dialog().open).toBe(true);

		const wrapper = dialog().firstElementChild as HTMLElement;
		wrapper.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		wrapper.click();
		await expect.poll(() => dialog().open).toBe(false);
	});

	it('does not close when the press started inside (a drag-select)', async () => {
		render(Lightbox, { frames, index: 0, opener: null });
		await expect.poll(() => dialog().open).toBe(true);
		dialog()
			.querySelector('img')!
			.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
		(dialog().firstElementChild as HTMLElement).click();
		expect(dialog().open).toBe(true);
	});

	it('returns focus to the opener it was given', async () => {
		const opener = document.createElement('button');
		document.body.append(opener);
		render(Lightbox, { frames, index: 1, opener });
		await expect.poll(() => dialog().open).toBe(true);
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => dialog().open).toBe(false);
		await expect.poll(() => document.activeElement).toBe(opener);
		opener.remove();
	});
});
