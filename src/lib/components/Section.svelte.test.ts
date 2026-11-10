import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Section from './Section.svelte';

// `tone` defaults to `surface`, so every band carries `data-tone="light"` — a hook
// that finds the element without depending on its tag.
const band = () => document.querySelector<HTMLElement>('[data-tone="light"]');

describe('Section landmark', () => {
	it('renders a plain div when it has no name', async () => {
		render(Section);

		expect(band()?.tagName).toBe('DIV');
		expect(document.querySelector('section')).toBeNull();
	});

	it('renders a section landmark when given a label', async () => {
		const screen = render(Section, { label: 'The idea' });

		expect(band()?.tagName).toBe('SECTION');
		await expect.element(screen.getByRole('region', { name: 'The idea' })).toBeInTheDocument();
	});

	it('renders a section landmark when named by aria-labelledby', async () => {
		render(Section, { 'aria-labelledby': 'missing-heading' });

		expect(band()?.tagName).toBe('SECTION');
	});
});
