import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import BookingCtaSection from './BookingCtaSection.svelte';

const data = {
	name: 'Rumah Kabus',
	fromPrice: { amountMinor: 28000, currency: 'MYR' },
	maxGuests: 8
};

const day = (n: number) => {
	const x = new Date();
	x.setDate(x.getDate() + n);
	return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

describe('BookingCtaSection', () => {
	it('is the #booking anchor with the price', async () => {
		const screen = render(BookingCtaSection, { data, variant: 'default' });
		const root = document.querySelector('[data-section="booking_cta"]');
		expect(root?.id).toBe('booking');
		await expect.element(screen.getByText(/From RM\s?280/)).toBeVisible();
	});

	it('shows inline errors for an empty submit and sends nothing', async () => {
		const screen = render(BookingCtaSection, { data, variant: 'default' });
		await screen.getByRole('button', { name: 'Request to stay' }).click();
		expect(document.querySelectorAll('[aria-invalid="true"]').length).toBeGreaterThanOrEqual(4);
		expect(document.querySelector('[role="status"]')?.textContent?.trim()).toBe('');
	});

	it('rejects check-out on or before check-in', async () => {
		const screen = render(BookingCtaSection, { data, variant: 'default' });
		await userEvent.fill(screen.getByLabelText('Check-in'), day(10));
		await userEvent.fill(screen.getByLabelText('Check-out'), day(10));
		await userEvent.fill(screen.getByLabelText('Name'), 'Ana');
		await userEvent.fill(screen.getByLabelText('Email'), 'ana@example.com');
		await screen.getByRole('button', { name: 'Request to stay' }).click();
		expect(document.getElementById('booking-checkout-msg')?.textContent).toMatch(/after|later/i);
	});

	it('shows the calm notice for a valid submit', async () => {
		const screen = render(BookingCtaSection, { data, variant: 'default' });
		await userEvent.fill(screen.getByLabelText('Check-in'), day(10));
		await userEvent.fill(screen.getByLabelText('Check-out'), day(12));
		await userEvent.fill(screen.getByLabelText('Name'), 'Ana');
		await userEvent.fill(screen.getByLabelText('Email'), 'ana@example.com');
		await screen.getByRole('button', { name: 'Request to stay' }).click();
		await expect.element(screen.getByText(/Requests open soon/)).toBeVisible();
		expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
	});
});
