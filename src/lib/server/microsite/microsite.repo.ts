/**
 * Microsite repository (UST-17). The only module that talks Drizzle about `microsite_config` and
 * `microsite_section`: a property's template, accent, font and its ordered section list.
 * Conventions: `docs/ARCHITECTURE.md` and `docs/DATABASE.md`. The executor is the last param.
 *
 * The presets themselves live in `$lib/features/microsite/registry` (code). The database stores keys only;
 * writes validate keys against the registry, and reads resolve an unknown or removed key to the
 * default so a retired preset never breaks a live microsite. Writes lock the property row so
 * concurrent theme changes, template applies and reorders serialise.
 */
import { and, asc, eq, notInArray, sql } from 'drizzle-orm';
import { db, type Executor } from '$lib/server/db';
import { isUuid } from '$lib/server/db/helpers';
import { micrositeConfig, micrositeSection } from '$lib/server/db/schema';
import {
	findAccent,
	findFont,
	findTemplate,
	isSectionType,
	isVariantOf,
	resolveAccent,
	resolveFont,
	resolveTemplate,
	resolveVariant,
	SECTION_VARIANTS,
	type AccentSpec,
	type FontSpec,
	type SectionType,
	type TemplateSpec
} from '$lib/features/microsite/registry';
import { applyOrder } from '$lib/server/db/reorder';
import { findPropertyById, lockPropertyOrThrow } from '$lib/server/property/property.repo';
import { pick, type ErrorFactory } from '$lib/server/validate';

export type MicrositeSection = typeof micrositeSection.$inferSelect;

/** Patch for {@link setMicrositeTheme}. The template changes only through {@link applyTemplate}. */
export type MicrositeThemePatch = {
	accentKey?: string;
	fontKey?: string;
};

/** A property's resolved theme: stored keys already mapped to registry presets. */
export type MicrositeConfig = {
	template: TemplateSpec;
	accent: AccentSpec;
	font: FontSpec;
};

/** What the renderer needs: the resolved theme plus the enabled sections in order. */
export type RenderableMicrosite = MicrositeConfig & {
	sections: { type: SectionType; variant: string }[];
};

/** Thrown for input the types allow but the registry or data model does not. */
export class MicrositeValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'MicrositeValidationError';
	}
}

/** Thrown when a section type is not one of the property's sections. */
export class MicrositeSectionNotFoundError extends Error {
	constructor(
		readonly propertyId: string,
		readonly type: string
	) {
		super(`Property ${propertyId} has no ${type} section`);
		this.name = 'MicrositeSectionNotFoundError';
	}
}

/** Thrown when {@link setSectionOrder} is given types that are not all sections of the property. */
export class MicrositeSectionOrderError extends Error {
	constructor(
		readonly propertyId: string,
		readonly types: string[]
	) {
		super(`Section(s) ${types.join(', ')} do not belong to property ${propertyId}`);
		this.name = 'MicrositeSectionOrderError';
	}
}

const fail: ErrorFactory = (m) => new MicrositeValidationError(m);
const THEME_FIELDS = ['accentKey', 'fontKey'] as const;

function requireSectionType(type: unknown): SectionType {
	if (!isSectionType(type)) throw fail(`type must be a section type, got ${String(type)}`);
	return type;
}

function resolve(row?: { templateKey: string; accentKey: string; fontKey: string }) {
	return {
		template: resolveTemplate(row?.templateKey),
		accent: resolveAccent(row?.accentKey),
		font: resolveFont(row?.fontKey)
	};
}

/**
 * The property's resolved theme. Defaults when there is no row (or the id is malformed); an
 * unknown or removed key resolves to that preset's default.
 */
export async function getMicrositeConfig(
	propertyId: string,
	tx: Executor = db
): Promise<MicrositeConfig> {
	if (!isUuid(propertyId)) return resolve();
	const [row] = await tx
		.select()
		.from(micrositeConfig)
		.where(eq(micrositeConfig.propertyId, propertyId))
		.limit(1);
	return resolve(row);
}

