/**
 * Stand-in for `$env/dynamic/private` in the `db` Vitest project only (aliased in
 * `vite.config.ts`). The real module is a build-time snapshot of `.env`, i.e. the dev database;
 * this one reads the worker's `process.env`, which the project's `test.env` fills with the
 * `ustay_test` URL.
 */
export const env: Record<string, string | undefined> = process.env;
