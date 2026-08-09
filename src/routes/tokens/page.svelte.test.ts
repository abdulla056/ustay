import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

// `/tokens` is the living reference for the design system, so the two properties that
// make it trustworthy are worth pinning: it paints nothing itself, and its dark band is
// a real tonal scope. Both were broken before UST-47 — the inverse heading carried
// `style="color: var(--color-accent)"`, which is 3.4:1 on ink.
describe('/tokens', () => {
	it('paints no colour of its own — every value comes from a token utility', async () => {
		const screen = await render(Page);

		expect(screen.container.querySelectorAll('[style]')).toHaveLength(0);
	});

	// UST-50: the numbered spine label is each band's heading, so it renders as
	// `Label as="h2"`. Before that, `Label` could only be a `p`/`span`/`div` and the
	// page had to pin an `id` on the label and point the band's `aria-labelledby` at
	// it — a named region with no heading in the outline at all.
	it('builds its outline out of the primitives — an h2 per band, no skipped levels', async () => {
		const screen = await render(Page);

		const levels = [...screen.container.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) =>
			Number(h.tagName[1])
		);

		expect(levels.filter((level) => level === 1)).toHaveLength(1);
		// One per numbered band, 01–07.
		expect(screen.container.querySelectorAll('h2')).toHaveLength(7);

		// Type specimens take `Heading as="p"`, so no decorative display line claims a
		// rung and the outline only ever steps down one level at a time.
		levels.slice(1).forEach((level, i) => expect(level - levels[i]).toBeLessThanOrEqual(1));

		// And the workaround the gap forced is gone.
		expect(screen.container.querySelectorAll('[aria-labelledby]')).toHaveLength(0);
	});

	it('resolves its inverse accent through a tone scope, not a hard-coded colour', async () => {
		const screen = await render(Page);

		// `<Section tone="inverse">` stamps the scope; `text-accent-c` then resolves to the
		// AA-safe `accent-on-dark` rather than the light-tone `accent`.
		const inverse = screen.container.querySelectorAll('[data-tone="inverse"]');
		expect(inverse.length).toBeGreaterThan(0);

		const scopedAccents = [...inverse].flatMap((band) => [
			...band.querySelectorAll('.text-accent-c')
		]);
		expect(scopedAccents.length).toBeGreaterThan(0);
	});
});
