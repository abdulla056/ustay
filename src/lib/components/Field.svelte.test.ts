import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Field from './Field.svelte';

const input = () => document.querySelector<HTMLInputElement>('input[name="email"]');
const label = () => document.querySelector<HTMLLabelElement>('label');

describe('Field', () => {
	it('links the label to the input', async () => {
		render(Field, { label: 'Email', name: 'email', type: 'email' });

		expect(label()?.htmlFor).not.toBe('');
		expect(input()?.id).toBe(label()?.htmlFor);
		expect(input()?.type).toBe('email');
	});

	it('marks the input invalid and describes it with the error', async () => {
		render(Field, { label: 'Email', name: 'email', error: 'Enter a valid email address.' });

		const describedBy = input()?.getAttribute('aria-describedby');
		expect(input()?.getAttribute('aria-invalid')).toBe('true');
		expect(describedBy).toBe(`${input()?.id}-msg`);
		expect(document.getElementById(describedBy ?? '')?.textContent).toBe(
			'Enter a valid email address.'
		);
	});

	it('describes the input with a hint but leaves it valid', async () => {
		render(Field, { label: 'Email', name: 'email', hint: 'We never share it.' });

		expect(input()?.hasAttribute('aria-invalid')).toBe(false);
		expect(
			document.getElementById(input()?.getAttribute('aria-describedby') ?? '')?.textContent
		).toBe('We never share it.');
	});
});