/**
 * Change the property's accent and/or font key (a patch; `undefined` fields and unknown keys are
 * ignored). The template is not set here, because switching it must also replace the sections:
 * use {@link applyTemplate}. Passing `templateKey` is an error, not a silent no-op. Throws
 * {@link PropertyNotFoundError} or {@link MicrositeValidationError} for a key the registry does
 * not know.
 */
export async function setMicrositeTheme(
	propertyId: string,
	patch: MicrositeThemePatch,
	tx: Executor = db
) {
	if ((patch as { templateKey?: unknown } | null)?.templateKey !== undefined) {
		throw fail('templateKey cannot be set here; use applyTemplate');
	}
	const clean = pick(patch, THEME_FIELDS) as MicrositeThemePatch;
	if ('accentKey' in clean && !findAccent(clean.accentKey)) {
		throw fail(`Unknown accent ${String(clean.accentKey)}`);
	}
	if ('fontKey' in clean && !findFont(clean.fontKey)) {
		throw fail(`Unknown font ${String(clean.fontKey)}`);
	}
	return tx.transaction(async (inner) => {
		await lockPropertyOrThrow(propertyId, inner);
		if (Object.keys(clean).length > 0) {
			await inner
				.insert(micrositeConfig)
				.values({ ...clean, propertyId })
				.onConflictDoUpdate({
					target: micrositeConfig.propertyId,
					set: { ...clean, updatedAt: new Date() }
				});
		}
		return getMicrositeConfig(propertyId, inner);
	});
}

/** The property's sections in order; `enabledOnly` leaves out the disabled ones. */
export async function listSections(
	propertyId: string,
	options: { enabledOnly?: boolean } = {},
	tx: Executor = db
) {
	if (!isUuid(propertyId)) return [];
	return tx
		.select()
		.from(micrositeSection)
		.where(
			options.enabledOnly
				? and(eq(micrositeSection.propertyId, propertyId), eq(micrositeSection.enabled, true))
				: eq(micrositeSection.propertyId, propertyId)
		)
		.orderBy(asc(micrositeSection.sortOrder), asc(micrositeSection.type));
}

/**
 * Switch the property to a template: sets the template key and **replaces** the section list with
 * the template's defaults (all enabled, in the template's order), in one transaction with the
 * property locked. Sections of types the template keeps are updated in place (same ids, so
 * re-applying the same template changes no ids); the others are deleted. Throws {@link PropertyNotFoundError} or {@link MicrositeValidationError}.
 */
export async function applyTemplate(propertyId: string, templateKey: string, tx: Executor = db) {
	const template = findTemplate(templateKey);
	if (!template) throw fail(`Unknown template ${String(templateKey)}`);
	return tx.transaction(async (inner) => {
		await lockPropertyOrThrow(propertyId, inner);
		await inner
			.insert(micrositeConfig)
			.values({ propertyId, templateKey: template.key })
			.onConflictDoUpdate({
				target: micrositeConfig.propertyId,
				set: { templateKey: template.key, updatedAt: new Date() }
			});
		// Upsert so a type that stays keeps its id; the rest are removed.
		await inner.delete(micrositeSection).where(
			and(
				eq(micrositeSection.propertyId, propertyId),
				notInArray(
					micrositeSection.type,
					template.sections.map((section) => section.type)
				)
			)
		);
		await inner
			.insert(micrositeSection)
			.values(
				template.sections.map((section, index) => ({
					propertyId,
					type: section.type,
					variant: section.variant,
					sortOrder: index
				}))
			)
			.onConflictDoUpdate({
				target: [micrositeSection.propertyId, micrositeSection.type],
				set: {
					variant: sql`excluded.variant`,
					enabled: true,
					sortOrder: sql`excluded.sort_order`,
					updatedAt: new Date()
				}
			});
		return listSections(propertyId, {}, inner);
	});
}

