<script lang="ts">
	// Closing invitation + request-to-stay form (UST-30). The form is a stub: it validates with
	// native constraints, shows inline errors, and on a valid submit shows a calm "Requests open
	// soon" notice. It persists nothing; Phase 6 wires it to `createBookingRequest`.
	// The root carries `id="booking"`, the anchor the hero CTA points at.
	import { Button, Container, Eyebrow, Field, Heading, Section, Stack, Text } from '$lib';
	import { reveal } from '$lib/motion';
	import { formatMoney } from '../format';
	import type { SectionProps } from '../types';

	let { data }: SectionProps<'booking_cta'> = $props();

	const toIso = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	const today = toIso(new Date());

	let checkIn = $state('');
	let checkOut = $state('');
	let errors = $state<Record<string, string>>({});
	let sent = $state(false);

	// Check-out can't precede check-in; "after" is enforced on submit.
	const minCheckOut = $derived(checkIn || today);

	const control =
		'w-full border-0 border-b border-hairline-c bg-transparent py-3 font-body text-content transition-colors duration-300 ease-editorial outline-none focus:border-accent-c [color-scheme:dark]';
	const labelClass =
		'font-body text-eyebrow font-medium tracking-eyebrow text-content-muted uppercase';

	function clear(name: string) {
		if (errors[name]) {
			errors = Object.fromEntries(Object.entries(errors).filter(([key]) => key !== name));
		}
		sent = false;
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const form = event.currentTarget as HTMLFormElement;
		const out = form.elements.namedItem('checkOut') as HTMLInputElement;
		out.setCustomValidity(
			checkIn && checkOut && checkOut <= checkIn ? 'Check-out must be after check-in.' : ''
		);
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
			checkIn = '';
			checkOut = '';
		} else {
			form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
		}
	}
</script>

<Section tone="inverse" label="Request to stay" space="lg" id="booking" data-section="booking_cta">
	<Container size="wide">
		<div class="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-20">
			<div {@attach reveal()}>
				<Stack gap="md" align="start">
					<Eyebrow tone="accent">Stay with us</Eyebrow>
					<Heading level={2} size="lg">Come and stay at {data.name}</Heading>
					<Text size="lead" tone="inherit">
						Tell us when you would like to arrive and who is travelling. We will reply in person.
					</Text>
					{#if data.fromPrice}
						<Text tone="muted">From {formatMoney(data.fromPrice)} a night.</Text>
					{/if}
				</Stack>
			</div>

			<form
				novalidate
				onsubmit={submit}
				aria-label="Request to stay"
				{@attach reveal({ delay: 0.1 })}
			>
				<div class="grid gap-x-8 gap-y-8 sm:grid-cols-2">
					<div class="flex flex-col gap-2">
						<label for="booking-checkin" class={labelClass}>Check-in</label>
						<input
							id="booking-checkin"
							name="checkIn"
							type="date"
							required
							min={today}
							bind:value={checkIn}
							oninput={() => clear('checkIn')}
							aria-invalid={errors.checkIn ? 'true' : undefined}
							aria-describedby={errors.checkIn ? 'booking-checkin-msg' : undefined}
							class={control}
						/>
						{#if errors.checkIn}
							<p id="booking-checkin-msg" class="font-body text-sm text-accent-c">
								{errors.checkIn}
							</p>
						{/if}
					</div>
					<div class="flex flex-col gap-2">
						<label for="booking-checkout" class={labelClass}>Check-out</label>
						<input
							id="booking-checkout"
							name="checkOut"
							type="date"
							required
							min={minCheckOut}
							bind:value={checkOut}
							oninput={() => clear('checkOut')}
							aria-invalid={errors.checkOut ? 'true' : undefined}
							aria-describedby={errors.checkOut ? 'booking-checkout-msg' : undefined}
							class={control}
						/>
						{#if errors.checkOut}
							<p id="booking-checkout-msg" class="font-body text-sm text-accent-c">
								{errors.checkOut}
							</p>
						{/if}
					</div>
					<div class="flex flex-col gap-2">
						<label for="booking-adults" class={labelClass}>Adults</label>
						<input
							id="booking-adults"
							name="adults"
							type="number"
							inputmode="numeric"
							required
							min="1"
							max={data.maxGuests ?? undefined}
							value="2"
							oninput={() => clear('adults')}
							aria-invalid={errors.adults ? 'true' : undefined}
							aria-describedby={errors.adults ? 'booking-adults-msg' : undefined}
							class={control}
						/>
						{#if errors.adults}
							<p id="booking-adults-msg" class="font-body text-sm text-accent-c">
								{errors.adults}
							</p>
						{/if}
					</div>
					<div class="flex flex-col gap-2">
						<label for="booking-children" class={labelClass}>Children</label>
						<input
							id="booking-children"
							name="children"
							type="number"
							inputmode="numeric"
							min="0"
							max={data.maxGuests ?? undefined}
							value="0"
							oninput={() => clear('children')}
							aria-invalid={errors.children ? 'true' : undefined}
							aria-describedby={errors.children ? 'booking-children-msg' : undefined}
							class={control}
						/>
						{#if errors.children}
							<p id="booking-children-msg" class="font-body text-sm text-accent-c">
								{errors.children}
							</p>
						{/if}
					</div>
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
