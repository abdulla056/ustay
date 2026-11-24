import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MicrositeRenderer from './MicrositeRenderer.svelte';
import StubSection from './__fixtures__/StubSection.svelte';
import ThrowingSection from './__fixtures__/ThrowingSection.svelte';
import type { MicrositeView } from './types';

afterEach(() => vi.restoreAllMocks());

// The renderer only reads `view.sections` (type, variant, data); the stub components read `label`.
const viewOf = (...types: string[]) =>
	({
		sections: types.map((type) => ({ type, variant: 'default', data: { label: type } }))
	}) as unknown as MicrositeView;

const stubs = { hero: StubSection, rooms: StubSection, location: StubSection } as never;

describe('MicrositeRenderer', () => {
	it('renders sections in the order the view lists them', async () => {
		const screen = render(MicrositeRenderer, {
			view: viewOf('location', 'hero', 'rooms'),
			components: stubs
		});
		await expect.element(screen.getByText('hero')).toBeInTheDocument();
		const order = [...document.querySelectorAll('[data-section]')].map((n) =>
			n.getAttribute('data-section')
		);
		expect(order).toEqual(['location', 'hero', 'rooms']);
	});

	it('numbers editorial sections by position and skips hero and booking_cta', async () => {
		render(MicrositeRenderer, {
			view: viewOf('hero', 'overview', 'rooms', 'location', 'booking_cta'),
			components: {
				hero: StubSection,
				overview: StubSection,
				rooms: StubSection,
				location: StubSection,
				booking_cta: StubSection
			} as never
		});
		const numbers = [...document.querySelectorAll('[data-section]')].map((n) =>
			n.getAttribute('data-number')
		);
		expect(numbers).toEqual([null, '01', '02', '03', null]);
	});

	it('degrades one throwing section to nothing and keeps the rest', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const screen = render(MicrositeRenderer, {
			view: viewOf('hero', 'rooms', 'location'),
			components: { hero: StubSection, rooms: ThrowingSection, location: StubSection } as never
		});
		await expect.element(screen.getByText('location')).toBeInTheDocument();
		const order = [...document.querySelectorAll('[data-section]')].map((n) =>
			n.getAttribute('data-section')
		);
		expect(order).toEqual(['hero', 'location']);
		expect(document.body.textContent).not.toContain('never rendered');
	});
});
