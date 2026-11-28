import { describe, expect, it } from 'vitest';
import { db } from '$lib/server/test/db';
import { destinationSlugRedirect } from '$lib/server/db/schema';
import {
	createDestination,
	deleteDestination,
	DestinationNotFoundError,
	DestinationValidationError,
	findDestinationById,
	findDestinationBySlug,
	findDestinationRedirectTarget,
	renameDestination
} from './destination.repo';

const make = (name: string, slug?: string) =>
	createDestination({ name, countryCode: 'MY', ...(slug ? { slug } : {}) });
const redirects = () => db.select().from(destinationSlugRedirect);

describe('renameDestination', () => {
	it('renames, writes a redirect for the old slug and resolves it', async () => {
		const d = await make('Langkawi');
		const row = await renameDestination(d.id, 'Pulau Langkawi');
		expect(row.name).toBe('Pulau Langkawi');
		expect(row.slug).toBe('pulau-langkawi');
		expect(await findDestinationRedirectTarget('langkawi')).toBe('pulau-langkawi');
		expect(await findDestinationRedirectTarget('pulau-langkawi')).toBeUndefined();
		expect(await findDestinationRedirectTarget('nope')).toBeUndefined();
	});

	it('honours and normalises an explicit newSlug', async () => {
		const d = await make('Langkawi');
		const row = await renameDestination(d.id, 'Langkawi Island', { newSlug: 'The Island!' });
		expect(row.slug).toBe('the-island');
		expect(await findDestinationRedirectTarget('langkawi')).toBe('the-island');
	});

	it('writes no redirect when only the name changes', async () => {
		const d = await make('Langkawi');
		const row = await renameDestination(d.id, 'Langkawi', { newSlug: 'langkawi' });
		expect(row.slug).toBe('langkawi');
		expect(await redirects()).toHaveLength(0);
	});

	it('chains: A -> B -> C resolves both A and B to C', async () => {
		const d = await make('Alpha');
		await renameDestination(d.id, 'Bravo');
		await renameDestination(d.id, 'Charlie');
		expect(await findDestinationRedirectTarget('alpha')).toBe('charlie');
		expect(await findDestinationRedirectTarget('bravo')).toBe('charlie');
		expect(await redirects()).toHaveLength(2);
	});

	it('renaming back to an own retired slug drops that redirect', async () => {
		const d = await make('Alpha');
		await renameDestination(d.id, 'Bravo');
		const row = await renameDestination(d.id, 'Alpha');
		expect(row.slug).toBe('alpha');
		expect(await findDestinationRedirectTarget('alpha')).toBeUndefined();
		expect(await findDestinationRedirectTarget('bravo')).toBe('alpha');
		expect(await redirects()).toHaveLength(1);
	});

	it('rejects another destination live slug with a typed error and changes nothing', async () => {
		const a = await make('Alpha');
		await make('Bravo');
		await expect(renameDestination(a.id, 'Bravo', { newSlug: 'bravo' })).rejects.toBeInstanceOf(
			DestinationValidationError
		);
		expect((await findDestinationById(a.id))?.slug).toBe('alpha');
		expect(await redirects()).toHaveLength(0);
	});

	it('rejects a retired slug owned by another destination', async () => {
		const a = await make('Alpha');
		const b = await make('Bravo');
		await renameDestination(a.id, 'Alpha Two');
		await expect(renameDestination(b.id, 'Alpha', { newSlug: 'alpha' })).rejects.toBeInstanceOf(
			DestinationValidationError
		);
		await expect(make('Alpha')).resolves.toMatchObject({ slug: expect.stringMatching(/^alpha-/) });
		await expect(make('X', 'alpha')).rejects.toBeInstanceOf(DestinationValidationError);
	});

	it('without an explicit slug, a name colliding with another destination gets a suffix', async () => {
		await make('Bravo');
		const a = await make('Alpha');
		const row = await renameDestination(a.id, 'Bravo');
		expect(row.slug).toMatch(/^bravo-[0-9a-z]{6}$/);
		expect(await findDestinationRedirectTarget('alpha')).toBe(row.slug);
	});

	it('rejects an empty slug, a blank name and a non-string slug', async () => {
		const a = await make('Alpha');
		await expect(renameDestination(a.id, 'Alpha', { newSlug: '!!!' })).rejects.toBeInstanceOf(
			DestinationValidationError
		);
		await expect(renameDestination(a.id, '   ')).rejects.toBeInstanceOf(DestinationValidationError);
		await expect(
			renameDestination(a.id, 'Alpha', { newSlug: 5 as unknown as string })
		).rejects.toBeInstanceOf(DestinationValidationError);
	});

	it('throws DestinationNotFoundError for unknown or malformed ids', async () => {
		await expect(renameDestination('nope', 'X')).rejects.toBeInstanceOf(DestinationNotFoundError);
		await expect(
			renameDestination('00000000-0000-4000-8000-000000000000', 'X')
		).rejects.toBeInstanceOf(DestinationNotFoundError);
	});

	it('concurrent renames to the same slug: one wins, the other gets a typed error', async () => {
		const a = await make('Alpha');
		const b = await make('Bravo');
		const results = await Promise.allSettled([
			renameDestination(a.id, 'Shared', { newSlug: 'shared' }),
			renameDestination(b.id, 'Shared', { newSlug: 'shared' })
		]);
		expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
		const failed = results.find((r) => r.status === 'rejected');
		expect((failed as PromiseRejectedResult).reason).toBeInstanceOf(DestinationValidationError);
		expect(await findDestinationBySlug('shared')).toBeDefined();
	});

	it('cascades redirects when the destination is deleted', async () => {
		const d = await make('Alpha');
		await renameDestination(d.id, 'Bravo');
		expect(await redirects()).toHaveLength(1);
		await deleteDestination(d.id);
		expect(await redirects()).toHaveLength(0);
		expect(await findDestinationRedirectTarget('alpha')).toBeUndefined();
	});
});
