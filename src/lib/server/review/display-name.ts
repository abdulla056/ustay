/**
 * The public author name of a review (UST-19). Pure: no `$env` and no database import, so the
 * review repository and the seed script (which runs under plain `bun`) share one implementation.
 */

/** The longest author name a review stores. */
export const MAX_NAME_LENGTH = 200;

/** The neutral name used when a guest name cannot be shown safely. */
export const FALLBACK_AUTHOR_NAME = 'Guest';

/**
 * `Aisha Rahman` -> `Aisha R.`; a single name is kept. Any token containing `@` is dropped (a
 * guest may have typed their email as their name), and if nothing usable is left, or the result
 * is longer than the cap, it is {@link FALLBACK_AUTHOR_NAME}. The result is always non-blank,
 * within the cap and free of `@`, so the insert can never trip a CHECK.
 */
export function displayName(fullName: string): string {
	const parts = String(fullName ?? '')
		.split(/\s+/)
		.filter((part) => part !== '' && !part.includes('@'));
	if (parts.length === 0) return FALLBACK_AUTHOR_NAME;
	const name =
		parts.length < 2 ? parts[0] : `${parts[0]} ${[...parts[parts.length - 1]][0].toUpperCase()}.`;
	return name.length > MAX_NAME_LENGTH ? FALLBACK_AUTHOR_NAME : name;
}
