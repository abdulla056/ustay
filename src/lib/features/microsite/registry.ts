/**
 * Microsite registry (UST-17): the curated templates, accent presets, font pairings and section
 * variants a property microsite can be assembled from. Pure data, no server imports, so the
 * server repository and the Phase 2 renderer (UST-22, UST-31) share one source of truth.
 *
 * Templates, accents and fonts map to code (components, tokens), so they live here and adding one
 * is a code change, not a migration. The database stores only a property's choices (keys), and
 * the read path resolves an unknown or removed key to the default (see `microsite.repo.ts`).
 *
 * PROVISIONAL: the accent palette is still awaiting the user's sign-off.
 */

/** Closed set of section types. Mirrors the `microsite_section_type` pgEnum (a test keeps them equal). */
export const SECTION_TYPES = [
	'hero',
	'overview',
	'gallery',
	'rooms',
	'amenities',
	'host_story',
	'location',
	'booking_cta'
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

/** Allowed variants per section type. The first entry is always `default`. */
export const SECTION_VARIANTS = {
	hero: ['default'],
	overview: ['default'],
	gallery: ['default', 'zoom', 'grid'],
	rooms: ['default'],
	amenities: ['default'],
	host_story: ['default'],
	location: ['default'],
	booking_cta: ['default']
} as const satisfies Record<SectionType, readonly string[]>;

export const DEFAULT_VARIANT = 'default';

export type SectionSpec = { type: SectionType; variant: string };

export type TemplateSpec = {
	key: string;
	name: string;
	description: string;
	/** Ordered default sections applied by `applyTemplate`. */
	sections: readonly SectionSpec[];
};

export type AccentSpec = {
	key: string;
	name: string;
	/** Accent on the light (paper) tone. At least 4.5:1 on `paper` (#F4EFE6). */
	light: string;
	/** Accent on the inverse (ink) tone. At least 4.5:1 on `ink` (#0B0F0E). */
	dark: string;
};

export type FontSpec = {
	key: string;
	name: string;
	display: string;
	body: string;
};

const s = (type: SectionType, variant = DEFAULT_VARIANT): SectionSpec => ({ type, variant });

export const TEMPLATES = [
	{
		key: 'editorial',
		name: 'Editorial',
		description: 'The full story: hero, rooms and amenities, then the host and the place.',
		sections: [
			s('hero'),
			s('overview'),
			s('gallery'),
			s('rooms'),
			s('amenities'),
			s('host_story'),
			s('location'),
			s('booking_cta')
		]
	},
	{
		key: 'intimate',
		name: 'Intimate',
		description: 'For small homestays: the host comes first, and amenities are left out.',
		sections: [
			s('hero'),
			s('host_story'),
			s('overview'),
			s('gallery'),
			s('rooms'),
			s('location'),
			s('booking_cta')
		]
	}
] as const satisfies readonly TemplateSpec[];

export const ACCENTS = [
	{ key: 'forest', name: 'Forest', light: '#5C6B52', dark: '#77876D' },
	{ key: 'clay', name: 'Clay', light: '#8A4B38', dark: '#C98A70' },
	{ key: 'tide', name: 'Tide', light: '#3F6577', dark: '#7FA6B8' }
] as const satisfies readonly AccentSpec[];

export const FONTS = [
	{
		key: 'editorial',
		name: 'Editorial',
		display: "'Fraunces Variable', ui-serif, Georgia, 'Times New Roman', serif",
		body: "'Inter Variable', ui-sans-serif, system-ui, sans-serif"
	}
] as const satisfies readonly FontSpec[];

export const DEFAULT_TEMPLATE_KEY = 'editorial';
export const DEFAULT_ACCENT_KEY = 'forest';
export const DEFAULT_FONT_KEY = 'editorial';

export const isSectionType = (value: unknown): value is SectionType =>
	typeof value === 'string' && (SECTION_TYPES as readonly string[]).includes(value);

export const isVariantOf = (type: SectionType, variant: unknown): boolean =>
	typeof variant === 'string' && (SECTION_VARIANTS[type] as readonly string[]).includes(variant);

export const findTemplate = (key: unknown): TemplateSpec | undefined =>
	TEMPLATES.find((t) => t.key === key);
export const findAccent = (key: unknown): AccentSpec | undefined =>
	ACCENTS.find((a) => a.key === key);
export const findFont = (key: unknown): FontSpec | undefined => FONTS.find((f) => f.key === key);

/** Resolve a stored key to a preset, falling back to the default for an unknown or removed key. */
export const resolveTemplate = (key: unknown): TemplateSpec =>
	findTemplate(key) ?? findTemplate(DEFAULT_TEMPLATE_KEY)!;
export const resolveAccent = (key: unknown): AccentSpec =>
	findAccent(key) ?? findAccent(DEFAULT_ACCENT_KEY)!;
export const resolveFont = (key: unknown): FontSpec => findFont(key) ?? findFont(DEFAULT_FONT_KEY)!;

/** A stored variant, or `default` when it is no longer allowed for the type. */
export const resolveVariant = (type: SectionType, variant: unknown): string =>
	isVariantOf(type, variant) ? (variant as string) : DEFAULT_VARIANT;
