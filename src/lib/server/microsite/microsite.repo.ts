/**
 * Microsite repository (UST-17). The only module that talks Drizzle about `microsite_config` and
 * `microsite_section`: a property's template, accent, font and its ordered section list.
 * Conventions: `docs/ARCHITECTURE.md` and `docs/DATABASE.md`. The executor is the last param.
 *
 * The presets themselves live in `$lib/microsite/registry` (code). The database stores keys only;
 * writes validate keys against the registry, and reads resolve an unknown or removed key to the
 * default so a retired preset never breaks a live microsite. Writes lock the property row so
 * concurrent theme changes, template applies and reorders serialise.
 */
import { asc, eq, and, sql } from 'drizzle-orm';
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
} from '$lib/microsite/registry';
import { findPropertyById, PropertyNotFoundError } from '$lib/server/property/property.repo';
import { pick, type ErrorFactory } from '$lib/server/validate';

export type MicrositeSection = typeof micrositeSection.$inferSelect;

/** Patch for {@link setMicrositeTheme}. */
export type MicrositeThemePatch = {
	templateKey?: string;
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
const THEME_FIELDS = ['templateKey', 'accentKey', 'fontKey'] as const;

function requireSectionType(type: unknown): SectionType {
	if (!isSectionType(type)) throw fail(`type must be a section type, got ${String(type)}`);
	return type;
}

/** Lock the property, or throw {@link PropertyNotFoundError}. */
async function lockProperty(propertyId: string, tx: Executor) {
	if (!(await findPropertyById(propertyId, tx, { lock: true }))) {
		throw new PropertyNotFoundError(String(propertyId));
	}
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
 * Change the property's template, accent and/or font key (a patch; `undefined` fields and any
 * other keys are ignored). Does not touch the sections: use {@link applyTemplate} for that.
 * Throws {@link PropertyNotFoundError} or {@link MicrositeValidationError} for a key the registry
 * does not know.
 */
export async function setMicrositeTheme(
	propertyId: string,
	patch: MicrositeThemePatch,
	tx: Executor = db
) {
	const clean = pick(patch, THEME_FIELDS) as MicrositeThemePatch;
	if ('templateKey' in clean && !findTemplate(clean.templateKey)) {
		throw fail(`Unknown template ${String(clean.templateKey)}`);
	}
	if ('accentKey' in clean && !findAccent(clean.accentKey)) {
		throw fail(`Unknown accent ${String(clean.accentKey)}`);
	}
	if ('fontKey' in clean && !findFont(clean.fontKey)) {
		throw fail(`Unknown font ${String(clean.fontKey)}`);
	}
	return tx.transaction(async (inner) => {
		await lockProperty(propertyId, inner);
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
 * property locked. Throws {@link PropertyNotFoundError} or {@link MicrositeValidationError}.
 */
export async function applyTemplate(propertyId: string, templateKey: string, tx: Executor = db) {
	const template = findTemplate(templateKey);
	if (!template) throw fail(`Unknown template ${String(templateKey)}`);
	return tx.transaction(async (inner) => {
		await lockProperty(propertyId, inner);
		await inner
			.insert(micrositeConfig)
			.values({ propertyId, templateKey: template.key })
			.onConflictDoUpdate({
				target: micrositeConfig.propertyId,
				set: { templateKey: template.key, updatedAt: new Date() }
			});
		await inner.delete(micrositeSection).where(eq(micrositeSection.propertyId, propertyId));
		await inner.insert(micrositeSection).values(
			template.sections.map((section, index) => ({
				propertyId,
				type: section.type,
				variant: section.variant,
				sortOrder: index
			}))
		);
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
	const ordered = [...new Set(types)];
	return tx.transaction(async (inner) => {
		await lockProperty(propertyId, inner);
		const current = await listSections(propertyId, {}, inner);
		const known = new Set<string>(current.map((s) => s.type));
		const foreign = ordered.filter((type) => !known.has(type));
		if (foreign.length > 0) throw new MicrositeSectionOrderError(propertyId, foreign);
		const listed = new Set(ordered);
		const finalOrder = [...ordered, ...current.map((s) => s.type).filter((t) => !listed.has(t))];
		if (finalOrder.length > 0) {
			const typeArray = sql`ARRAY[${sql.join(
				finalOrder.map((type) => sql`${type}`),
				sql`, `
			)}]::microsite_section_type[]`;
			await inner.execute(
				sql`UPDATE microsite_section AS s SET sort_order = v.pos - 1, updated_at = now()
					FROM unnest(${typeArray}) WITH ORDINALITY AS v(type, pos)
					WHERE s.type = v.type AND s.property_id = ${propertyId}`
			);
		}
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
		await lockProperty(propertyId, inner);
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
 * Exactly what the renderer needs: the resolved theme and the enabled sections in order, with
 * each variant resolved against the registry. A property with no sections falls back to its
 * resolved template's defaults (the default template when there is no config either).
 */
export async function getRenderableMicrosite(
	propertyId: string,
	tx: Executor = db
): Promise<RenderableMicrosite> {
	const config = await getMicrositeConfig(propertyId, tx);
	const all = await listSections(propertyId, {}, tx);
	const sections =
		all.length === 0
			? config.template.sections.map((s) => ({ type: s.type, variant: s.variant }))
			: all
					.filter((s) => s.enabled)
					.map((s) => ({ type: s.type, variant: resolveVariant(s.type, s.variant) }));
	return { ...config, sections };
}
