import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/test/db';
import { micrositeConfig, micrositeSection, property } from '$lib/server/db/schema';
import { findTemplate } from '$lib/microsite/registry';
import { insertProperty, PropertyNotFoundError } from '$lib/server/property/property.repo';
import {
	applyTemplate,
	getMicrositeConfig,
	getRenderableMicrosite,
	listSections,
	MicrositeSectionNotFoundError,
	MicrositeSectionOrderError,
	MicrositeValidationError,
	setMicrositeTheme,
	setSectionEnabled,
	setSectionOrder,
	setSectionVariant
} from './microsite.repo';

const base = { type: 'boutique', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' } as const;
const makeProperty = (name: string) => insertProperty({ ...base, name });
const ABSENT = '00000000-0000-4000-8000-000000000000';
const types = (rows: { type: string }[]) => rows.map((r) => r.type);

async function pgCode(promise: Promise<unknown>): Promise<string | undefined> {
	try {
		await promise;
	} catch (error) {
		const e = error as { code?: string; cause?: { code?: string } };
		return e.cause?.code ?? e.code;
	}
	return undefined;
}

describe('config and theme', () => {
	it('resolves to the defaults when the property has no row', async () => {
		const p = await makeProperty('Plain');
		const config = await getMicrositeConfig(p.id);
		expect(config.template.key).toBe('editorial');
		expect(config.accent).toMatchObject({ key: 'forest', light: '#5C6B52' });
		expect(config.font.key).toBe('editorial');
		expect((await getMicrositeConfig('not-a-uuid')).template.key).toBe('editorial');
		expect((await getMicrositeConfig(ABSENT)).template.key).toBe('editorial');
	});

	it('sets a theme patch, keeping the keys not mentioned', async () => {
		const p = await makeProperty('Themed');
		await setMicrositeTheme(p.id, { accentKey: 'clay' });
		const second = await setMicrositeTheme(p.id, { templateKey: 'intimate' });
		expect(second.accent.key).toBe('clay');
		expect(second.template.key).toBe('intimate');
		expect(second.font.key).toBe('editorial');
		const rows = await db.select().from(micrositeConfig);
		expect(rows).toHaveLength(1);
	});

	it('strips unknown and undefined patch fields at runtime', async () => {
		const p = await makeProperty('Strip');
		const config = await setMicrositeTheme(p.id, {
			accentKey: undefined,
			propertyId: ABSENT,
			createdAt: new Date(0)
		} as never);
		expect(config.accent.key).toBe('forest');
		const [row] = await db.select().from(micrositeConfig);
		expect(row).toBeUndefined();
	});

	it('rejects keys the registry does not know, writing nothing', async () => {
		const p = await makeProperty('Bad keys');
		for (const patch of [{ templateKey: 'nope' }, { accentKey: 'nope' }, { fontKey: 'nope' }]) {
			await expect(setMicrositeTheme(p.id, patch)).rejects.toBeInstanceOf(MicrositeValidationError);
		}
		expect(await db.select().from(micrositeConfig)).toHaveLength(0);
	});

	it('throws PropertyNotFoundError for an unknown or malformed property', async () => {
		await expect(setMicrositeTheme(ABSENT, { accentKey: 'clay' })).rejects.toBeInstanceOf(
			PropertyNotFoundError
		);
		await expect(setMicrositeTheme('nope', { accentKey: 'clay' })).rejects.toBeInstanceOf(
			PropertyNotFoundError
		);
	});

	it('resolves an unknown or removed stored key to the default', async () => {
		const p = await makeProperty('Removed');
		await db.insert(micrositeConfig).values({
			propertyId: p.id,
			templateKey: 'retired-template',
			accentKey: 'retired-accent',
			fontKey: 'retired-font'
		});
		const config = await getMicrositeConfig(p.id);
		expect(config.template.key).toBe('editorial');
		expect(config.accent.key).toBe('forest');
		expect(config.font.key).toBe('editorial');
		const microsite = await getRenderableMicrosite(p.id);
		expect(microsite.sections.length).toBeGreaterThan(0);
	});
});

describe('applyTemplate and sections', () => {
	it('sets the template and creates its sections in order', async () => {
		const p = await makeProperty('Apply');
		const rows = await applyTemplate(p.id, 'intimate');
		expect(types(rows)).toEqual(findTemplate('intimate')!.sections.map((s) => s.type));
		expect(rows.map((r) => r.sortOrder)).toEqual(rows.map((_, i) => i));
		expect(rows.every((r) => r.enabled && r.variant === 'default')).toBe(true);
		expect((await getMicrositeConfig(p.id)).template.key).toBe('intimate');
	});

	it('replaces the existing list, discarding earlier edits', async () => {
		const p = await makeProperty('Replace');
		await applyTemplate(p.id, 'editorial');
		await setSectionEnabled(p.id, 'gallery', false);
		await setSectionVariant(p.id, 'gallery', 'zoom');
		await setSectionOrder(p.id, ['booking_cta']);
		const rows = await applyTemplate(p.id, 'intimate');
		expect(types(rows)).toEqual(findTemplate('intimate')!.sections.map((s) => s.type));
		expect(rows.every((r) => r.enabled && r.variant === 'default')).toBe(true);
		expect(await db.select().from(micrositeSection)).toHaveLength(rows.length);
	});

	it('rejects an unknown template and changes nothing', async () => {
		const p = await makeProperty('Unknown');
		await applyTemplate(p.id, 'editorial');
		await expect(applyTemplate(p.id, 'nope')).rejects.toBeInstanceOf(MicrositeValidationError);
		expect(await listSections(p.id)).toHaveLength(8);
		await expect(applyTemplate(ABSENT, 'editorial')).rejects.toBeInstanceOf(PropertyNotFoundError);
	});

	it('reorders: listed types first, the rest follow, duplicates collapse', async () => {
		const p = await makeProperty('Reorder');
		await applyTemplate(p.id, 'editorial');
		const rows = await setSectionOrder(p.id, ['booking_cta', 'rooms', 'booking_cta']);
		expect(types(rows).slice(0, 2)).toEqual(['booking_cta', 'rooms']);
		expect(types(rows).slice(2)).toEqual([
			'hero',
			'overview',
			'gallery',
			'amenities',
			'host_story',
			'location'
		]);
		expect(rows.map((r) => r.sortOrder)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
	});

	it('rejects a reorder naming a type the property lacks, changing nothing', async () => {
		const p = await makeProperty('Order error');
		await applyTemplate(p.id, 'intimate');
		const before = types(await listSections(p.id));
		await expect(setSectionOrder(p.id, ['hero', 'amenities'])).rejects.toBeInstanceOf(
			MicrositeSectionOrderError
		);
		await expect(setSectionOrder(p.id, ['bogus'])).rejects.toBeInstanceOf(
			MicrositeSectionOrderError
		);
		expect(types(await listSections(p.id))).toEqual(before);
		await expect(setSectionOrder(ABSENT, [])).rejects.toBeInstanceOf(PropertyNotFoundError);
	});

	it('enables and disables a section, and filters with enabledOnly', async () => {
		const p = await makeProperty('Toggle');
		await applyTemplate(p.id, 'editorial');
		const row = await setSectionEnabled(p.id, 'amenities', false);
		expect(row.enabled).toBe(false);
		expect(types(await listSections(p.id, { enabledOnly: true }))).not.toContain('amenities');
		expect(types(await listSections(p.id))).toContain('amenities');
		expect((await setSectionEnabled(p.id, 'amenities', true)).enabled).toBe(true);
	});

	it('validates type, flag and existence on enable/disable', async () => {
		const p = await makeProperty('Toggle errors');
		await expect(setSectionEnabled(p.id, 'hero', false)).rejects.toBeInstanceOf(
			MicrositeSectionNotFoundError
		);
		await applyTemplate(p.id, 'intimate');
		await expect(setSectionEnabled(p.id, 'amenities', false)).rejects.toBeInstanceOf(
			MicrositeSectionNotFoundError
		);
		await expect(setSectionEnabled(p.id, 'bogus', false)).rejects.toBeInstanceOf(
			MicrositeValidationError
		);
		await expect(setSectionEnabled(p.id, 'hero', 'yes' as never)).rejects.toBeInstanceOf(
			MicrositeValidationError
		);
		await expect(setSectionEnabled(ABSENT, 'hero', true)).rejects.toBeInstanceOf(
			PropertyNotFoundError
		);
	});

	it('validates the variant against the registry for that type', async () => {
		const p = await makeProperty('Variant');
		await applyTemplate(p.id, 'editorial');
		expect((await setSectionVariant(p.id, 'gallery', 'zoom')).variant).toBe('zoom');
		await expect(setSectionVariant(p.id, 'gallery', 'carousel')).rejects.toBeInstanceOf(
			MicrositeValidationError
		);
		await expect(setSectionVariant(p.id, 'hero', 'zoom')).rejects.toBeInstanceOf(
			MicrositeValidationError
		);
		const gallery = (await listSections(p.id)).find((s) => s.type === 'gallery');
		expect(gallery?.variant).toBe('zoom');
	});

	it('allows each section type at most once per property', async () => {
		const p = await makeProperty('Unique');
		await applyTemplate(p.id, 'editorial');
		expect(
			await pgCode(
				db.insert(micrositeSection).values({ propertyId: p.id, type: 'hero', sortOrder: 99 })
			)
		).toBe('23505');
		const other = await makeProperty('Other');
		await db.insert(micrositeSection).values({ propertyId: other.id, type: 'hero', sortOrder: 0 });
	});

	it('refuses a type outside the enum and a negative order at the database', async () => {
		const p = await makeProperty('Constraints');
		expect(
			await pgCode(
				db.insert(micrositeSection).values({ propertyId: p.id, type: 'spa' as never, sortOrder: 0 })
			)
		).toBe('22P02');
		expect(
			await pgCode(
				db.insert(micrositeSection).values({ propertyId: p.id, type: 'hero', sortOrder: -1 })
			)
		).toBe('23514');
	});
});

describe('getRenderableMicrosite', () => {
	it('falls back to the default template for a property with nothing stored', async () => {
		const p = await makeProperty('Fallback');
		const microsite = await getRenderableMicrosite(p.id);
		expect(microsite.template.key).toBe('editorial');
		expect(microsite.sections.map((s) => s.type)).toEqual(
			findTemplate('editorial')!.sections.map((s) => s.type)
		);
		expect((await getRenderableMicrosite('not-a-uuid')).sections).toHaveLength(8);
	});

	it('returns the theme and only enabled sections, in order, with variants', async () => {
		const p = await makeProperty('Renderable');
		await setMicrositeTheme(p.id, { accentKey: 'tide' });
		await applyTemplate(p.id, 'editorial');
		await setSectionVariant(p.id, 'gallery', 'grid');
		await setSectionEnabled(p.id, 'overview', false);
		await setSectionOrder(p.id, ['gallery']);
		const microsite = await getRenderableMicrosite(p.id);
		expect(microsite.accent.key).toBe('tide');
		expect(microsite.sections[0]).toEqual({ type: 'gallery', variant: 'grid' });
		expect(microsite.sections.map((s) => s.type)).not.toContain('overview');
		expect(microsite.sections).toHaveLength(7);
	});

	it('resolves a removed variant to default', async () => {
		const p = await makeProperty('Old variant');
		await applyTemplate(p.id, 'editorial');
		await db
			.update(micrositeSection)
			.set({ variant: 'retired' })
			.where(eq(micrositeSection.propertyId, p.id));
		const microsite = await getRenderableMicrosite(p.id);
		expect(microsite.sections.every((s) => s.variant === 'default')).toBe(true);
	});

	it('renders nothing, not the fallback, when the owner disabled every section', async () => {
		const p = await makeProperty('All off');
		const rows = await applyTemplate(p.id, 'intimate');
		for (const row of rows) await setSectionEnabled(p.id, row.type, false);
		expect((await getRenderableMicrosite(p.id)).sections).toEqual([]);
	});
});

describe('cascade', () => {
	it('deletes config and sections with the property', async () => {
		const p = await makeProperty('Cascade');
		await applyTemplate(p.id, 'editorial');
		await setMicrositeTheme(p.id, { accentKey: 'clay' });
		await db.delete(property).where(eq(property.id, p.id));
		expect(await db.select().from(micrositeConfig)).toHaveLength(0);
		expect(await db.select().from(micrositeSection)).toHaveLength(0);
	});
});
