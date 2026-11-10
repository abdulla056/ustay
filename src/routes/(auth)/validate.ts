/**
 * Pure form checks for `/sign-in` and `/sign-up` (UST-55).
 *
 * No `$env`, no `db`, no better-auth: these run before any credential reaches `auth.api.*`, so
 * they are unit-tested with no database and no request (`validate.test.ts`).
 *
 * Passwords are never trimmed (a leading or trailing space is part of the secret). Emails and
 * names are trimmed.
 */

/** Shortest password the sign-up form will send to better-auth. */
export const MIN_PASSWORD_LENGTH = 8;

export type Checked<Data, Values> =
	| { readonly ok: true; readonly data: Data }
	| { readonly ok: false; readonly message: string; readonly values: Values };

export type SignInData = { email: string; password: string; redirectTo: string };
export type SignInValues = { email: string };

export type SignUpData = { name: string; email: string; password: string; redirectTo: string };
export type SignUpValues = { name: string; email: string };

/** Reads a form field as text; a missing or non-text field becomes ''. */
function text(fd: FormData, key: string): string {
	const value = fd.get(key);
	return typeof value === 'string' ? value : '';
}

export function validateSignIn(fd: FormData): Checked<SignInData, SignInValues> {
	const email = text(fd, 'email').trim();
	const password = text(fd, 'password');
	const redirectTo = text(fd, 'redirectTo');

	if (!email || !password) {
		return { ok: false, message: 'Enter your email and password.', values: { email } };
	}
	return { ok: true, data: { email, password, redirectTo } };
}

export function validateSignUp(fd: FormData): Checked<SignUpData, SignUpValues> {
	const name = text(fd, 'name').trim();
	const email = text(fd, 'email').trim();
	const password = text(fd, 'password');
	const redirectTo = text(fd, 'redirectTo');
	const values = { name, email };

	if (!name || !email || !password) {
		return { ok: false, message: 'Enter your name, email and password.', values };
	}
	if (password.length < MIN_PASSWORD_LENGTH) {
		return { ok: false, message: 'Use at least 8 characters.', values };
	}
	return { ok: true, data: { name, email, password, redirectTo } };
}
