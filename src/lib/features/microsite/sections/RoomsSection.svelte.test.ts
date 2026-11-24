import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import RoomsSection from './RoomsSection.svelte';

const photo = (alt: string) => ({
	src: '/prototype/misty-lake.jpg',
	alt,
	width: 2000,
	height: 1333
});

const room = (name: string, image: boolean) => ({
	name,
	description: `About ${name}`,
	maxGuests: 3,
	beds: [{ type: 'queen', count: 1 }],
	nightly: { amountMinor: 36000, currency: 'MYR' },
	image: image ? photo(name) : null,
	images: image ? [photo(name), photo(`${name} again`)] : [],
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
		await expect.poll(() => dialog.open).toBe(true);
		expect(dialog.matches(':modal')).toBe(true);
		await expect.poll(() => document.documentElement.style.overflow).toBe('hidden');
		expect(dialog.querySelectorAll('img')).toHaveLength(2);
		await expect.element(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
		await expect.element(screen.getByText('Bathtub')).toBeVisible();
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => dialog.open).toBe(false);
		await expect.poll(() => document.documentElement.style.overflow).not.toBe('hidden');
		await expect.element(opener).toHaveFocus();
	});

	it('does not close when a press starts inside and the click ends on the backdrop', async () => {
		const screen = render(RoomsSection, {
			data: { rooms: [room('Garden Room', true)] },
			variant: 'default'
		});
		await screen.getByRole('button', { name: 'Garden Room' }).click();
		const dialog = document.querySelector('dialog')!;
		await expect.poll(() => dialog.open).toBe(true);
		dialog.querySelector('h2')!.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		expect(dialog.open).toBe(true);
		dialog.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
		dialog.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await expect.poll(() => dialog.open).toBe(false);
	});
});
