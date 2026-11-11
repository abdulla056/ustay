import { describe, expect, it, vi } from 'vitest';
import { render } from 'svelte/server';
import Nav from './Nav.svelte';

// Outside a SvelteKit request there is no router state to read; stand in for it.
vi.mock('$app/state', () => ({ page: { url: new URL('http://localhost/') } }));
vi.mock('$app/navigation', () => ({ afterNavigate: () => {} }));

// The server render is what a visitor gets before hydration, and all they get with
// JS off. The mobile menu's dialog cannot open then, so the `Menu` toggle must be a
// plain link somewhere useful rather than a dead button.

describe('Nav before hydration', () => {
	it('renders the Menu toggle as a link to the footer, not a button', () => {
		const { body } = render(Nav);

		expect(body).toMatch(/<a href="#site-footer"[^>]*>/);
		expect(body).not.toContain('aria-label="Open menu"');
	});

	it('omits the fallback when told to', () => {
		const { body } = render(Nav, { props: { menuFallback: null } });

		expect(body).not.toContain('#site-footer');
	});
});
