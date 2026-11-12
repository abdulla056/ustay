import { describe, expect, it } from 'vitest';
import { getTableColumns, getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
	bookingMessage,
	bookingMessageSender,
	bookingRequest,
	bookingRequestKind,
	bookingRequestStatus
} from './booking.schema';

const columns = getTableColumns(bookingRequest);
const config = getTableConfig(bookingRequest);
const messageConfig = getTableConfig(bookingMessage);

describe('booking_request table shape', () => {
	it('uses singular snake_case names', () => {
		expect(getTableName(bookingRequest)).toBe('booking_request');
		expect(getTableName(bookingMessage)).toBe('booking_message');
	});

	it('has the agreed enums', () => {
		expect(bookingRequestKind.enumValues).toEqual(['booking', 'question']);
		expect(bookingRequestStatus.enumValues).toEqual([
			'pending',
			'accepted',
			'declined',
			'cancelled',
			'expired',
			'closed'
		]);
		expect(bookingMessageSender.enumValues).toEqual(['guest', 'host', 'system']);
	});

	it('requires identity, guest, expiry, currency and the token hash', () => {
		for (const key of [
			'propertyId',
			'reference',
			'kind',
			'guestName',
			'guestEmail',
			'status',
			'expiresAt',
			'currency',
			'guestAccessTokenHash'
		] as const) {
			expect(columns[key].notNull, key).toBe(true);
		}
		expect(columns.reference.isUnique).toBe(true);
		expect(columns.guestAccessTokenHash.isUnique).toBe(true);
		expect(columns.status.default).toBe('pending');
	});

	it('leaves room, dates, party, phone, account, message and price nullable', () => {
		for (const key of [
			'roomId',
			'checkIn',
			'checkOut',
			'adults',
			'children',
			'guestPhone',
			'guestUserId',
			'message',
			'respondedAt',
			'cancelledAt',
			'nightlyRateMinor',
			'estimatedTotalMinor'
		] as const) {
			expect(columns[key].notNull, key).toBe(false);
		}
	});

	it('stores dates as calendar dates, not instants', () => {
		expect(columns.checkIn.columnType).toBe('PgDateString');
		expect(columns.checkOut.columnType).toBe('PgDateString');
	});

	it('cascades with the property and nulls the room and account', () => {
		const actions = Object.fromEntries(config.foreignKeys.map((f) => [f.getName(), f.onDelete]));
		expect(actions['booking_request_property_id_property_id_fk']).toBe('cascade');
		expect(actions['booking_request_room_fk']).toBe('set null');
		expect(actions['booking_request_guest_user_id_user_id_fk']).toBe('set null');
		const roomFk = config.foreignKeys.find((f) => f.getName() === 'booking_request_room_fk')!;
		expect(roomFk.reference().columns.map((c) => c.name)).toEqual(['property_id', 'room_id']);
	});

	it('has the table CHECKs and the inbox, email, account and pending-expiry indexes', () => {
		expect(config.checks.map((c) => c.name).sort()).toEqual([
			'booking_request_currency_check',
			'booking_request_guest_email_check',
			'booking_request_guest_name_check',
			'booking_request_kind_check',
			'booking_request_message_check',
			'booking_request_price_check',
			'booking_request_status_check'
		]);
		expect(config.indexes.map((i) => i.config.name).sort()).toEqual([
			'booking_request_expires_at_pending_idx',
			'booking_request_guest_email_idx',
			'booking_request_guest_user_id_idx',
			'booking_request_property_id_status_created_at_idx'
		]);
		const partial = config.indexes.find(
			(i) => i.config.name === 'booking_request_expires_at_pending_idx'
		);
		expect(partial?.config.where).toBeDefined();
	});
});

describe('booking_message table shape', () => {
	const cols = getTableColumns(bookingMessage);

	it('is append-only: a created_at but no updated_at', () => {
		expect(Object.values(cols).map((c) => c.name)).toEqual([
			'id',
			'booking_request_id',
			'sender',
			'author_user_id',
			'body',
			'created_at'
		]);
	});

	it('cascades with its request, nulls the author, and is indexed by thread order', () => {
		const actions = Object.fromEntries(
			messageConfig.foreignKeys.map((f) => [f.getName(), f.onDelete])
		);
		expect(actions['booking_message_booking_request_id_booking_request_id_fk']).toBe('cascade');
		expect(actions['booking_message_author_user_id_user_id_fk']).toBe('set null');
		expect(cols.authorUserId.notNull).toBe(false);
		expect(messageConfig.indexes.map((i) => i.config.name)).toEqual([
			'booking_message_booking_request_id_created_at_idx'
		]);
	});
});
