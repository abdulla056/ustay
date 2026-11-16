import { describe, expect, it } from 'vitest';
import { SECTION_TYPES } from './registry';
import { sectionComponents } from './sections';

describe('section registry', () => {
	it('has a component for every section type, and nothing else', () => {
		expect(Object.keys(sectionComponents).sort()).toEqual([...SECTION_TYPES].sort());
		for (const type of SECTION_TYPES) expect(sectionComponents[type]).toBeTypeOf('function');
	});
});
