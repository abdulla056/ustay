// Application schema lives here. Auth tables are generated into auth.schema.ts
// by `bun run auth:schema` and re-exported below.
//
// Build every table from the shared column helpers in ./helpers.ts (`id()`, `...timestamps()`,
// `slug()`, `userRef()`) and follow the conventions in docs/DATABASE.md — naming, ids, slugs and
// the db:push vs db:generate migration workflow are decided there.
export * from './auth.schema';
