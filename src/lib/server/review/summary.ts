/** Pure rating helpers (UST-19), kept apart from the repo so they test without a database. */

/**
 * The mean rating rounded half-up to one decimal, or `null` for no ratings. Done in integer
 * arithmetic from the exact sum and count, so there is no floating-point drift: 4.25 -> 4.3,
 * 3.05 -> 3.1 (a float `toFixed` or `Math.round(x * 10)` gets cases like these wrong).
 */
export function averageRating(sum: number, count: number): number | null {
	if (count <= 0) return null;
	// round(sum / count * 10) half-up == floor((20 * sum + count) / (2 * count))
	return Math.floor((20 * sum + count) / (2 * count)) / 10;
}
