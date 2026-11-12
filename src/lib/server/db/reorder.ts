/**
 * Shared "reorder a property's ordered children" step (UST-17), used by `setAttractionOrder` and
 * `setSectionOrder`. Call it inside a transaction that already holds the property lock.
 */
import { sql } from 'drizzle-orm';
import type { Executor } from './index';

export type ReorderOptions = {
	/** Table name, e.g. `attraction`. Must have `sort_order` and `updated_at` columns. */
	table: string;
	/** The column the caller identifies rows by, e.g. `id` or `type`. */
	keyColumn: string;
	/** The column that scopes the rows to one owner, e.g. `property_id`. */
	scopeColumn: string;
	/** The owner's id. */
	scopeId: string;
	/** SQL type the keys are cast to, e.g. `uuid` or `microsite_section_type`. A fixed literal. */
	keyType: string;
	/** The keys that exist now, in their current order. */
	current: readonly string[];
	/** The keys the caller wants first, in order. Duplicates collapse to their first position. */
	requested: readonly string[];
	/** Builds the error thrown (before any write) when a requested key is not in `current`. */
	onForeign: (foreign: string[]) => Error;
};

/**
 * Positions `0..n-1` go to the requested keys in order, then to the unlisted ones in their current
 * order, in a single `UPDATE ... FROM unnest(...) WITH ORDINALITY`. Throws `onForeign(...)`,
 * changing nothing, if a requested key is not in `current`.
 */
export async function applyOrder(tx: Executor, o: ReorderOptions): Promise<void> {
	const ordered = [...new Set(o.requested)];
	const known = new Set(o.current);
	const foreign = ordered.filter((key) => !known.has(key));
	if (foreign.length > 0) throw o.onForeign(foreign);
	const listed = new Set(ordered);
	const finalOrder = [...ordered, ...o.current.filter((key) => !listed.has(key))];
	if (finalOrder.length === 0) return;
	const keyType = sql.raw(o.keyType);
	const keys = sql`ARRAY[${sql.join(
		finalOrder.map((key) => sql`${key}::${keyType}`),
		sql`, `
	)}]::${sql.raw(`${o.keyType}[]`)}`;
	await tx.execute(
		sql`UPDATE ${sql.identifier(o.table)} AS t SET sort_order = v.pos - 1, updated_at = now()
			FROM unnest(${keys}) WITH ORDINALITY AS v(k, pos)
			WHERE t.${sql.identifier(o.keyColumn)} = v.k
			AND t.${sql.identifier(o.scopeColumn)} = ${o.scopeId}::uuid`
	);
}
