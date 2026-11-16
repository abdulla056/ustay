import { describe, expect, it } from 'vitest';
import { getTableColumns, getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { review, reviewSource, reviewStatus } from './review.schema';

const columns = getTableColumns(review);
const config = getTableConfig(review);

describe('review table shape', () => {
	it('uses a singular snake_case name', () => {
		expect(getTableName(review)).toBe('review');
	});

	it('has the agreed enums', () => {
		expect(reviewSource.enumValues).toEqual(['guest', 'imported']);
		expect(reviewStatus.enumValues).toEqual(['pending', 'published', 'rejected']);
	});

	it('requires property, source, rating, body, author name and status', () => {
		for (const key of ['propertyId', 'source', 'rating', 'body', 'authorName', 'status'] as const) {
			expect(columns[key].notNull, key).toBe(true);
		}
		expect(columns.status.default).toBe('pending');
	});

	it('leaves booking, origin, title, author, stay date, publish and reply nullable', () => {
		for (const key of [
			'bookingRequestId',
			'origin',
			'title',
			'authorUserId',
			'stayedOn',
			'publishedAt',
			'hostReply',
			'hostRepliedAt'
		] as const) {
			expect(columns[key].notNull, key).toBe(false);
		}
		expect(columns.bookingRequestId.isUnique).toBe(true);
	});

	it('declares the CHECKs', () => {
		expect(config.checks.map((c) => c.name).sort()).toEqual([
			'review_author_name_check',
			'review_body_check',
			'review_host_reply_check',
			'review_published_at_check',
			'review_rating_check',
			'review_source_check',
			'review_title_check'
		]);
	});

	it('nulls the booking and author references and cascades from the property', () => {
		const actions = Object.fromEntries(
			config.foreignKeys.map((fk) => [fk.reference().columns[0].name, fk.onDelete])
		);
		expect(actions).toEqual({
			property_id: 'cascade',
			booking_request_id: 'set null',
			author_user_id: 'set null'
		});
	});

	it('indexes (property_id, status, published_at)', () => {
		expect(config.indexes.map((i) => i.config.name)).toContain(
			'review_property_id_status_published_at_idx'
		);
	});
});
