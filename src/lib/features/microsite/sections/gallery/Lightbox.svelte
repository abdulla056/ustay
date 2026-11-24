<script lang="ts">
	// Full-screen photograph viewer, shared by every gallery variant.
	//
	// A native modal `<dialog>` (the NavMenu pattern): `showModal()` puts it in the top layer, makes
	// the page inert (the focus trap) and turns Esc into a `cancel` event. Scroll is locked the same
	// way as the menu (Lenis stopped, root overflow hidden). Left/Right move between photographs, and
	// the neighbours are preloaded so a step never waits on the network. Focus returns to the opener.
	import { onDestroy } from 'svelte';
	import { getSmoothScroller } from '$lib/motion';
	import type { GalleryFrame } from '$lib/features/gallery/types';

	type Props = {
		frames: GalleryFrame[];
		/** The frame on show; `null` while closed. Set it to open, the lightbox clears it on close. */
		index: number | null;
		label?: string;
	};

	let { frames, index = $bindable(), label = 'Photograph viewer' }: Props = $props();

	let dialog = $state<HTMLDialogElement>();
	let closeButton = $state<HTMLButtonElement>();
	let opener: Element | null = null;
	let releaseScroll: (() => void) | undefined;

	const frame = $derived(index === null ? null : (frames[index] ?? null));
	const count = $derived(frames.length);

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

	$effect(() => {
		if (!dialog) return;
		if (index !== null && !dialog.open) {
			opener = document.activeElement;
			dialog.showModal();
			lockScroll();
			closeButton?.focus();
		}
	});

	// Preload the neighbours of the frame on show.
	$effect(() => {
		if (index === null) return;
		for (const by of [-1, 1]) {
			const neighbour = frames[(index + by + count) % count];
			if (neighbour) new Image().src = neighbour.src;
		}
	});

	function step(by: number) {
		if (index === null || count < 2) return;
		index = (index + by + count) % count;
	}

	function onkeydown(event: KeyboardEvent) {
		if (event.key === 'ArrowRight') {
			event.preventDefault();
			step(1);
		} else if (event.key === 'ArrowLeft') {
			event.preventDefault();
			step(-1);
		}
	}

	/** Runs for every close (button, Esc, backdrop). */
	function onclose() {
		index = null;
		releaseScroll?.();
		if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
		opener = null;
	}

	onDestroy(() => releaseScroll?.());

	const control =
		'cursor-pointer font-body text-label font-medium tracking-label uppercase transition-colors duration-500 ease-editorial hover:text-accent-c focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current motion-reduce:transition-none';
</script>

<dialog
	bind:this={dialog}
	aria-label={label}
	data-tone="inverse"
	data-lenis-prevent
	class="fixed inset-0 m-0 size-full max-h-none max-w-none border-0 bg-surface p-0 text-content"
	{onkeydown}
	{onclose}
>
	<div class="flex h-full flex-col px-gutter py-5">
		<div class="flex items-center justify-between">
			<p
				class="font-body text-label tracking-label text-content-muted tabular-nums"
				aria-live="polite"
			>
				{#if index !== null}{index + 1} / {count}{/if}
			</p>
			<button
				bind:this={closeButton}
				type="button"
				class={control}
				aria-label="Close viewer"
				onclick={() => dialog?.close()}
			>
				Close
			</button>
		</div>

		{#if frame}
			<figure class="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 py-4">
				{#key index}
					<img
						src={frame.src}
						alt={frame.alt}
						width={frame.width}
						height={frame.height}
						class="min-h-0 max-w-full flex-1 object-contain"
					/>
				{/key}
				<figcaption class="max-w-2xl text-center">
					{#if frame.caption}
						<p class="font-display text-display-xs">{frame.caption}</p>
					{/if}
					<p class="mt-1 text-sm text-content-muted">{frame.alt}</p>
				</figcaption>
			</figure>
		{/if}

		{#if count > 1}
			<div class="flex items-center justify-between">
				<button type="button" class={control} onclick={() => step(-1)}>
					<span aria-hidden="true">←</span> Previous
				</button>
				<button type="button" class={control} onclick={() => step(1)}>
					Next <span aria-hidden="true">→</span>
				</button>
			</div>
		{/if}
	</div>
</dialog>
