<script lang="ts">
	// Full-screen photograph viewer, shared by every gallery variant.
	//
	// A native modal `<dialog>` (the NavMenu pattern): `showModal()` puts it in the top layer, makes
	// the page inert (the focus trap) and turns Esc into a `cancel` event. Scroll is locked with the shared
	// `lockScroll()`. Left/Right move between photographs, and
	// the neighbours are preloaded so a step never waits on the network. Focus returns to the opener
	// the parent passes in (never `document.activeElement`, which Safari does not set on click).
	//
	// Two-way contract: set `index` to open; clear it to close. Closing any other way (Esc, the
	// button, a tap outside the photograph) clears it for you.
	import { onDestroy } from 'svelte';
	import { lockScroll } from '$lib/motion';
	import type { GalleryFrame } from '$lib/features/gallery/types';

	type Props = {
		frames: GalleryFrame[];
		/** The frame on show; `null` while closed. Set it to open, the lightbox clears it on close. */
		index: number | null;
		/** The element to give focus back to on close. */
		opener?: HTMLElement | null;
		label?: string;
	};

	let { frames, index = $bindable(), opener = null, label = 'Photograph viewer' }: Props = $props();

	let dialog = $state<HTMLDialogElement>();
	let closeButton = $state<HTMLButtonElement>();
	let releaseScroll: (() => void) | undefined;

	const frame = $derived(index === null ? null : (frames[index] ?? null));
	const count = $derived(frames.length);

	$effect(() => {
		if (!dialog) return;
		if (index !== null && !dialog.open) {
			dialog.showModal();
			releaseScroll ??= lockScroll();
			closeButton?.focus();
		} else if (index === null && dialog.open) {
			dialog.close(); // runs `onclose`: scroll lock released, focus returned
		}
	});

	// Preload the neighbours of the frame on show.
	$effect(() => {
		if (index === null) return;
		if (count < 2) return;
		const neighbours = [(index - 1 + count) % count, (index + 1) % count].filter(
			(n, at, all) => n !== index && all.indexOf(n) === at
		);
		for (const i of neighbours) new Image().src = frames[i].src;
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
		releaseScroll = undefined;
		if (opener?.isConnected) opener.focus();
	}

	// Tap or click on the dark area (not the photograph, caption or a control) closes. Both the
	// press and the release must land there, so a drag-select that ends outside does not.
	let pressedOutside = false;
	const isOutside = (target: EventTarget | null) =>
		target instanceof Element && !target.closest('img, figcaption, button');
	function onpointerdown(event: PointerEvent) {
		pressedOutside = isOutside(event.target);
	}
	function onclick(event: MouseEvent) {
		if (pressedOutside && isOutside(event.target)) dialog?.close();
		pressedOutside = false;
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
	{onpointerdown}
	{onclick}
>
	<div class="flex h-full flex-col px-gutter py-5">
		<div class="flex items-center justify-between">
			<p
				aria-hidden="true"
				class="font-body text-label tracking-label text-content-muted tabular-nums"
			>
				{#if index !== null}{index + 1} / {count}{/if}
			</p>
			<!-- One announcement per step: position plus the caption, or the alt without one. -->
			<p class="sr-only" aria-live="polite">
				{#if frame && index !== null}Photo {index + 1} of {count}: {frame.caption ?? frame.alt}{/if}
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
					<p aria-hidden="true" class="mt-1 text-sm text-content-muted">{frame.alt}</p>
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
