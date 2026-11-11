/**
 * The shape of a nav destination, and Ustay's own top-level information
 * architecture. Kept beside `Nav.svelte` rather than inside it so a route can
 * import the list without importing the component (and so the type is available
 * to callers — a Svelte instance script cannot export one).
 */
import { scrollTo } from '$lib/motion';

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

/** `aria-current` for a nav destination: `page` when it is the page being shown. */
export function currentPage(href: string, pathname: string): 'page' | undefined {
	return href === pathname ? 'page' : undefined;
}

/**
 * A click that should keep the browser's own meaning — new tab, new window,
 * download, middle-click — rather than be handled by the nav.
 */
export function isModifiedClick(event: MouseEvent): boolean {
	return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0;
}

/**
 * Click handler for a nav destination, shared by the bar and the mobile menu.
 *
 * In-page links keep a real `href` — deep links, middle-click and no-JS all still
 * work — but are hijacked on a plain left click, because a native hash jump sets
 * the scroll position behind Lenis's back and the momentum then fights it.
 * Returns `true` when it took the click, so a caller can follow up (the mobile
 * menu closes itself, since no navigation will happen to close it).
 *
 * The target is looked up by id rather than as a selector, so an id that is not a
 * valid CSS selector (`#2026-retreats`) still works; and the click is only taken
 * once the target is known to exist — otherwise the browser's own jump runs.
 *
 * The skip link is pointedly *not* routed through here: its job is to move focus,
 * which only the browser's own hash navigation does.
 */
export function jumpToAnchor(event: MouseEvent, href: string, offset: number): boolean {
	if (!href.startsWith('#') || event.defaultPrevented || isModifiedClick(event)) return false;

	let target: HTMLElement | null = null;
	try {
		target = document.getElementById(decodeURIComponent(href.slice(1)));
	} catch {
		// Malformed percent-encoding: leave it to the browser.
	}
	if (!target) return false;

	event.preventDefault();
	scrollTo(target, { offset });
	return true;
}
