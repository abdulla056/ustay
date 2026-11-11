<script lang="ts">
	// The mobile menu (UST-60) — the `Menu` toggle `Nav` shows below `md`, and the
	// full-screen editorial overlay it opens. Internal to `Nav`: it renders from the
	// same link list, so the bar and the menu can never disagree about the IA.
	//
	// ## The overlay mirrors the bar
	//
	// The overlay is a modal dialog, so everything outside it — the real bar included
	// — is out of reach while it is open. It therefore carries its own copy of the
	// bar's top row (mark, CTA, and `Close` exactly where `Menu` was). Visually the bar
	// never leaves: the ink panel wipes down over it, and the row underneath simply
	// reads as having turned to the inverse tone as the edge passed. That is the tonal
	// language the page already speaks, applied to a single gesture.
	//
	// The overlay is always the inverse (ink) tone, whatever the page tone. The bar's
	// own flip is untouched: it keeps following `pageTone` underneath, so when the
	// panel lifts the bar is already in whichever tone the scroll position calls for.
	//
	// ## Motion
	//
	// Pure CSS transitions on `--ease-editorial`, keyed off `data-open`: there is no
	// scroll position to scrub against, and a transition reverses cleanly mid-flight if
	// the visitor changes their mind, which a one-shot timeline does not. Open is the
	// orchestrated moment — a slow clip wipe, then the display-type lines rising out of
	// their masks one after another, each hairline drawing in with its line. Close is
	// quicker and plainer (lines sink, panel lifts): nobody wants to wait on an exit.
	// Under reduced motion it is a short opacity change and nothing moves.
	//
	// ## Accessibility
	//
	// Toggle: `aria-expanded` + `aria-controls`, and a name that says what it will do.
	// Panel: `role="dialog"` + `aria-modal`, `inert` and `visibility: hidden` while
	// closed (so it is out of the tab order and the accessibility tree, not merely out
	// of sight). Open moves focus to `Close`; Tab is trapped inside; Esc closes; focus
	// goes back to the toggle — except after a route change, where the router owns
	// focus and pulling it back to a toggle on the new page would be wrong.
	//
	// ## Scroll lock
	//
	// Lenis is stopped while open (it would otherwise keep scrolling the page under the
	// panel on wheel and touch), and the root gets `overflow: hidden` as well — the
	// whole lock when Lenis is off (reduced motion), a belt-and-braces one when it is
	// on. The panel is `data-lenis-prevent` so it can still scroll itself on a short
	// landscape phone.
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { onDestroy, tick } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { getSmoothScroller } from '$lib/motion';
	import Button from './Button.svelte';
	import Wordmark from './Wordmark.svelte';
	import { jumpToAnchor, type NavLink } from './nav';

	type Props = {
		links: readonly NavLink[];
		cta: NavLink | null;
		home: string;
		anchorOffset: number;
		/** The bar's own row classes, so the overlay's top row lands on the same pixels. */
		barClass: string;
	};

	let { links, cta, home, anchorOffset, barClass }: Props = $props();

	const menuId = $props.id();

	let open = $state(false);
	let toggle = $state<HTMLButtonElement>();
	let panel = $state<HTMLElement>();
	let closeButton = $state<HTMLButtonElement>();

	// Tailwind's `md`. Crossing it with the menu open (rotating a tablet) closes it:
	// the desktop bar has no toggle to close it with.
	const desktop = new MediaQuery('min-width: 48rem', false);

	let releaseScroll: (() => void) | undefined;

	function lockScroll() {
		if (releaseScroll) return;
		const root = document.documentElement;
		const previous = root.style.overflow;
		const lenis = getSmoothScroller();

		lenis?.stop();
		root.style.overflow = 'hidden';

		releaseScroll = () => {
			root.style.overflow = previous;
			lenis?.start();
			releaseScroll = undefined;
		};
	}

	async function show() {
		open = true;
		lockScroll();
		// The panel turns visible in the same frame `data-open` lands, so focus can
		// move as soon as the DOM has it.
		await tick();
		closeButton?.focus();
	}

	function close({ restoreFocus = true } = {}) {
		if (!open) return;
		open = false;
		// Synchronously, not in an effect: an anchor jump runs straight after this,
		// and a stopped Lenis ignores `scrollTo`.
		releaseScroll?.();
		if (restoreFocus) toggle?.focus();
	}

	/** A destination in the menu: anchors scroll in place, so the menu closes itself. */
	function follow(event: MouseEvent, href: string) {
		close({ restoreFocus: false });
		if (!jumpToAnchor(event, href, anchorOffset)) return;
		// No navigation happens, so nothing else will place focus.
		toggle?.focus();
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key !== 'Tab' || !panel) return;

		const focusable = Array.from(
			panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
		);
		const first = focusable.at(0);
		const last = focusable.at(-1);
		if (!first || !last) return;

		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	function onWindowKeydown(event: KeyboardEvent) {
		if (open && event.key === 'Escape') {
			event.preventDefault();
			close();
		}
	}

	// Anything that lands focus outside the dialog (a stray click on the page edge,
	// a script) is pulled back in, so the trap holds for pointer users too.
	function onfocusin(event: FocusEvent) {
		if (open && panel && event.target instanceof Node && !panel.contains(event.target)) {
			closeButton?.focus();
		}
	}

	afterNavigate(() => close({ restoreFocus: false }));

	$effect(() => {
		if (desktop.current) close({ restoreFocus: false });
	});

	onDestroy(() => releaseScroll?.());

	const current = (href: string) => (page.url.pathname === href ? ('page' as const) : undefined);

	const number = (index: number) => String(index + 1).padStart(2, '0');

	// A small label, but a full-size target: the pseudo-element pads the hit area out
	// to ~44px without making the bar any taller.
	const textButton =
		"relative cursor-pointer font-body text-label font-medium tracking-label uppercase transition-colors duration-700 ease-editorial after:absolute after:-inset-x-3 after:-inset-y-4 after:content-[''] hover:text-accent-c focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current motion-reduce:transition-none";
