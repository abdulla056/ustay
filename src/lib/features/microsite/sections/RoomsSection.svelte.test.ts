import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import RoomsSection from './RoomsSection.svelte';

const room = (name: string, image: boolean) => ({
	name,
	description: `About ${name}`,
	maxGuests: 3,
	beds: [{ type: 'queen', count: 1 }],
	nightly: { amountMinor: 36000, currency: 'MYR' },
	image: image
		? { src: '/prototype/misty-lake.jpg', alt: `${name} photo`, width: 2000, height: 1333 }
		: null,
	amenities: [{ name: 'Bathtub', icon: 'bathtub' }]
});

describe('RoomsSection', () => {
	it('renders a card per room, with a text-only card when there is no image', async () => {
		const screen = render(RoomsSection, {
			data: { rooms: [room('Garden Room', true), room('Loft', false)] },
			variant: 'default'
		});
		await expect.element(screen.getByText(/360/).first()).toBeVisible();
		expect(document.querySelectorAll('article img')).toHaveLength(1);
		expect(document.querySelectorAll('article')).toHaveLength(2);
	});

	it('opens a modal dialog, focuses close, and Esc closes and restores focus', async () => {
		const screen = render(RoomsSection, {
			data: { rooms: [room('Garden Room', true)] },
			variant: 'default'
		});
		const opener = screen.getByRole('button', { name: 'Garden Room' });
		await opener.click();
		const dialog = document.querySelector('dialog')!;
		expect(dialog.open).toBe(true);
		expect(dialog.matches(':modal')).toBe(true);
		expect(document.documentElement.style.overflow).toBe('hidden');
		await expect.element(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
		await expect.element(screen.getByText('Bathtub')).toBeVisible();
		await userEvent.keyboard('{Escape}');
		expect(dialog.open).toBe(false);
		expect(document.documentElement.style.overflow).not.toBe('hidden');
		await expect.element(opener).toHaveFocus();
	});
});
