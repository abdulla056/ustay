<script lang="ts">
	// The fixed platform nav — DESIGN.md layout principle #4: "Minimal fixed nav + a
	// single pill `Reserve`. Nav flips light→ink as the background shifts."
	//
	// ## It does not watch the scroll
	//
	// `tonalScroll()` (in `$lib/motion`) already knows where the dark→light dissolve
	// is, and publishes the result to `pageTone`. The nav reads that one value and lets
	// CSS carry the change, so the flip can never drift out of step with the dissolve
	// and there is no second scroll observer to keep in sync.
	//
	// The flip is done by stamping `data-tone` rather than by branching on colours:
	// that re-points the semantic vars from `layout.css`, so `text-content` means white
	// over the hero and ink over the paper sections, and `hover:text-accent-c` on a
	// link resolves to whichever olive holds AA in the tone it landed in. The nav
	// therefore never names a colour per tone — the token layer owns that.
	//
	// ## Legibility: the tonal scrim
	//
	// A transparent fixed bar has two different legibility problems, one per tone, and
	// the nav carries a **scrim** for each — a short gradient veil that fades out below
	// the bar, so nothing ever reads as a chrome strip with a hard edge.
	//
	//   - **Dark tone, over photography.** White-on-photograph is only as legible as
	//     the photograph allows: a blown-out sky behind a nav link is a contrast
	//     failure. The ink veil is 70% at the top and ≥60% everywhere the bar's text
	//     sits, which clears AA even against pure white — while staying sheer enough
	//     that the photograph still leads. It reads as a cinematic top vignette, which
	//     is the language the hero is already speaking.
	//   - **Light tone, over the editorial sections.** Contrast is not the issue there
	//     (ink on paper); *collision* is — body copy scrolls up behind the bar and
	//     lands on top of the links. The paper veil is opaque at the top, so it is
	//     invisible against the paper backdrop yet masks whatever passes under it, and
	//     content dissolves into the page edge instead of crashing into the nav.
	//
	// Blur was the obvious alternative and was rejected twice over: frosted glass is a
	// SaaS tell rather than an editorial one (DESIGN.md's anti-references), and it
	// softens the photograph the whole art direction is built around. A blend mode
	// cannot be made to guarantee AA over arbitrary mid-tones.
	//
	// The two veils crossfade rather than one veil recolouring, because `transition`
	// cannot interpolate a gradient — only its opacity.
	import { page } from '$app/state';
	import { pageTone, scrollTo, type Tone } from '$lib/motion';
	import Button from './Button.svelte';
	import Link from './Link.svelte';
	import Wordmark from './Wordmark.svelte';
	import { platformNavLinks, type NavLink } from './nav';

	type Props = {
		/** Top-level destinations. Defaults to `platformNavLinks`. */
		links?: readonly NavLink[];
		/** The outline pill. `null` renders no CTA. */
		cta?: NavLink | null;
		/** Where the wordmark points. */
		home?: string;
		/**
		 * Pin the tone instead of following `pageTone` — for a page with no tonal
		 * scroll, and for stories, which must not mutate a module-level singleton.
		 */
		tone?: Tone;
		/** Offset for in-page anchor jumps, so the target clears this bar. */
		anchorOffset?: number;
		/**
		 * The legibility veil behind the bar in the dark tone. Turn it off only for a
		 * nav that never sits over an image (it fades out in the light tone anyway).
		 */
		scrim?: boolean;
		/**
		 * Target for the skip link — the first thing a keyboard user reaches, since a
		 * fixed nav otherwise stands between them and the page on every load. `null`
		 * omits it; whoever renders the nav owns the matching `id`.
		 */
		skipTo?: string | null;
		class?: string;
	};

	let {
		links = platformNavLinks,
		cta = { label: 'Reserve', href: '/stays' },
		home = '/',
		tone: pinnedTone,
		anchorOffset = -96,
		scrim = true,
		skipTo = '#content',
		class: className
	}: Props = $props();

	const tone = $derived(pinnedTone ?? pageTone.current);

	// `inverse` is the dark scope: over the cinematic hero the nav is on ink, so it
	// wants the lifted dark-tone neutrals. `light` is the paper scope.
	const scope = $derived(tone === 'dark' ? 'inverse' : 'light');

	const current = (href: string) => (page.url.pathname === href ? ('page' as const) : undefined);

	/**
	 * In-page links keep a real `href` — deep links, middle-click and no-JS all still
	 * work — but are hijacked on a plain left click, because a native hash jump sets
	 * the scroll position behind Lenis's back and the momentum then fights it.
	 *
	 * The skip link is pointedly *not* routed through here: its job is to move focus,
	 * which only the browser's own hash navigation does.
	 */
	function jump(event: MouseEvent, href: string) {
		if (!href.startsWith('#') || event.defaultPrevented) return;
		// Leave modified clicks their native meaning (new tab, new window, download).
		if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

		event.preventDefault();
		scrollTo(href, { offset: anchorOffset });
	}

	// Density from the prototype: the bar is ~88px tall, which is what `anchorOffset`
	// and the scrim height are both sized against.
	const bar = 'relative flex items-center justify-between gap-6 px-gutter py-5 sm:py-6';

	// Tall enough that the bar sits entirely above the 62% gradient stop — so every
	// pixel of nav text has at least the `via` density beneath it, not the faded tail.
	const veil =
		'pointer-events-none absolute inset-x-0 top-0 h-36 transition-opacity duration-700 ease-editorial motion-reduce:transition-none sm:h-40';

	// Sheer, so the photograph still reads through it. 60% ink under white text is
	// ~4.9:1 against a pure-white pixel — the worst case a photograph can present.
	const inkVeil = 'bg-linear-to-b from-ink/70 via-ink/60 via-62% to-transparent';

	// Opaque at the top: invisible against the paper backdrop, but it hides the copy
	// scrolling underneath rather than letting it collide with the links.
	const paperVeil = 'bg-linear-to-b from-paper via-paper/88 via-62% to-transparent';
