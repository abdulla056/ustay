import type { ParamMatcher } from '@sveltejs/kit';

/**
 * A URL slug as `slugify()` / `uniqueSlug()` (`$lib/server/db/slug`) produce it: lowercase ASCII
 * words joined by single hyphens. Up to 80 characters plus a 7-character collision suffix. Anything
 * else cannot be a stored slug, so it 404s at routing instead of reaching a query.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const MAX_SLUG_PARAM_LENGTH = 87;

export const match: ParamMatcher = (param) =>
	param.length <= MAX_SLUG_PARAM_LENGTH && SLUG_PATTERN.test(param);
