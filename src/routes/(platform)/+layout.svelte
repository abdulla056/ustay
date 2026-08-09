<script lang="ts">
	// The Ustay platform chrome (UST-46) and the mount point for the motion layer
	// (UST-51): the fixed nav, the momentum scroller, and the `<main>` the nav's skip
	// link targets.
	//
	// `smoothScroll()` is attached exactly once, here. Lenis owns the *document*
	// scroller, so a second instance anywhere below this would fight it for the same
	// scroll position. The attachment gates itself on `prefers-reduced-motion`, so a
	// visitor who asked for less motion simply gets the browser's own scrolling — the
	// layout does not need to branch.
	//
	// This layout persists across client-side navigation while the page inside it is
	// replaced, which is the whole reason `afterNavigate` has work to do: every
	// ScrollTrigger the outgoing page created was measured against a document that no
	// longer exists. `refreshMotion()` re-measures and re-seats the scroller.
	//
	// The tonal backdrop is deliberately **not** here. The *page* owns it
	// (`data-tonal-backdrop` + `tonalScroll()` on its first light section), because
	// only the page knows whether it opens on a dark hero and where it turns to paper.
	import { afterNavigate } from '$app/navigation';
	import { Nav } from '$lib';
	import { refreshMotion, smoothScroll } from '$lib/motion';

	const { children } = $props();

	// TEMPORARY (UST-46): the real information architecture is `platformNavLinks`, but
	// `/stays`, `/experiences`… do not exist yet, so every link would 404. Until those
	// routes land, the nav points into the placeholder home page's sections — which
	// also exercises the anchor path through `scrollTo()`. Phase 2 deletes both
	// overrides and renders `<Nav />` bare.
	const links = [
		{ label: 'The idea', href: '#idea' },
		{ label: 'Stays', href: '#stays' }
	];
	const cta = { label: 'Reserve', href: '#stays' };

	afterNavigate(({ from, to }) => {
		// A hash link or a same-page navigation has a scroll position of its own; only
		// a genuine page change should start at the top.
		const changedPage = from?.url.pathname !== to?.url.pathname;
		refreshMotion({ scrollTo: changedPage && !to?.url.hash ? 0 : false });
	});
</script>

<Nav {links} {cta} />

<!-- `overflow-x-clip` contains the edge-bleeding display type without adding a
     horizontal scrollbar for Lenis to inherit. -->
<div {@attach smoothScroll()} class="overflow-x-clip">
	<!-- `tabindex="-1"` so the skip link can actually put focus here, not merely
	     scroll to it. -->
	<main id="content" tabindex="-1" class="outline-none">{@render children()}</main>
</div>
