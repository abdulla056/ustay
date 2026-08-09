# Ustay

A property discovery, branding, and booking platform for independent homestays, resorts, boutique
hotels, and vacation rental owners. Every property becomes its own branded microsite.

> **Product vision, goals, and design philosophy live in [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).**
> This README covers local development only.

## Stack

SvelteKit (Svelte 5) · TypeScript · Tailwind CSS v4 · PostgreSQL + Drizzle ORM · better-auth ·
Storybook · Vitest + Playwright · deploys to Cloudflare Pages. Package manager: **bun**.

## Prerequisites

- [bun](https://bun.sh)
- Docker (for the local Postgres database)

## Getting started

```sh
bun install

# Component tests run in a real browser — install the chromium Playwright uses
bunx playwright install chromium

# 1. Start the local Postgres database (Docker, see compose.yaml)
bun run db:start

# 2. Apply the database schema
bun run db:push

# 3. Run the dev server
bun run dev --open
```

Two dev-only pages are worth opening: `/prototype` (the art-direction prototype) and `/tokens` (the
design-token showcase).

### Environment

Copy `.env.example` to `.env` and adjust as needed. Before any non-local use, replace
`BETTER_AUTH_SECRET` with a real 32-character high-entropy secret.

## Scripts

| Command               | Description                             |
| --------------------- | --------------------------------------- |
| `bun run dev`         | Start the dev server                    |
| `bun run build`       | Production build (Cloudflare adapter)   |
| `bun run preview`     | Preview the production build locally    |
| `bun run check`       | Type-check with `svelte-check`          |
| `bun run lint`        | Prettier + ESLint                       |
| `bun run format`      | Format with Prettier                    |
| `bun run test`        | Run the unit/component test suite       |
| `bun run storybook`   | Launch Storybook                        |
| `bun run db:start`    | Start the Postgres container            |
| `bun run db:push`     | Push the Drizzle schema to the database |
| `bun run db:studio`   | Open Drizzle Studio                     |
| `bun run auth:schema` | Regenerate the better-auth schema       |

## Architecture

Where code lives — the `$lib` layout, the `$lib/server` trust boundary, the route-group strategy, and
the data-access/repository conventions — is documented in
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md). Read it before adding a route or a query.

## Database

Schema is defined with Drizzle in `src/lib/server/db/`. Conventions — id strategy, naming, slugs,
and the `db:push` vs `db:generate` migration workflow — are documented in
[`docs/DATABASE.md`](./docs/DATABASE.md); read it before adding a table.

After changing the auth config in `src/lib/server/auth.ts`, regenerate the auth schema and push:

```sh
bun run auth:schema
bun run db:push
```

## Deployment

Configured for **Cloudflare Pages** via `@sveltejs/adapter-cloudflare` (see `wrangler.jsonc`).
