import { describe, expect, it } from 'vitest';
import { MAX_SLUG_LENGTH, randomSlugSuffix, slugify, uniqueSlug } from './slug';

describe('slugify()', () => {
	it('lowercases and hyphenates a property name', () => {
		expect(slugify('Riad El Fenn')).toBe('riad-el-fenn');
	});

	it('folds diacritics to their base letter', () => {
		expect(slugify('Château de Bagnols')).toBe('chateau-de-bagnols');
		expect(slugify('Hôtel Jérôme, Aspen')).toBe('hotel-jerome-aspen');
	});

	it('drops apostrophes instead of turning them into separators', () => {
		expect(slugify("Host's Villa")).toBe('hosts-villa');
		expect(slugify('Host’s Villa')).toBe('hosts-villa');
	});

	it('collapses runs of punctuation and whitespace into a single hyphen', () => {
		expect(slugify('  The Ranch — at   Rock Creek!! ')).toBe('the-ranch-at-rock-creek');
	});

	it('never leaves a leading or trailing hyphen', () => {
		expect(slugify('---Amangiri---')).toBe('amangiri');
	});

	it('truncates on a word boundary and respects a custom max length', () => {
		const long = slugify('The Extraordinarily Long Named Estate On The Hill', 20);
		expect(long).toBe('the-extraordinarily');
		expect(long.length).toBeLessThanOrEqual(20);
	});

	it('hard-truncates a single word longer than the limit', () => {
		expect(slugify('Abcdefghijklmnop', 8)).toBe('abcdefgh');
	});

	it('caps at MAX_SLUG_LENGTH by default', () => {
		expect(slugify('word '.repeat(40)).length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
	});

	it('returns an empty string when nothing transliterates', () => {
		expect(slugify('京都')).toBe('');
	});
});

describe('randomSlugSuffix()', () => {
	it('returns lowercase base36 of the requested length', () => {
		expect(randomSlugSuffix()).toMatch(/^[a-z0-9]{6}$/);
		expect(randomSlugSuffix(10)).toMatch(/^[a-z0-9]{10}$/);
	});

	it('does not repeat itself', () => {
		const suffixes = new Set(Array.from({ length: 50 }, () => randomSlugSuffix()));
		expect(suffixes.size).toBe(50);
	});
});

describe('uniqueSlug()', () => {
	it('uses the plain slug when it is free', async () => {
		expect(await uniqueSlug('Riad El Fenn', () => false)).toBe('riad-el-fenn');
	});

	it('appends a random suffix when the base is taken', async () => {
		const taken = new Set(['riad-el-fenn']);
		const value = await uniqueSlug('Riad El Fenn', (candidate) => taken.has(candidate));
		expect(value).toMatch(/^riad-el-fenn-[a-z0-9]{6}$/);
	});

	it('keeps trying until a candidate is free', async () => {
		let calls = 0;
		const value = await uniqueSlug('Amangiri', () => {
			calls += 1;
			return calls < 3;
		});
		expect(calls).toBe(3);
		expect(value).toMatch(/^amangiri-[a-z0-9]{6}$/);
	});

	it('accepts an async predicate, as a database lookup would be', async () => {
		expect(await uniqueSlug('Marrakech', async () => false)).toBe('marrakech');
	});

	it('falls back to a random slug when the name does not transliterate', async () => {
		expect(await uniqueSlug('京都', () => false)).toMatch(/^[a-z0-9]{8}$/);
	});

	it('throws rather than looping forever when every candidate is taken', async () => {
		await expect(uniqueSlug('Amangiri', () => true, { attempts: 2 })).rejects.toThrow(
			/after 2 attempts/
		);
	});
});
