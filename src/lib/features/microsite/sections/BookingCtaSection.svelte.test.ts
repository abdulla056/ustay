import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { toIsoDate } from '../format';
import BookingCtaSection from './BookingCtaSection.svelte';

const data = {
	name: 'Rumah Kabus',
	rooms: [
		{ key: 'r1', name: 'Garden Room' },
		{ key: 'r2', name: 'Loft' }
	],
	fromPrice: { amountMinor: 28000, currency: 'MYR' },
	maxGuests: 4
};

const day = (n: number) => toIsoDate(new Date(Date.now() + n * 86_400_000));

const active = () => document.activeElement as HTMLInputElement | null;
const msg = (name: string) =>
	document.getElementById(
		document.querySelector(`[name="${name}"]`)?.getAttribute('aria-describedby') ?? ''
	)?.textContent;

async function fillValid(screen: ReturnType<typeof render>) {
	await userEvent.fill(screen.getByLabelText('Check-in'), day(10));
	await userEvent.fill(screen.getByLabelText('Check-out'), day(12));
	await userEvent.fill(screen.getByLabelText('Name'), 'Ana');
	await userEvent.fill(screen.getByLabelText('Email'), 'ana@example.com');
}

describe('BookingCtaSection', () => {
	it('is the #booking anchor, labelled by its heading, with the price', async () => {
		const screen = render(BookingCtaSection, { data, variant: 'default' });
		const root = document.querySelector('[data-section="booking_cta"]');
		expect(root?.id).toBe('booking');
		await expect
			.element(screen.getByRole('region', { name: 'Come and stay at Rumah Kabus' }))
			.toBeVisible();
		await expect.element(screen.getByRole('form', { name: 'Booking request form' })).toBeVisible();
		await expect.element(screen.getByText(/From RM\s?280/)).toBeVisible();
	});

	it('shows inline errors and focuses the first invalid field on an empty submit', async () => {
		const screen = render(BookingCtaSection, { data, variant: 'default' });
		await screen.getByRole('button', { name: 'Request to stay' }).click();
		await expect.poll(() => active()?.name).toBe('checkIn');
		expect(document.querySelectorAll('[aria-invalid="true"]').length).toBeGreaterThanOrEqual(4);
		expect(document.querySelector('[role="status"]')?.textContent?.trim()).toBe('');
	});

	it('rejects check-out on or before check-in', async () => {
		const screen = render(BookingCtaSection, { data, variant: 'default' });
		await fillValid(screen);
		await userEvent.fill(screen.getByLabelText('Check-out'), day(10));
		await screen.getByRole('button', { name: 'Request to stay' }).click();
		expect(msg('checkOut')).toMatch(/after check-in/);
	});

	it('updates the check-out error when check-in is edited', async () => {
		const screen = render(BookingCtaSection, { data, variant: 'default' });
		await fillValid(screen);
		await userEvent.fill(screen.getByLabelText('Check-out'), day(10));
		await screen.getByRole('button', { name: 'Request to stay' }).click();
		expect(msg('checkOut')).toMatch(/after check-in/);
		await userEvent.fill(screen.getByLabelText('Check-in'), day(5));
		expect(document.querySelector('[name="checkOut"]')?.getAttribute('aria-invalid')).toBeNull();
	});

	it('rejects a party larger than the house sleeps', async () => {
		const screen = render(BookingCtaSection, { data, variant: 'default' });
		await fillValid(screen);
		await userEvent.fill(screen.getByLabelText('Adults'), '3');
		await userEvent.fill(screen.getByLabelText('Children'), '2');
		await screen.getByRole('button', { name: 'Request to stay' }).click();
		expect(msg('children')).toMatch(/up to 4 guests/);
		await expect.poll(() => active()?.name).toBe('children');
		await userEvent.fill(screen.getByLabelText('Children'), '1');
		expect(document.querySelector('[name="children"]')?.getAttribute('aria-invalid')).toBeNull();
	});

	it('offers the rooms, defaulting to no preference', async () => {
		render(BookingCtaSection, { data, variant: 'default' });
		const select = document.querySelector<HTMLSelectElement>('select[name="room"]');
		expect(select?.value).toBe('');
		expect(Array.from(select?.options ?? []).map((o) => o.text)).toEqual([
			'No preference',
			'Garden Room',
			'Loft'
		]);
	});

	it('omits the room select when there are no rooms', async () => {
		render(BookingCtaSection, { data: { ...data, rooms: [] }, variant: 'default' });
		expect(document.querySelector('select[name="room"]')).toBeNull();
	});

	it('shows the calm notice for a valid submit and clears the form', async () => {
		const screen = render(BookingCtaSection, { data, variant: 'default' });
		await fillValid(screen);
		await screen.getByRole('button', { name: 'Request to stay' }).click();
		await expect.element(screen.getByText(/Requests open soon/)).toBeVisible();
		expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
		expect((document.querySelector('[name="name"]') as HTMLInputElement).value).toBe('');
	});
});
