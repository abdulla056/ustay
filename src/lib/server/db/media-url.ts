/**
 * The rule for `media_asset.url` (UST-20), as pure data so the database CHECK
 * (`media_asset_url_check`, built from these patterns in `media.schema.ts`) and the repository
 * validation (`media.repo.ts`) cannot drift apart. No `$env` or database import.
 *
 * A URL is one of:
 * - **absolute**: `http(s)://` followed by one or more characters, none of them whitespace or a
 *   backslash (browsers treat `\` like `/`, so `/\host` would otherwise mean `//host`);
 * - **local**: a file under `/prototype/` (served from `static/`), with a safe charset, no `..`
 *   and a known media extension. Only that directory: a site-relative path could otherwise point
 *   at an app route such as `/logout`, which every visitor's browser would request with cookies.
 *
 * The patterns are valid POSIX ARE (Postgres `~`) and JavaScript regular expressions alike, and
 * contain no single quote, so they can be inlined as SQL string literals.
 */
export const MEDIA_URL_ABSOLUTE_PATTERN = String.raw`^https?://[^\s\\]+$`;
export const MEDIA_URL_LOCAL_PATTERN = String.raw`^/prototype/[A-Za-z0-9_-]+(/[A-Za-z0-9_-]+)*\.(jpe?g|png|webp|avif|mp4|webm)$`;

const ABSOLUTE = new RegExp(MEDIA_URL_ABSOLUTE_PATTERN);
const LOCAL = new RegExp(MEDIA_URL_LOCAL_PATTERN);

/** Whether `value` is an acceptable `media_asset.url`. Anything but a string is not. */
export function isValidMediaUrl(value: unknown): value is string {
	return typeof value === 'string' && (ABSOLUTE.test(value) || LOCAL.test(value));
}
