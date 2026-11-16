import { describe, expect, it } from 'vitest';
import { displayName, FALLBACK_AUTHOR_NAME, MAX_NAME_LENGTH } from './display-name';

describe('displayName', () => {
	it('shortens to first name and last initial', () => {
		expect(displayName('Aisha Rahman')).toBe('Aisha R.');
		expect(displayName('  Ana  Maria  de la Cruz ')).toBe('Ana C.');
		expect(displayName('Cher')).toBe('Cher');
	});

	it('never leaks an email address and falls back to a neutral name', () => {
		expect(displayName('aisha@example.com')).toBe(FALLBACK_AUTHOR_NAME);
		expect(displayName('Aisha aisha@example.com')).toBe('Aisha');
		expect(displayName('   ')).toBe(FALLBACK_AUTHOR_NAME);
		expect(displayName('x'.repeat(MAX_NAME_LENGTH + 1))).toBe(FALLBACK_AUTHOR_NAME);
	});
});
