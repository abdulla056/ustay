<script lang="ts">
	// The rooms (UST-25): an editorial, image-led list; each room opens a native modal
	// <dialog> with the full description, a larger photograph and the room's amenities.
	//
	// ## The dialog
	//
	// One shared <dialog> opened with `showModal()`, the pattern NavMenu uses: the top layer
	// makes the rest of the page inert (the focus trap), Esc is a `cancel`/`close` event, and the
	// browser returns focus to the opener. Scroll is locked by stopping Lenis and clipping the
	// root, released on close. A click on the backdrop (the dialog element itself) closes it.
	//
	// ## Without JavaScript
	//
	// Cards are plain content until hydration: the full description is shown and the name is
	// text, not a button. Once enhanced, the name becomes the button that stretches over the card
	// and the description is clamped.
	import { onDestroy, onMount, tick } from 'svelte';
	import { Container, Eyebrow, Heading, Image, Section, Stack, Text } from '$lib';
	import { objectPosition } from '$lib/features/gallery/layouts';
	import { lockScroll, reveal } from '$lib/motion';
	import { amenityIcon } from './amenities/icons';
	import { formatMoney } from '../format';
	import type { RoomView, SectionProps } from '../types';

	let { data }: SectionProps<'rooms'> = $props();

	const titleId = $props.id();

	let enhanced = $state(false);
	let selected = $state<RoomView>();
	let dialog = $state<HTMLDialogElement>();
	let closeButton = $state<HTMLButtonElement>();

	onMount(() => {
		enhanced = true;
	});

	const bedLabel = ({ type, count }: { type: string; count: number }) =>
		count === 1 ? `${type} bed` : `${count} ${type} beds`;

	const beds = (room: RoomView) => room.beds.map(bedLabel).join(' · ');
	const guests = (room: RoomView) => `Sleeps ${room.maxGuests}`;

	let unlockScroll: (() => void) | undefined;
	let opener: HTMLElement | undefined;
	// Set synchronously, before the first await, so a double click cannot open twice.
	let opening = false;

	async function open(room: RoomView, trigger: HTMLElement) {
		if (!dialog || dialog.open || opening) return;
		opening = true;
		opener = trigger;
		selected = room;
		await tick();
		opening = false;
		dialog.showModal();
		unlockScroll ??= lockScroll();
		dialog.scrollTop = 0;
		closeButton?.focus();
	}

	function onclose() {
		unlockScroll?.();
		unlockScroll = undefined;
		selected = undefined;
		// Explicit, like NavMenu: do not rely on the browser's own restore.
		opener?.focus();
		opener = undefined;
	}

	// Drag-selecting text inside the dialog and releasing over the backdrop must not close it:
	// both the press and the click have to land on the backdrop (the <dialog> itself).
	let pressedOnBackdrop = false;

	function onmousedown(event: MouseEvent) {
		pressedOnBackdrop = event.target === dialog;
	}

	function onclick(event: MouseEvent) {
		if (event.target === dialog && pressedOnBackdrop) dialog?.close();
		pressedOnBackdrop = false;
	}

	onDestroy(() => unlockScroll?.());
</script>

<svelte:head>
	<!-- Without JS the clamp and the reserved "View room" line would hide or mislead: undo both. -->
	<noscript>
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- a static literal, no user data -->
		{@html '<style>[data-section="rooms"] .room-desc{display:block;overflow:visible;-webkit-line-clamp:unset;line-clamp:unset}[data-section="rooms"] .room-cta{display:none}</style>'}
	</noscript>
</svelte:head>

