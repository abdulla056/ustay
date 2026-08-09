/**
 * The shape of a nav destination, and Ustay's own top-level information
 * architecture. Kept beside `Nav.svelte` rather than inside it so a route can
 * import the list without importing the component (and so the type is available
 * to callers — a Svelte instance script cannot export one).
 */

export type NavLink = {
	/** Visible text. Also the accessible name. */
	label: string;
	/** A route (`/stays`) or an in-page anchor (`#stays`), which `Nav` scrolls to. */
	href: string;
};

/**
 * The platform's top-level nav, from the art-direction prototype. `Nav` uses this
 * when it is given no `links`, so `<Nav />` is the real thing rather than an empty
 * bar; a microsite (or a page mid-build) passes its own list instead.
 */
export const platformNavLinks: readonly NavLink[] = [
	{ label: 'Stays', href: '/stays' },
	{ label: 'Experiences', href: '/experiences' },
	{ label: 'Journal', href: '/journal' },
	{ label: 'About', href: '/about' }
];
