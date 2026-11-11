import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { db } from '$lib/server/test/db';
import { property, propertySlugRedirect, room } from '$lib/server/db/schema';
import {
	findPropertyById,
	findPropertyBySlug,
	findRedirectedSlug,
	insertProperty,
	publishProperty,
	renameProperty
} from './property.repo';

const base = { type: 'boutique', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' } as const;

function make(name: string, extra: Partial<typeof property.$inferInsert> = {}) {
	return insertProperty({ ...base, name, ...extra });
}

async function redirectRows(propertyId: string) {
	return db
		.select()
		.from(propertySlugRedirect)
		.where(eq(propertySlugRedirect.propertyId, propertyId));
}

describe('insertProperty', () => {
	it('generates a slug from the name and defaults to draft', async () => {
		const p = await make('Riad El Fenn');
		expect(p.slug).toBe('riad-el-fenn');
		expect(p.status).toBe('draft');
		expect(p.publishedAt).toBeNull();
		expect(await findPropertyBySlug('riad-el-fenn')).toMatchObject({ id: p.id });
	});

	it('suffixes the slug when the name collides', async () => {
		const first = await make('Riad El Fenn');
		const second = await make('Riad El Fenn');
		expect(first.slug).toBe('riad-el-fenn');
		expect(second.slug).toMatch(/^riad-el-fenn-[0-9a-z]{6}$/);
	});
});

describe('renameProperty', () => {
	it('writes a redirect for the old slug, and findRedirectedSlug resolves it', async () => {
		const p = await make('Old Name');
		const renamed = await renameProperty(p.id, 'New Name');
		expect(renamed.slug).toBe('new-name');
		expect(renamed.name).toBe('New Name');
		expect(await redirectRows(p.id)).toHaveLength(1);
		expect(await findRedirectedSlug('old-name')).toBe('new-name');
		expect(await findRedirectedSlug('never-existed')).toBeUndefined();
	});

	it('renaming back restores the old slug and removes that redirect row', async () => {
		const p = await make('Old Name');
		await renameProperty(p.id, 'New Name');
		const back = await renameProperty(p.id, 'Old Name');
		expect(back.slug).toBe('old-name');
		const rows = await redirectRows(p.id);
		expect(rows.map((r) => r.oldSlug)).toEqual(['new-name']);
		expect(await findRedirectedSlug('old-name')).toBeUndefined();
		expect(await findRedirectedSlug('new-name')).toBe('old-name');
	});

	it('does not write a redirect when the slug is unchanged', async () => {
		const p = await make('Same Slug');
		const renamed = await renameProperty(p.id, 'Same  Slug!');
		expect(renamed.slug).toBe('same-slug');
		expect(await redirectRows(p.id)).toHaveLength(0);
	});

	it('never hands a retired slug to a different property', async () => {
		const a = await make('Old Name');
		await renameProperty(a.id, 'New Name');
		const b = await make('Old Name');
		expect(b.slug).not.toBe('old-name');
		expect(b.slug).toMatch(/^old-name-[0-9a-z]{6}$/);
		// The retired slug still points at the original property.
		expect(await findRedirectedSlug('old-name')).toBe('new-name');
	});

	it('throws for an unknown property', async () => {
		await expect(
			renameProperty('00000000-0000-0000-0000-000000000000', 'Anything')
		).rejects.toThrow(/not found/);
	});
});

describe('publishProperty', () => {
	it('sets status and publishedAt', async () => {
		const p = await make('Going Live');
		const published = await publishProperty(p.id);
		expect(published.status).toBe('published');
		expect(published.publishedAt).toBeInstanceOf(Date);
		expect((await findPropertyById(p.id))?.status).toBe('published');
	});
});

describe('currency check', () => {
	it.each(['myr', 'MYRR', 'MY', ''])('rejects %j', async (currency) => {
		await expect(make('Bad Currency', { currency })).rejects.toThrow();
		expect(await db.select().from(property)).toHaveLength(0);
	});
});

describe('cascade', () => {
	it('deleting a property deletes its redirects and rooms', async () => {
		const p = await make('Old Name');
		await renameProperty(p.id, 'New Name');
		await db.insert(room).values({
			propertyId: p.id,
			name: 'Suite',
			maxGuests: 2,
			nightlyRateMinor: 10000
		});
		await db.delete(property).where(eq(property.id, p.id));
		expect(await db.select().from(propertySlugRedirect)).toHaveLength(0);
		expect(await db.select().from(room)).toHaveLength(0);
	});
});