</script>

<header
	data-tone={scope}
	class={[
		'fixed inset-x-0 top-0 z-50 text-content',
		'transition-colors duration-700 ease-editorial motion-reduce:transition-none',
		className
	]}
>
	{#if scrim}
		<div
			aria-hidden="true"
			class={[veil, inkVeil, tone === 'dark' ? 'opacity-100' : 'opacity-0']}
		></div>
		<div
			aria-hidden="true"
			class={[veil, paperVeil, tone === 'dark' ? 'opacity-0' : 'opacity-100']}
		></div>
	{/if}

	<div class={bar}>
		{#if skipTo}
			<!--
				Out of flow until focused (that is what `sr-only` does), so it costs no
				layout until a keyboard user actually reaches it.
			-->
			<Link
				href={skipTo}
				variant="quiet"
				class="sr-only focus:not-sr-only focus:text-sm focus:font-medium focus:underline"
			>
				Skip to content
			</Link>
		{/if}

		<Wordmark href={home} />

		{#if links.length}
			<nav aria-label="Primary" class="hidden md:block">
				<ul class="flex items-center gap-9">
					{#each links as link (link.href)}
						<li>
							<Link
								href={link.href}
								variant="quiet"
								class="text-sm font-medium duration-700"
								aria-current={current(link.href)}
								onclick={(event: MouseEvent) => jump(event, link.href)}
							>
								{link.label}
							</Link>
						</li>
					{/each}
				</ul>
			</nav>
		{/if}

		{#if cta}
			{@const action = cta}
			<Button
				variant="outline"
				size="sm"
				href={action.href}
				class="duration-700"
				onclick={(event: MouseEvent) => jump(event, action.href)}
			>
				{action.label}<span aria-hidden="true">↗</span>
			</Button>
		{/if}
	</div>
</header>
