import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ZoomGallery from './ZoomGallery.svelte';
import type { GalleryFrame } from './types';

// `reducedMotion` is a module-level MediaQuery, so it is swapped for a plain flag
// the tests flip before rendering.
const motion = vi.hoisted(() => ({ reduced: { current: true } }));
vi.mock('$lib/motion', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/motion')>()),
	reducedMotion: motion.reduced
}));

const frame = (n: number, extra: Partial<GalleryFrame> = {}): GalleryFrame => ({
	src: `/prototype/lake-mountain.jpg?${n}`,
	alt: `Frame ${n}`,
	width: 1200,
	height: 800,
	...extra
});
const frames = (count: number) => Array.from({ length: count }, (_, i) => frame(i + 1));

describe('ZoomGallery', () => {
	it('under reduced motion renders the static grid: no sticky stage, no scroll length', async () => {
		motion.reduced.current = true;
		const screen = render(ZoomGallery, { frames: frames(5), label: 'Gallery' });

		const region = screen.getByRole('region', { name: 'Gallery' });
		await expect.element(region).toHaveAttribute('data-mode', 'static');

		const section = region.element() as HTMLElement;
		const stage = section.querySelector('.zg__stage') as HTMLElement;
		expect(getComputedStyle(stage).position).not.toBe('sticky');
		// Only the grid's own height — not the 300vh the zoom needs.
		expect(section.getBoundingClientRect().height).toBeLessThan(
			stage.getBoundingClientRect().height + 200
		);
		expect(section.querySelectorAll('img')).toHaveLength(5);
	});

	it('shows every alt text, and captions in the static grid', async () => {
		motion.reduced.current = true;
		const screen = render(ZoomGallery, {
			frames: [frame(1, { caption: 'First light' }), frame(2), frame(3)],
			label: 'Gallery'
		});

		await expect.element(screen.getByRole('img', { name: 'Frame 2' })).toBeInTheDocument();
		await expect.element(screen.getByText('First light')).toBeVisible();
	});

	it('uses focal points as object-position', async () => {
		motion.reduced.current = true;
		const screen = render(ZoomGallery, {
			frames: [frame(1, { focalX: 0.2, focalY: 0.8 }), frame(2), frame(3)],
			label: 'Gallery'
		});

		const img = screen.getByRole('img', { name: 'Frame 1' }).element() as HTMLElement;
		expect(img.style.objectPosition).toBe('20% 80%');
	});

	it('clamps to the first seven frames', async () => {
		motion.reduced.current = true;
		const screen = render(ZoomGallery, { frames: frames(10), label: 'Gallery' });

		const region = screen.getByRole('region', { name: 'Gallery' }).element();
		expect(region.querySelectorAll('img')).toHaveLength(7);
		await expect.element(screen.getByRole('img', { name: 'Frame 8' })).not.toBeInTheDocument();
	});

	it('with motion allowed, enhances to the sticky stage', async () => {
		motion.reduced.current = false;
		const screen = render(ZoomGallery, { frames: frames(7), label: 'Gallery' });

		const region = screen.getByRole('region', { name: 'Gallery' });
		await expect.element(region).toHaveAttribute('data-mode', 'zoom');
		const stage = region.element().querySelector('.zg__stage') as HTMLElement;
		expect(getComputedStyle(stage).position).toBe('sticky');
	});

	it('stays static below three frames even when motion is allowed', async () => {
		motion.reduced.current = false;
		const screen = render(ZoomGallery, { frames: frames(2), label: 'Gallery' });

		await expect
			.element(screen.getByRole('region', { name: 'Gallery' }))
			.toHaveAttribute('data-mode', 'static');
	});
});
