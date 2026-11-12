/**
 * Per-property microsite choices (UST-17): `microsite_config` (1:1, which template, accent and
 * font) and `microsite_section` (which sections, in which order, with which variant).
 *
 * The templates, accents, fonts and variants themselves live in code, in
 * `$lib/microsite/registry.ts`; keys are `text` here and validated in the repository, so adding or
 * retiring a preset never needs a migration. Section `type` is a closed enum tied to the Phase 2
 * section issues. No free-form settings: content comes from the domain tables.
 *
 * Conventions: `docs/DATABASE.md`. Relations live in `./relations`.
 */
import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgEnum, pgTable, text, unique } from 'drizzle-orm/pg-core';
import {
	DEFAULT_ACCENT_KEY,
	DEFAULT_FONT_KEY,
	DEFAULT_TEMPLATE_KEY,
	DEFAULT_VARIANT,
	SECTION_TYPES
} from '../../microsite/registry';
import { id, timestamps, uuidRef } from './helpers';
import { property } from './property.schema';

export const micrositeSectionType = pgEnum('microsite_section_type', SECTION_TYPES);

export const micrositeConfig = pgTable('microsite_config', {
	propertyId: uuidRef('property_id')
		.primaryKey()
		.references(() => property.id, { onDelete: 'cascade' }),
	templateKey: text('template_key').notNull().default(DEFAULT_TEMPLATE_KEY),
	accentKey: text('accent_key').notNull().default(DEFAULT_ACCENT_KEY),
	fontKey: text('font_key').notNull().default(DEFAULT_FONT_KEY),
	...timestamps()
});

export const micrositeSection = pgTable(
	'microsite_section',
	{
		id: id(),
		propertyId: uuidRef('property_id')
			.notNull()
			.references(() => property.id, { onDelete: 'cascade' }),
		type: micrositeSectionType('type').notNull(),
		variant: text('variant').notNull().default(DEFAULT_VARIANT),
		enabled: boolean('enabled').notNull().default(true),
		sortOrder: integer('sort_order').notNull(),
		...timestamps()
	},
	(t) => [
		unique('microsite_section_property_id_type_unique').on(t.propertyId, t.type),
		check('microsite_section_sort_order_check', sql`${t.sortOrder} >= 0`),
		index('microsite_section_property_id_sort_order_idx').on(t.propertyId, t.sortOrder)
	]
);
