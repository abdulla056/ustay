<script lang="ts">
	// The mobile menu (UST-60) — the `Menu` toggle `Nav` shows below `md`, and the
	// full-screen editorial overlay it opens. Internal to `Nav`: it renders from the
	// same link list, so the bar and the menu can never disagree about the IA.
	//
	// ## A native modal
	//
	// The overlay is a `<dialog>` opened with `showModal()`. That puts it in the top
	// layer — above every stacking context on the page, including the fixed header it
	// is declared in — makes the rest of the document inert (which is the focus trap,
	// for every kind of focus, with no hand-rolled Tab handling), and turns Esc into a
	// `cancel` event. Focus goes back to the toggle when it closes.
	//
	// ## The overlay mirrors the bar
	//
	// Everything outside a modal is out of reach, so the overlay carries its own copy
	// of the bar's top row (mark, CTA, and `Close` exactly where `Menu` was). Visually
	// the bar never leaves: the ink panel wipes down over it, and the row underneath
	// simply reads as having turned to the inverse tone as the edge passed.
	//
	// The overlay is always the inverse (ink) tone, whatever the page tone. The bar's
	// own flip is untouched: it keeps following `pageTone` underneath, so when the
	// panel lifts the bar is already in whichever tone the scroll position calls for.
	//
	// ## Motion
	//
	// CSS transitions on `--ease-editorial`, keyed off `data-open` on the dialog. Open
	// is the orchestrated moment — a slow clip wipe, then the display-type lines rising
	// out of their masks one after another, each hairline drawing in with its line.
	// Close is quicker and plainer (lines sink, panel lifts), and the dialog is only
	// actually closed once that exit has played — its length is read from the panel's
	// computed transition, so CSS stays the one place the timings live. Under reduced
	// motion it is a short opacity change and nothing moves.
	//
	// ## Scroll lock
	//
	// Lenis is stopped while open (its `lenis-stopped` class clips the root), and the
	// root also gets `overflow: hidden` — the whole lock when Lenis is off (reduced
	// motion). The panel scrolls itself on a short landscape phone: it is
	// `data-lenis-prevent` and `overscroll-behavior: contain`, so that scroll never
	// chains through to the page.
	//
	// ## Without JavaScript
	//
	// Until hydration (or with no JS at all) the toggle is a plain link to `fallback` —
	// the platform footer, whose index carries the site's links — and only becomes the
	// dialog's button once the dialog can actually be opened.
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { onDestroy, onMount, tick, untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { getSmoothScroller } from '$lib/motion';
	import NavCta from './NavCta.svelte';
	import Wordmark from './Wordmark.svelte';
	import { currentPage, isModifiedClick, jumpToAnchor, type NavLink } from './nav';

	type Props = {
		links: readonly NavLink[];
		cta: NavLink | null;
		home: string;
		anchorOffset: number;
		/** Where the toggle points before hydration / without JS. `null`: no toggle then. */
		fallback: string | null;
		/** The bar's own row classes, so the overlay's top row lands on the same pixels. */
		barClass: string;
	};

	let { links, cta, home, anchorOffset, fallback, barClass }: Props = $props();

	const menuId = $props.id();

	/** Hydrated: the toggle can open the dialog, so it stops being a fallback link. */
	let enhanced = $state(false);
	/** The dialog is showing (including while its exit plays) — `aria-expanded`. */
	let expanded = $state(false);
	/** Drives the motion: entering when set, exiting when cleared. */
	let entered = $state(false);
	let closing = false;

	let toggle = $state<HTMLButtonElement>();
	let dialog = $state<HTMLDialogElement>();
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

	function show() {
		if (!dialog || !panel || dialog.open) return;
		dialog.showModal();
		expanded = true;
		lockScroll();
		closeButton?.focus();
		// Commit the closed-state styles before `data-open` lands, or the panel would
		// render already open and there would be nothing to transition from.
		void panel.offsetHeight;
		entered = true;
	}

	/** Longest transition currently on the panel, in ms (duration + delay). */
	function exitDuration(element: HTMLElement): number {
		const style = getComputedStyle(element);
		const seconds = (list: string) => list.split(',').map((value) => parseFloat(value) || 0);
		const durations = seconds(style.transitionDuration);
		const delays = seconds(style.transitionDelay);
		return Math.max(0, ...durations.map((duration, i) => (duration + (delays[i] ?? 0)) * 1000));
	}

	/**
	 * Play the exit, then close the dialog. The scroll lock is released straight away
	 * — an anchor jump may run right after this, and a stopped Lenis ignores it — so
	 * the page can already be moving under the lifting panel.
	 */
	async function close({ restoreFocus = true } = {}) {
		if (!dialog?.open || closing || !panel) return;
		closing = true;
		entered = false;
		releaseScroll?.();

		await tick();
		const wait = exitDuration(panel);
		if (wait) await new Promise((resolve) => setTimeout(resolve, wait));

		const focused = document.activeElement;
		dialog.close();
		closing = false;

		if (restoreFocus) {
			toggle?.focus();
		} else if (document.activeElement === toggle) {
			// The dialog restores focus to its opener on its own. After a route change
			// the router has already placed focus on the new page; leave it there.
			if (focused instanceof HTMLElement && !dialog.contains(focused)) focused.focus();
			else toggle?.blur();
		}
	}

	/** Also runs when the browser closes the dialog itself (a repeated Esc). */
	function onclose() {
		expanded = false;
		entered = false;
		closing = false;
		releaseScroll?.();
	}

	function oncancel(event: Event) {
		// Esc: play the exit rather than vanish.
		event.preventDefault();
		void close();
	}

	/**
	 * A destination in the menu. Modified clicks keep their native meaning (a new
	 * tab) and leave the menu open. An anchor scrolls in place, so the menu closes
	 * itself. A route is left to the router: the menu closes in `afterNavigate`, so a
	 * failed or cancelled navigation leaves it open with focus where it was.
	 */
	function follow(event: MouseEvent, href: string) {
		if (isModifiedClick(event)) return;
		if (!href.startsWith('#')) return;
		void close();
		jumpToAnchor(event, href, anchorOffset);
	}

	afterNavigate(() => void close({ restoreFocus: false }));

	$effect(() => {
		if (desktop.current) untrack(() => void close({ restoreFocus: false }));
	});

	onMount(() => {
		enhanced = true;
	});

	onDestroy(() => releaseScroll?.());

	const number = (index: number) => String(index + 1).padStart(2, '0');

	// A small label, but a full-size target: the pseudo-element pads the hit area out
	// to ~44px without making the bar any taller.
	const textButton =
		"relative cursor-pointer font-body text-label font-medium tracking-label uppercase transition-colors duration-700 ease-editorial after:absolute after:-inset-x-3 after:-inset-y-4 after:content-[''] hover:text-accent-c focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current motion-reduce:transition-none";
</script>

<!-- Both words stacked in one grid cell, only one visible: `Menu` and `Close` then
     share a width, so swapping one for the other never nudges the CTA beside it. -->
{#snippet word(shown: 'Menu' | 'Close')}
	<span aria-hidden="true" class="grid justify-items-end">
		{#each ['Menu', 'Close'] as text (text)}
			<span class={['col-start-1 row-start-1', text !== shown && 'invisible']}>{text}</span>
		{/each}
	</span>
{/snippet}

{#if enhanced}
	<button
		bind:this={toggle}
		type="button"
		class={[textButton, 'md:hidden']}
		aria-haspopup="dialog"
		aria-expanded={expanded}
		aria-controls={menuId}
		aria-label="Open menu"
		onclick={show}
	>
		{@render word('Menu')}
	</button>
{:else if fallback}
	<a href={fallback} class={[textButton, 'md:hidden']}>{@render word('Menu')}</a>
{/if}

<dialog
	bind:this={dialog}
	id={menuId}
	aria-label="Menu"
	data-tone="inverse"
	data-open={entered || undefined}
	class="menu fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden border-0 bg-transparent p-0 text-content backdrop:bg-transparent"
	{oncancel}
	{onclose}
>
	<div
		bind:this={panel}
		data-lenis-prevent
		class="panel flex h-full flex-col overflow-y-auto overscroll-contain bg-surface"
	>
		<div class={barClass}>
			<Wordmark href={home} />

			<div class="flex items-center gap-6">
				{#if cta}
					{@const action = cta}
					<NavCta cta={action} onclick={(event) => follow(event, action.href)} />
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
					<li class="relative" style:--i={index}>
						<span aria-hidden="true" class="rule absolute inset-x-0 top-0 h-px bg-hairline-c"
						></span>
						<a
							href={link.href}
							aria-current={currentPage(link.href, page.url.pathname)}
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
</dialog>

<style>
	/* Timings are the motion language's, in CSS form: the panel wipe is about as slow
	   as `imageReveal`, the lines rise on `displayEntrance`'s duration and a slightly
	   tighter stagger (a list, not a headline). */
	.menu {
		--ease: var(--ease-editorial, cubic-bezier(0.16, 1, 0.3, 1));
	}

	.panel {
		clip-path: inset(0 0 100% 0);
		/* Close: let the lines sink first, then lift the panel. `close()` waits for
		   exactly this before closing the dialog. */
		transition: clip-path 0.8s var(--ease) 0.15s;
	}

	[data-open] .panel {
		clip-path: inset(0 0 0 0);
		transition: clip-path 1.1s var(--ease);
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
		.panel,
		[data-open] .panel {
			clip-path: none;
			opacity: 0;
			transition: opacity 0.25s linear;
		}

		[data-open] .panel {
			opacity: 1;
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
