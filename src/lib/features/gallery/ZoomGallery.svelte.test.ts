import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ZoomGallery from './ZoomGallery.svelte';
import type { GalleryFrame } from './types';

// The component gates on `prefers-reduced-motion` through `matchMedia`, so the
// tests stand in for the OS setting by spying on it (as the motion tests do).
function setReducedMotion(reduced: boolean): void {
	const query = {
		matches: reduced,
		media: '(prefers-reduced-motion: reduce)',
		addEventListener: () => {},
		removeEventListener: () => {}
	};
	vi.spyOn(window, 'matchMedia').mockReturnValue(query as unknown as MediaQueryList);
}

afterEach(() => vi.restoreAllMocks());

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
		setReducedMotion(true);
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
		setReducedMotion(true);
		const screen = render(ZoomGallery, {
			frames: [frame(1, { caption: 'First light' }), frame(2), frame(3)],
			label: 'Gallery'
		});

		await expect.element(screen.getByRole('img', { name: 'Frame 2' })).toBeInTheDocument();
		await expect.element(screen.getByText('First light')).toBeVisible();
	});

	it('uses focal points as object-position', async () => {
		setReducedMotion(true);
		const screen = render(ZoomGallery, {
			frames: [frame(1, { focalX: 0.2, focalY: 0.8 }), frame(2), frame(3)],
			label: 'Gallery'
		});

		const img = screen.getByRole('img', { name: 'Frame 1' }).element() as HTMLElement;
		expect(img.style.objectPosition).toBe('20% 80%');
	});

	it('clamps to the first seven frames', async () => {
		setReducedMotion(true);
		const screen = render(ZoomGallery, { frames: frames(10), label: 'Gallery' });

		const region = screen.getByRole('region', { name: 'Gallery' }).element();
		expect(region.querySelectorAll('img')).toHaveLength(7);
		await expect.element(screen.getByRole('img', { name: 'Frame 8' })).not.toBeInTheDocument();
	});

	it('with motion allowed, enhances to the sticky stage with every frame eager', async () => {
		setReducedMotion(false);
		const screen = render(ZoomGallery, { frames: frames(7), label: 'Gallery' });

		const region = screen.getByRole('region', { name: 'Gallery' });
		await expect.element(region).toHaveAttribute('data-mode', 'zoom');
		const section = region.element();
		const stage = section.querySelector('.zg__stage') as HTMLElement;
		expect(getComputedStyle(stage).position).toBe('sticky');
		for (const img of section.querySelectorAll('img')) expect(img.loading).toBe('eager');
	});

	it('stays static below three frames even when motion is allowed', async () => {
		setReducedMotion(false);
		// Control: three frames do enhance under the very same conditions, so the
		// two-frame assertion below can only pass because of the frame-count guard.
		const three = render(ZoomGallery, { frames: frames(3), label: 'Three' });
		await expect
			.element(three.getByRole('region', { name: 'Three' }))
			.toHaveAttribute('data-mode', 'zoom');

		const two = render(ZoomGallery, { frames: frames(2), label: 'Two' });
		const region = two.getByRole('region', { name: 'Two' });
		// Give the (would-be) enhancement every chance to happen before asserting.
		await new Promise((resolve) => setTimeout(resolve, 300));
		await expect.element(region).toHaveAttribute('data-mode', 'static');
	});
});