<Section label="Rooms" space="md" data-section="rooms">
	<Container size="wide">
		<Stack gap="lg">
			<Stack gap="sm" {@attach reveal({ select: ':scope > *', stagger: 0.1 })}>
				<Eyebrow tone="accent">Where you sleep</Eyebrow>
				<Heading level={2} size="lg" tone="content">Rooms</Heading>
			</Stack>

			<div
				class="grid grid-cols-1 gap-x-gutter gap-y-16 md:grid-cols-2"
				{@attach reveal({ select: ':scope > article', stagger: 0.12 })}
			>
				{#each data.rooms as room, i (i)}
					<article class="group relative flex flex-col">
						{#if room.image}
							<Image
								src={room.image.src}
								alt={room.image.alt}
								width={room.image.width}
								height={room.image.height}
								style="object-position: {objectPosition(room.image)}"
								ratio="4/3"
								rounded="none"
								imgClass="transition-transform duration-[1400ms] ease-editorial group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
							/>
						{:else}
							<!-- No photograph: a composed typographic plate at the same proportions. -->
							<div
								aria-hidden="true"
								class="flex aspect-4/3 flex-col justify-between border border-hairline-c p-6"
							>
								<span
									class="font-body text-label font-medium tracking-label text-accent-c uppercase"
								>
									{String(i + 1).padStart(2, '0')}
								</span>
								<span class="font-display text-display-sm font-editorial tracking-display">
									{room.name}
								</span>
							</div>
						{/if}

						<div class="mt-6 flex items-baseline justify-between gap-6">
							<Heading level={3} size="sm" tone="content">
								{#if enhanced}
									<button
										type="button"
										aria-haspopup="dialog"
										class="cursor-pointer text-left transition-colors duration-700 ease-editorial group-hover:text-accent-c after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current motion-reduce:transition-none"
										onclick={(event) => open(room, event.currentTarget)}
									>
										{room.name}
									</button>
								{:else}
									{room.name}
								{/if}
							</Heading>
							<p class="relative z-10 shrink-0 font-body text-base tabular-nums">
								{formatMoney(room.nightly)}
								<span class="text-content-muted">a night</span>
							</p>
						</div>

						<Text size="sm" tone="muted" class="relative z-10 mt-2">
							{[guests(room), beds(room)].filter(Boolean).join(' · ')}
						</Text>

						{#if room.description}
							<Text size="sm" class="room-desc relative z-10 mt-3 line-clamp-3"
								>{room.description}</Text
							>
						{/if}

						<span
							aria-hidden="true"
							class={[
								'room-cta mt-4 font-body text-label font-medium tracking-label text-accent-c uppercase',
								!enhanced && 'invisible'
							]}
						>
							View room
						</span>
					</article>
				{/each}
			</div>
		</Stack>
	</Container>

	<dialog
		bind:this={dialog}
		aria-labelledby={titleId}
		class="fixed inset-0 m-auto max-h-[92dvh] w-[min(100%-1.5rem,56rem)] overflow-y-auto overscroll-contain border border-hairline-c bg-surface p-0 text-content backdrop:bg-black/60"
		data-lenis-prevent
		{onclose}
		{onclick}
		{onmousedown}
	>
		{#if selected}
			{@const room = selected}
			<div class="p-6 md:p-10">
				<div class="flex items-start justify-between gap-6">
					<Stack gap="sm">
						<Eyebrow tone="accent">{guests(room)}</Eyebrow>
						<Heading level={2} size="md" tone="content" id={titleId}>{room.name}</Heading>
					</Stack>
					<button
						bind:this={closeButton}
						type="button"
						class="relative cursor-pointer font-body text-label font-medium tracking-label uppercase transition-colors duration-700 ease-editorial after:absolute after:-inset-3 after:content-[''] hover:text-accent-c focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current motion-reduce:transition-none"
						onclick={() => dialog?.close()}
					>
						Close
					</button>
				</div>

				{#if room.images.length > 0}
					<div class="mt-8 grid gap-3 sm:grid-cols-2">
						{#each room.images as image, k (k)}
							<Image
								src={image.src}
								alt={image.alt}
								width={image.width}
								height={image.height}
								style="object-position: {objectPosition(image)}"
								ratio={k === 0 ? '16/9' : '4/3'}
								rounded="none"
								loading={k === 0 ? 'eager' : 'lazy'}
								class={k === 0 ? 'sm:col-span-2' : undefined}
							/>
						{/each}
					</div>
				{/if}

				<div class="mt-8 grid gap-10 md:grid-cols-[3fr_2fr]">
					<Stack gap="md">
						{#if room.description}
							<Text>{room.description}</Text>
						{/if}
						<Text size="sm" tone="muted">
							{[beds(room), `${formatMoney(room.nightly)} a night`].filter(Boolean).join(' · ')}
						</Text>
					</Stack>

					{#if room.amenities.length > 0}
						<div>
							<Eyebrow>In the room</Eyebrow>
							<ul class="mt-3 border-t border-hairline-c">
								{#each room.amenities as amenity, j (j)}
									{@const Icon = amenityIcon(amenity.icon)}
									<li
										class="flex items-center gap-3 border-b border-hairline-c py-3 font-body text-sm"
									>
										<Icon
											class="size-icon shrink-0 text-accent-c"
											strokeWidth={1.25}
											aria-hidden="true"
										/>
										{amenity.name}
									</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</dialog>
</Section>
