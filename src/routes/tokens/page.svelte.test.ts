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