/**
 * Reorder: the listed types take positions `0..n-1` in the order given (duplicates collapse to
 * their first position); sections not listed follow, in their current order. Locks the property
 * and writes every position in one statement. Throws {@link PropertyNotFoundError}, or
 * {@link MicrositeSectionOrderError} (changing nothing) if a type is not a section of this
 * property.
 */
export async function setSectionOrder(propertyId: string, types: string[], tx: Executor = db) {
	if (!Array.isArray(types) || types.some((type) => typeof type !== 'string')) {
		throw fail('types must be an array of strings');
	}
	return tx.transaction(async (inner) => {
		await lockPropertyOrThrow(propertyId, inner);
		const current = await listSections(propertyId, {}, inner);
		await applyOrder(inner, {
			table: 'microsite_section',
			keyColumn: 'type',
			scopeColumn: 'property_id',
			scopeId: propertyId,
			keyType: 'microsite_section_type',
			current: current.map((s) => s.type),
			requested: types,
			onForeign: (foreign) => new MicrositeSectionOrderError(propertyId, foreign)
		});
		return listSections(propertyId, {}, inner);
	});
}

/**
 * Enable or disable one section. Throws {@link PropertyNotFoundError},
 * {@link MicrositeValidationError} for a bad type or flag, or
 * {@link MicrositeSectionNotFoundError} if the property has no such section (apply a template
 * first).
 */
export async function setSectionEnabled(
	propertyId: string,
	type: string,
	enabled: boolean,
	tx: Executor = db
) {
	const sectionType = requireSectionType(type);
	if (typeof enabled !== 'boolean') throw fail('enabled must be a boolean');
	return updateSection(propertyId, sectionType, { enabled }, tx);
}

/**
 * Set a section's variant, which must be one the registry allows for that type. Throws
 * {@link PropertyNotFoundError}, {@link MicrositeValidationError} or
 * {@link MicrositeSectionNotFoundError}.
 */
export async function setSectionVariant(
	propertyId: string,
	type: string,
	variant: string,
	tx: Executor = db
) {
	const sectionType = requireSectionType(type);
	if (!isVariantOf(sectionType, variant)) {
		throw fail(
			`variant must be one of ${SECTION_VARIANTS[sectionType].join(', ')} for ${sectionType}`
		);
	}
	return updateSection(propertyId, sectionType, { variant }, tx);
}

async function updateSection(
	propertyId: string,
	type: SectionType,
	set: { enabled: boolean } | { variant: string },
	tx: Executor
) {
	return tx.transaction(async (inner) => {
		await lockPropertyOrThrow(propertyId, inner);
		const [row] = await inner
			.update(micrositeSection)
			.set(set)
			.where(and(eq(micrositeSection.propertyId, propertyId), eq(micrositeSection.type, type)))
			.returning();
		if (!row) throw new MicrositeSectionNotFoundError(propertyId, type);
		return row;
	});
}

/**
 * `undefined` for an unknown or malformed property. Otherwise exactly what the renderer needs: the resolved theme and the enabled sections in order, with
 * each variant resolved against the registry. A property with no sections falls back to its
 * resolved template's defaults (the default template when there is no config either).
 */
export async function getRenderableMicrosite(
	propertyId: string,
	tx: Executor = db
): Promise<RenderableMicrosite | undefined> {
	// One read-only snapshot, so the theme and the sections come from the same moment.
	return tx.transaction(
		async (inner) => {
			if (!(await findPropertyById(propertyId, inner))) return undefined;
			const config = await getMicrositeConfig(propertyId, inner);
			const all = await listSections(propertyId, {}, inner);
			const sections =
				all.length === 0
					? config.template.sections.map((s) => ({ type: s.type, variant: s.variant }))
					: all
							.filter((s) => s.enabled)
							.map((s) => ({ type: s.type, variant: resolveVariant(s.type, s.variant) }));
			return { ...config, sections };
		},
		{ isolationLevel: 'repeatable read', accessMode: 'read only' }
	);
}