</script>

<svelte:window onkeydown={onWindowKeydown} />
<svelte:document {onfocusin} />

<!-- Both words stacked in one grid cell, only one visible: `Menu` and `Close` then
     share a width, so swapping one for the other never nudges the CTA beside it. -->
{#snippet word(shown: 'Menu' | 'Close')}
	<span aria-hidden="true" class="grid justify-items-end">
		{#each ['Menu', 'Close'] as text (text)}
			<span class={['col-start-1 row-start-1', text !== shown && 'invisible']}>{text}</span>
		{/each}
	</span>
{/snippet}

<button
	bind:this={toggle}
	type="button"
	class={[textButton, 'md:hidden']}
	aria-expanded={open}
	aria-controls={menuId}
	aria-label={open ? 'Close menu' : 'Open menu'}
	onclick={() => (open ? close() : show())}
>
	{@render word('Menu')}
</button>

<div
	bind:this={panel}
	id={menuId}
	role="dialog"
	aria-modal="true"
	aria-label="Menu"
	tabindex="-1"
	data-tone="inverse"
	data-open={open || undefined}
	data-lenis-prevent
	inert={!open}
	class="menu fixed inset-0 z-10 flex flex-col overflow-y-auto bg-surface text-content md:hidden"
	{onkeydown}
>
	<div class={barClass}>
		<Wordmark href={home} />

		<div class="flex items-center gap-6">
			{#if cta}
				{@const action = cta}
				<Button
					variant="outline"
					size="sm"
					href={action.href}
					onclick={(event: MouseEvent) => follow(event, action.href)}
				>
					{action.label}<span aria-hidden="true">↗</span>
				</Button>
			{/if}

			<button
				bind:this={closeButton}
				type="button"
				class={textButton}
				aria-label="Close menu"
				onclick={() => close()}
			>
				{@render word('Close')}
			</button>
		</div>
	</div>

	<!-- Bottom-weighted, like a contents page: the list sits low and lets the ink
	     field above it breathe. -->
	<nav aria-label="Primary" class="mt-auto px-gutter pt-16 pb-section-sm">
		<ul>
			{#each links as link, index (link.href)}
				<li class="item relative" style:--i={index}>
					<span aria-hidden="true" class="rule absolute inset-x-0 top-0 h-px bg-hairline-c"></span>
					<a
						href={link.href}
						aria-current={current(link.href)}
						onclick={(event) => follow(event, link.href)}
						class="group block overflow-hidden py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
					>
						<span class="line flex items-baseline gap-5">
							<span
								aria-hidden="true"
								class="w-6 shrink-0 font-body text-label font-medium tracking-label text-accent-c tabular-nums"
							>
								{number(index)}
							</span>
							<span
								class="font-display text-display-lg font-editorial tracking-display transition-colors duration-700 ease-editorial group-hover:text-accent-c motion-reduce:transition-none"
							>
								{link.label}
							</span>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	</nav>
</div>

<style>
	/* Timings are the motion language's, in CSS form: the panel wipe is about as slow
	   as `imageReveal`, the lines rise on `displayEntrance`'s duration and a slightly
	   tighter stagger (a list, not a headline). */
	.menu {
		--ease: var(--ease-editorial, cubic-bezier(0.16, 1, 0.3, 1));

		visibility: hidden;
		clip-path: inset(0 0 100% 0);
		/* Close: let the lines sink first, then lift the panel; hide once it's gone. */
		transition:
			clip-path 0.8s var(--ease) 0.15s,
			visibility 0s linear 0.95s;
	}

	.menu[data-open] {
		visibility: visible;
		clip-path: inset(0 0 0 0);
		transition:
			clip-path 1.1s var(--ease),
			visibility 0s;
	}

	.line {
		opacity: 0;
		transform: translateY(110%);
		transition:
			transform 0.5s var(--ease),
			opacity 0.35s linear;
	}

	[data-open] .line {
		opacity: 1;
		transform: none;
		transition:
			transform 1.15s var(--ease) calc(0.35s + var(--i) * 0.09s),
			opacity 0.7s linear calc(0.35s + var(--i) * 0.09s);
	}

	.rule {
		transform: scaleX(0);
		transform-origin: left;
		transition: transform 0.4s var(--ease);
	}

	[data-open] .rule {
		transform: none;
		transition: transform 1.3s var(--ease) calc(0.3s + var(--i) * 0.09s);
	}

	/* Reduced motion: a short crossfade of the whole panel; nothing travels. */
	@media (prefers-reduced-motion: reduce) {
		.menu {
			clip-path: none;
			opacity: 0;
			transition:
				opacity 0.25s linear,
				visibility 0s linear 0.25s;
		}

		.menu[data-open] {
			clip-path: none;
			opacity: 1;
			transition:
				opacity 0.25s linear,
				visibility 0s;
		}

		.line,
		[data-open] .line,
		.rule,
		[data-open] .rule {
			opacity: 1;
			transform: none;
			transition: none;
		}
	}
</style>
