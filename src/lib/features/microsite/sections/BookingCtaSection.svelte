<script lang="ts">
	// Closing invitation + request-to-stay form (UST-30). The form is a stub: it validates with
	// native constraints, shows inline errors, and on a valid submit shows a calm "Requests open
	// soon" notice. It persists nothing; Phase 6 wires it to `createBookingRequest`.
	// The root carries `id="booking"`, the anchor the hero CTA points at.
	import { onMount, tick } from 'svelte';
	import { Button, Container, Eyebrow, Field, Heading, Section, Stack, Text } from '$lib';
	import { reveal } from '$lib/motion';
	import { formatMoney, toIsoDate } from '../format';
	import type { SectionProps } from '../types';

	let { data }: SectionProps<'booking_cta'> = $props();

	let form = $state<HTMLFormElement>();
	// The guest's local date, set after hydration: the server clock (and zone) must not leak into
	// the markup, so SSR renders no `min`. Submit re-reads it.
	let today = $state('');
	onMount(() => {
		today = toIsoDate(new Date());
	});

	let checkIn = $state('');
	let errors = $state<Record<string, string>>({});
	let sent = $state(false);

	const control =
		'w-full border-0 border-b border-hairline-c bg-transparent py-3 font-body text-content transition-colors duration-300 ease-editorial outline-none focus:border-accent-c [color-scheme:dark]';
	const labelClass =
		'font-body text-eyebrow font-medium tracking-eyebrow text-content-muted uppercase';

	const input = (name: string) =>
		form?.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
	const value = (name: string) => input(name)?.value ?? '';

	function checkOutProblem(): string {
		const inV = value('checkIn');
		const outV = value('checkOut');
		return inV && outV && outV <= inV ? 'Check-out must be after check-in.' : '';
	}

	function partyProblem(): string {
		const total = (Number(value('adults')) || 0) + (Number(value('children')) || 0);
		return data.maxGuests !== null && total > data.maxGuests
			? `The house sleeps up to ${data.maxGuests} guests in total.`
			: '';
	}

	function setError(name: string, message: string) {
		errors = message
			? { ...errors, [name]: message }
			: Object.fromEntries(Object.entries(errors).filter(([key]) => key !== name));
	}

	function clear(name: string) {
		setError(name, '');
		sent = false;
	}

	// Editing either date re-checks the check-out relation, once an error is showing.
	function onCheckIn() {
		clear('checkIn');
		if (errors.checkOut) setError('checkOut', value('checkOut') ? checkOutProblem() : '');
	}

	function onCheckOut() {
		sent = false;
		if (errors.checkOut) setError('checkOut', checkOutProblem());
	}

	function onParty(name: 'adults' | 'children') {
		clear(name);
		if (errors.children) setError('children', partyProblem());
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!form) return;
		today = toIsoDate(new Date());
		input('checkIn')?.setCustomValidity(
			value('checkIn') && value('checkIn') < today ? 'Check-in cannot be in the past.' : ''
		);
		input('checkOut')?.setCustomValidity(checkOutProblem());
		input('children')?.setCustomValidity(partyProblem());
		const next: Record<string, string> = {};
		for (const el of Array.from(form.elements)) {
			if (
				(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
				el.name &&
				!el.validity.valid
			) {
				next[el.name] = el.validationMessage;
			}
		}
		errors = next;
		sent = Object.keys(next).length === 0;
		if (sent) {
			form.reset();
		} else {
			await tick();
			form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
		}
	}
</script>

<Section
	tone="inverse"
	aria-labelledby="booking-heading"
	space="lg"
	id="booking"
	tabindex={-1}
	class="outline-none focus-visible:outline focus-visible:-outline-offset-4 focus-visible:outline-accent-c"
	data-section="booking_cta"
>
	<Container size="wide">
		<div class="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
			<div {@attach reveal()}>
				<Stack gap="md" align="start">
					<Eyebrow tone="accent">Stay with us</Eyebrow>
					<Heading level={2} size="lg" id="booking-heading">Come and stay at {data.name}</Heading>
					<Text size="lead" tone="inherit">
						Tell us when you would like to arrive and who is travelling. We will reply in person.
					</Text>
					{#if data.fromPrice}
						<Text tone="muted">From {formatMoney(data.fromPrice)} a night.</Text>
					{/if}
				</Stack>
			</div>

			<form
				bind:this={form}
				novalidate
				onsubmit={submit}
				aria-label="Booking request form"
				{@attach reveal({ delay: 0.1 })}
			>
				<div class="grid gap-x-8 gap-y-8 sm:grid-cols-2">
					<Field
						label="Check-in"
						name="checkIn"
						type="date"
						required
						min={today || undefined}
						bind:value={checkIn}
						error={errors.checkIn}
						oninput={onCheckIn}
						class="[color-scheme:dark]"
					/>
					<Field
						label="Check-out"
						name="checkOut"
						type="date"
						required
						min={checkIn || today || undefined}
						error={errors.checkOut}
						oninput={onCheckOut}
						class="[color-scheme:dark]"
					/>
					<Field
						label="Adults"
						name="adults"
						type="number"
						inputmode="numeric"
						required
						min="1"
						max={data.maxGuests ?? undefined}
						value="2"
						error={errors.adults}
						oninput={() => onParty('adults')}
					/>
					<Field
						label="Children"
						name="children"
						type="number"
						inputmode="numeric"
						min="0"
						max={data.maxGuests ?? undefined}
						value="0"
						error={errors.children}
						oninput={() => onParty('children')}
					/>
					{#if data.rooms.length > 0}
						<div class="flex flex-col gap-2 sm:col-span-2">
							<label for="booking-room" class={labelClass}>Room (optional)</label>
							<select id="booking-room" name="room" class={control}>
								<option value="">No preference</option>
								{#each data.rooms as room (room.key)}
									<option value={room.key}>{room.name}</option>
								{/each}
							</select>
						</div>
					{/if}
					<Field
						label="Name"
						name="name"
						autocomplete="name"
						required
						error={errors.name}
						oninput={() => clear('name')}
					/>
					<Field
						label="Email"
						name="email"
						type="email"
						autocomplete="email"
						required
						error={errors.email}
						oninput={() => clear('email')}
					/>
					<div class="flex flex-col gap-2 sm:col-span-2">
						<label for="booking-message" class={labelClass}>Message (optional)</label>
						<textarea id="booking-message" name="message" rows="4" maxlength="2000" class={control}
						></textarea>
					</div>
				</div>

				<div class="mt-10 flex flex-wrap items-center gap-6">
					<Button type="submit">Request to stay</Button>
					<p role="status" class="font-body text-sm text-content-muted">
						{#if sent}Requests open soon. Nothing has been sent, and we have not kept your details.{/if}
					</p>
				</div>
			</form>
		</div>
	</Container>
</Section>
