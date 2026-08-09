/**
 * Slug generation for Ustay's public URLs (`/stays/riad-el-fenn`, `/destinations/marrakech`).
 *
 * Slugs are stored, never derived at read time: renaming a property must not silently break
 * every link to it. See `docs/DATABASE.md` for the full strategy.
 */

/** Longest slug we generate, before any uniqueness suffix. */
export const MAX_SLUG_LENGTH = 80;

const SUFFIX_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Largest byte value that maps onto the 36-char alphabet without modulo bias (36 * 7 = 252). */
const UNBIASED_BYTE_LIMIT = 252;

/**
 * Turn a human name into a URL-safe slug: lowercase ASCII words joined by single hyphens.
 *
 * Diacritics are folded to their base letter (`Kandú` → `kandu`) and apostrophes are dropped
 * rather than becoming separators (`Host's Villa` → `hosts-villa`). Anything else non
 * alphanumeric collapses into one hyphen. Returns `''` for input with no transliterable
 * characters (e.g. a purely CJK name) — callers should use {@link uniqueSlug}, which falls back
 * to a random slug in that case.
 */
export function slugify(input: string, maxLength: number = MAX_SLUG_LENGTH): string {
	const ascii = input
		.normalize('NFKD')
		// Strip the combining marks that NFKD split off, so "é" → "e".
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/['\u2019\u02bc`]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	if (ascii.length <= maxLength) return ascii;

	// Truncate on a word boundary where possible, so we never cut a word in half.
	const cut = ascii.slice(0, maxLength);
	const lastHyphen = cut.lastIndexOf('-');
	return (lastHyphen > 0 ? cut.slice(0, lastHyphen) : cut).replace(/-+$/g, '');
}

/**
 * A short random suffix used to break slug collisions (`riad-el-fenn-7bq2xf`).
 *
 * Random rather than a `-2`, `-3` counter: a counter tells visitors how many similarly named
 * listings exist and needs a read-then-write to compute.
 */
export function randomSlugSuffix(length = 6): string {
	const bytes = new Uint8Array(length * 2);
	let suffix = '';

	while (suffix.length < length) {
		crypto.getRandomValues(bytes);
		for (const byte of bytes) {
			if (byte >= UNBIASED_BYTE_LIMIT) continue;
			suffix += SUFFIX_ALPHABET[byte % SUFFIX_ALPHABET.length];
			if (suffix.length === length) break;
		}
	}

	return suffix;
}

export interface UniqueSlugOptions {
	/** Max length of the base slug, before the collision suffix. */
	maxLength?: number;
	/** How many suffixed candidates to try before giving up. */
	attempts?: number;
}

/**
 * Resolve `input` to a slug that `isTaken` reports as free.
 *
 * `isTaken` is injected so this stays a pure function of its inputs and testable without a
 * database; in app code it is a `select` against the owning table:
 *
 * ```ts
 * const value = await uniqueSlug(name, async (candidate) => {
 * 	const [row] = await db
 * 		.select({ slug: property.slug })
 * 		.from(property)
 * 		.where(eq(property.slug, candidate))
 * 		.limit(1);
 * 	return row !== undefined;
 * });
 * ```
 *
 * This is advisory, not a guarantee: two concurrent writers can both see a free slug. The unique
 * constraint from `slug()` is the real defence — catch the unique-violation and call this again.
 */
export async function uniqueSlug(
	input: string,
	isTaken: (candidate: string) => boolean | Promise<boolean>,
	{ maxLength = MAX_SLUG_LENGTH, attempts = 5 }: UniqueSlugOptions = {}
): Promise<string> {
	const base = slugify(input, maxLength) || randomSlugSuffix(8);

	if (!(await isTaken(base))) return base;

	for (let attempt = 0; attempt < attempts; attempt++) {
		const candidate = `${base}-${randomSlugSuffix()}`;
		if (!(await isTaken(candidate))) return candidate;
	}

	throw new Error(`Could not find a free slug for "${input}" after ${attempts} attempts`);
}
