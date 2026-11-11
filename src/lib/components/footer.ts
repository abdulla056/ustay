/**
 * The shape of the footer's content. Kept beside `Footer.svelte` rather than inside
 * it so the type is available to callers (a Svelte instance script cannot export one)
 * and so a layout can build its groups without importing the component.
 *
 * Deliberately no default content: the footer is a domain-free primitive, and the
 * platform's own groups live with the `(platform)` layout that supplies them.
 */
import type { NavLink } from './nav';

export type FooterLinkGroup = {
	/** Visible heading for the group — also the accessible name of its `nav` landmark. */
	heading: string;
	links: readonly NavLink[];
};
