import { describe, expect, it } from 'vitest';
import { match } from './slug';
import { randomSlugSuffix, slugify } from '$lib/server/db/slug';

describe('slug param matcher', () => {
	it('accepts what slugify produces, with and without a collision suffix', () => {
		const base = slugify('Rumah Kabus — Cameron Highlands!');
		expect(match(base)).toBe(true);
		expect(match(`${base}-${randomSlugSuffix()}`)).toBe(true);
		expect(match(slugify('x'.repeat(200)) + '-' + randomSlugSuffix())).toBe(true);
	});

	it.each([
		'',
		'Rumah-Kabus',
		'a_b',
		'a--b',
		'-a',
		'a-',
		'a b',
		'a/b',
		'..',
		'a.b',
		'é',
		'x'.repeat(88)
	])('rejects %j', (value) => {
		expect(match(value)).toBe(false);
	});
});
