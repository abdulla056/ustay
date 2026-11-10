import { describe, expect, it } from 'vitest';
import { MIN_PASSWORD_LENGTH, validateSignIn, validateSignUp } from './validate';

function form(fields: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [key, value] of Object.entries(fields)) fd.set(key, value);
	return fd;
}

describe('validateSignIn', () => {
	it('rejects empty fields with one message and keeps the typed email', () => {
		const result = validateSignIn(form({ email: '', password: '' }));
		expect(result).toEqual({
			ok: false,
			message: 'Enter your email and password.',
			values: { email: '' }
		});

		const noPassword = validateSignIn(form({ email: 'ana@ustay.test', password: '' }));
		expect(noPassword).toEqual({
			ok: false,
			message: 'Enter your email and password.',
			values: { email: 'ana@ustay.test' }
		});
	});

	it('trims the email but leaves the password untouched', () => {
		const result = validateSignIn(
			form({ email: '  ana@ustay.test ', password: ' pass ', redirectTo: '/dashboard' })
		);
		expect(result).toEqual({
			ok: true,
			data: { email: 'ana@ustay.test', password: ' pass ', redirectTo: '/dashboard' }
		});
	});

	it('treats a missing redirectTo as empty', () => {
		const result = validateSignIn(form({ email: 'a@b.c', password: 'x' }));
		expect(result.ok && result.data.redirectTo).toBe('');
	});
});

describe('validateSignUp', () => {
	it('requires all three fields', () => {
		const result = validateSignUp(
			form({ name: ' ', email: 'ana@ustay.test', password: 'longenough' })
		);
		expect(result).toEqual({
			ok: false,
			message: 'Enter your name, email and password.',
			values: { name: '', email: 'ana@ustay.test' }
		});
	});

	it('rejects a password shorter than the minimum', () => {
		const short = 'x'.repeat(MIN_PASSWORD_LENGTH - 1);
		const result = validateSignUp(form({ name: 'Ana', email: 'ana@ustay.test', password: short }));
		expect(result).toEqual({
			ok: false,
			message: 'Use at least 8 characters.',
			values: { name: 'Ana', email: 'ana@ustay.test' }
		});
	});

	it('accepts a password of exactly the minimum length and trims name and email', () => {
		const exact = 'x'.repeat(MIN_PASSWORD_LENGTH);
		const result = validateSignUp(
			form({ name: ' Ana ', email: ' ana@ustay.test ', password: exact, redirectTo: '/x' })
		);
		expect(result).toEqual({
			ok: true,
			data: { name: 'Ana', email: 'ana@ustay.test', password: exact, redirectTo: '/x' }
		});
	});
});
