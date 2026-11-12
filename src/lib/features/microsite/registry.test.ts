import { describe, expect, it } from 'vitest';
import {
	ACCENTS,
	DEFAULT_ACCENT_KEY,
	DEFAULT_FONT_KEY,
	DEFAULT_TEMPLATE_KEY,
	DEFAULT_VARIANT,
	FONTS,
	SECTION_TYPES,
	SECTION_VARIANTS,
	TEMPLATES,
	findAccent,
	findFont,
	findTemplate,
	isVariantOf,
	resolveAccent,
	resolveFont,
	resolveTemplate,
	resolveVariant
} from './registry';

/** Design tokens the accents are checked against (`src/routes/layout.css`). */
const PAPER = '#F4EFE6';
const INK = '#0B0F0E';

function luminance(hex: string): number {
	const [r, g, b] = [1, 3, 5]
		.map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
		.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio. */
function contrast(a: string, b: string): number {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

describe('registry integrity', () => {
	it('has unique keys and the defaults exist', () => {
		for (const list of [TEMPLATES, ACCENTS, FONTS]) {
			const keys = list.map((x) => x.key);
			expect(new Set(keys).size).toBe(keys.length);
		}
		expect(findTemplate(DEFAULT_TEMPLATE_KEY)).toBeDefined();
		expect(findAccent(DEFAULT_ACCENT_KEY)).toBeDefined();
		expect(findFont(DEFAULT_FONT_KEY)).toBeDefined();
	});

	it('gives every section type a default variant first', () => {
		for (const type of SECTION_TYPES) {
			expect(SECTION_VARIANTS[type][0], type).toBe(DEFAULT_VARIANT);
		}
		expect(Object.keys(SECTION_VARIANTS).sort()).toEqual([...SECTION_TYPES].sort());
	});

	it('builds every template from valid section types and variants, with no duplicates', () => {
		for (const template of TEMPLATES) {
			const types = template.sections.map((s) => s.type);
			expect(new Set(types).size, template.key).toBe(types.length);
			for (const section of template.sections) {
				expect(SECTION_TYPES, template.key).toContain(section.type);
				expect(isVariantOf(section.type, section.variant), `${template.key}/${section.type}`).toBe(
					true
				);
			}
			expect(types[0], template.key).toBe('hero');
			expect(types.at(-1), template.key).toBe('booking_cta');
		}
	});

	it('orders the editorial and intimate templates as agreed', () => {
		expect(findTemplate('editorial')!.sections.map((s) => s.type)).toEqual([
			'hero',
			'overview',
			'gallery',
			'rooms',
			'amenities',
			'host_story',
			'location',
			'booking_cta'
		]);
		const intimate = findTemplate('intimate')!.sections.map((s) => s.type);
		expect(intimate[1]).toBe('host_story');
		expect(intimate).not.toContain('amenities');
	});

	it('keeps the default accent equal to the layout.css tokens', () => {
		expect(findAccent('forest')).toMatchObject({ light: '#5C6B52', dark: '#77876D' });
	});
});

describe('accent contrast (WCAG AA, 4.5:1)', () => {
	it.each(ACCENTS.map((a) => [a.key, a] as const))('%s', (_key, accent) => {
		expect(accent.light).toMatch(/^#[0-9A-F]{6}$/);
		expect(accent.dark).toMatch(/^#[0-9A-F]{6}$/);
		expect(contrast(accent.light, PAPER)).toBeGreaterThanOrEqual(4.5);
		expect(contrast(accent.dark, INK)).toBeGreaterThanOrEqual(4.5);
	});

	it('computes known ratios correctly', () => {
		expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
		expect(contrast('#5C6B52', PAPER)).toBeCloseTo(4.98, 1);
	});
});

describe('resolvers', () => {
	it('fall back to the default for an unknown or removed key', () => {
		expect(resolveTemplate('gone').key).toBe(DEFAULT_TEMPLATE_KEY);
		expect(resolveAccent(undefined).key).toBe(DEFAULT_ACCENT_KEY);
		expect(resolveFont(null).key).toBe(DEFAULT_FONT_KEY);
		expect(resolveTemplate('intimate').key).toBe('intimate');
	});

	it('falls back to the default variant', () => {
		expect(resolveVariant('gallery', 'zoom')).toBe('zoom');
		expect(resolveVariant('gallery', 'retired')).toBe(DEFAULT_VARIANT);
		expect(resolveVariant('hero', 'zoom')).toBe(DEFAULT_VARIANT);
	});
});
