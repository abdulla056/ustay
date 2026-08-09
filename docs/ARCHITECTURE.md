# Architecture

Where things live, and which module is allowed to import which. Locked **before** the domain is
built, so the tenth feature looks like the first. If you need to break a rule, change this document
in the same PR.

Companion documents: [`PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md) (why Ustay exists),
[`DESIGN.md`](../DESIGN.md) (how it looks and moves), [`docs/DATABASE.md`](./DATABASE.md) (tables,
ids, slugs, migrations).

## The repo is an app, not a package

The project was scaffolded from SvelteKit's **library** template, which shipped publishing machinery
we will never use: a `prepack` step running `svelte-package` + `publint`, plus `files`, `svelte`,
`types`, `exports`, `peerDependencies`, `sideEffects` and `keywords`. All of it is gone.

For an app, `src/routes` is the public surface and `src/lib` is internal — the inverse of a library,
where `src/lib` _is_ the product. Keeping the packaging around meant every `bun run build` also
copied `src/lib` into a `dist/` nobody consumed, and warned that our SvelteKit imports weren't
declared as peer dependencies. Both symptoms of publishing something that is not publishable.

| Change                                                        | Why                                                                                          |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `build` is now just `vite build`                              | The adapter output in `.svelte-kit/cloudflare` is the deployable, not `dist/`.               |
| `prepack` removed, with `@sveltejs/package` + `publint`       | Nothing packs this repo.                                                                     |
| `files`/`svelte`/`types`/`exports`/`peerDependencies` removed | npm entry-point metadata for a package that is never installed.                              |
| `sideEffects` removed                                         | A tree-shaking hint for library consumers; Vite doesn't need it, and a wrong one drops code. |
| `keywords` removed                                            | npm search metadata.                                                                         |
| `"private": true` added                                       | Makes an accidental `npm publish` impossible rather than merely unlikely.                    |
| `test` is now `vitest --run`                                  | Was shelling out to `npm run test:unit`; bun is the package manager.                         |
| `@sveltejs/adapter-auto` removed                              | The Cloudflare adapter is wired up explicitly in `vite.config.ts`.                           |

`$lib` still exists and `src/lib/index.ts` still barrel-exports the UI primitives — that barrel is
now an _internal_ convenience import (`import { Button } from '$lib'`), not a published entry point.

There is **no `svelte.config.js`**: the Kit config (adapter, runes mode, `typescript.config`) lives
inline in the `sveltekit()` plugin in `vite.config.ts`. Look there before concluding a setting is
missing.

## Top level

| Path                  | What it is                                                             |
| --------------------- | ---------------------------------------------------------------------- |
| `src/routes/`         | URL surface — pages, layouts, endpoints. See [Routes](#routes).        |
| `src/lib/`            | Everything else we write. See [`$lib`](#lib-and-the-trust-boundary).   |
| `src/params/`         | Route param matchers (validate a slug before a route matches).         |
| `src/hooks.server.ts` | Request entry point: session, authorisation, response headers.         |
| `src/app.d.ts`        | `App.Locals` / `App.Platform` types.                                   |
| `static/`             | Served byte-for-byte (`robots.txt`, favicon). Prefer importing images. |
| `docs/`               | Conventions (this file, `DATABASE.md`) + per-issue briefs.             |
| `drizzle/`            | Generated, committed SQL migrations.                                   |

## `$lib` and the trust boundary

```tree
src/lib/
├ index.ts              # internal barrel for the UI primitives
├ components/           # UI primitives + their .stories.svelte (UST-7)
├ features/<domain>/    # client-safe domain slices: components, view models, types
├ motion/               # Lenis + GSAP scroll/reveal layer (client-only)
├ state/                # app-global runes state (*.svelte.ts)
├ utils/                # pure, dependency-free helpers
├ types/                # cross-domain primitives only (Money, Paginated, …)
└ server/               # SERVER ONLY — never reaches the browser
  ├ db/                 # client, schema, helpers, slug (docs/DATABASE.md)
  ├ auth.ts             # better-auth instance
  └ <domain>/           # repositories + services for that domain
```

Only `components/`, `server/` and `index.ts` exist today. Create the rest when a feature needs them;
do not pre-create empty folders.

**The one rule: the boundary is `$lib/server`.** SvelteKit fails the build if anything reachable
from client code imports `$lib/server/**` (or a `*.server.ts` file), which makes the split
mechanically enforced rather than a matter of discipline. So:

- Secrets, the `db` client, Drizzle queries, and the auth instance live under `$lib/server/`.
- Everything a `.svelte` file can touch lives outside it.
- Two folders per domain, not one: `features/property/` (client-safe) and `server/property/`
  (queries + use cases). The pair is the domain.
- The guard is **disabled while tests run** (Vitest sets `TEST=true`), so a leak can pass `bun run
test` and still fail `bun run build`. `bun run build` is the real check.

### `components/` vs `features/`

`$lib/components/` holds the primitives from UST-7 — `Container`, `Section`, `Grid`, `Stack`,
`Heading`, `Text`, `Eyebrow`, `Label`, `Button`, `Link`, `Badge`, `Card`, `Image`, `Icon`. A
component belongs there only if it knows **nothing** about Ustay's domain: no property, no booking,
no host. It is styled purely from the UST-6 tokens, is deliberately static (the motion layer wraps
it), and it ships with a `.stories.svelte` next to it. Add it to `src/lib/index.ts`.

Anything that knows what a property is — `PropertyCard`, `RoomList`, `BookingRequestForm`, a
microsite section — is a **feature** component in `$lib/features/<domain>/`, composed from
primitives, and is _not_ exported from the barrel. Route-specific components that only one page will
ever use can also sit next to that page in `src/routes/`; promote them to `features/` on the second
use, not in anticipation of it.

### Motion is client-only

`gsap` and `lenis` touch `window`, and the Cloudflare worker has a size limit, so they must never be
imported at the top level of a module that renders on the server. Import them inside `$effect` (or
behind a dynamic `import()`), keep the wiring in `$lib/motion/`, and honour
`prefers-reduced-motion` there once rather than in every component.

## Shared types

- **Domain types live with the domain**: `$lib/features/<domain>/types.ts`. A type used by exactly
  one component belongs in that component.
- `$lib/types/` is only for genuinely cross-domain primitives — `Money`, `Currency`, `Paginated<T>`,
  branded id/date types. If a type mentions a specific entity, it is in the wrong place.
- **Row shapes are inferred, never retyped.** Drizzle is the source of truth: derive from
  `typeof property.$inferSelect` rather than hand-writing a parallel interface that will drift.
- **Types may cross the server boundary; values may not.** `import type { … } from
'$lib/server/db/schema'` is legal and erased at compile time — this is how a client component gets
  a row type without importing the schema. A value import of the same module fails the build.
- A row type is not a DTO. Define the shape a page actually receives (usually narrower — no
  `hostId`, no internal notes) and return that from the repository, so widening a table doesn't
  silently widen a payload.
- What `load` returns must be serialisable. `Date`, `Map`, `Set` and `BigInt` survive; class
  instances and functions do not. For a custom type that must cross the wire, add a `transport`
  entry in `src/hooks.ts` rather than stringifying by hand at both ends.

## Routes

`src/routes/+layout.svelte` is the only unconditional layout: self-hosted fonts and `layout.css`,
nothing visual. Every audience then gets a **route group** — a directory in parentheses that shapes
the layout hierarchy without appearing in the URL. Groups are siblings, so none of them inherits
another's chrome, and no `+layout@.svelte` reset is needed to keep them apart.

| Group         | URLs                                       | Layout                                            |
| ------------- | ------------------------------------------ | ------------------------------------------------- |
| `(platform)`  | `/`, `/destinations/…`, `/stays`, `/about` | Ustay chrome: header/footer, Lenis, tonal scroll. |
| `(microsite)` | `/stays/[property]`, and its sub-pages     | The property's own chrome, per-property theme.    |
| `(dashboard)` | `/dashboard/**`                            | Owner CMS: sidebar, dense, no cinematic motion.   |
| `(auth)`      | `/sign-in`, `/sign-up`, `/reset-password`  | Bare centred card, no chrome.                     |

Each group folder has a `README.md` stating what belongs in it. Outside the groups:

- `src/routes/api/` — endpoints for **machines only**: webhooks, third-party callbacks, and
  client-side fetches that have no page to hang off. A page's own data goes through `load`, not
  through a `+server.ts` the page then fetches. better-auth's endpoints are mounted at `/api/auth/*`
  by `svelteKitHandler` in `hooks.server.ts`; do not write route files for them.
- `prototype/` and `tokens/` — dev-only pages (the art-direction prototype and the token showcase).
  Deliberately outside the groups so they inherit no chrome and stay honest.

### Why the microsite is a separate group

`/stays` (the index) is `(platform)`, while `/stays/[property]` is `(microsite)`. Splitting one URL
subtree across two groups looks odd until you remember the product: the index is Ustay's, the
property page is the property's, and the whole point of Ustay is that a microsite reads as the
property's own website. Different chrome, therefore different group.

Path-based URLs (fixed by `docs/DATABASE.md`) are the MVP. When properties get subdomains or custom
domains, **do not restructure the routes** — add a `reroute` hook in `src/hooks.ts` mapping
`riad-el-fenn.ustay.com/rooms` onto the existing `/stays/riad-el-fenn/rooms`. `reroute` runs on both
server and client, is expected to be pure and fast, and does not change the address bar, which is
exactly the behaviour a vanity domain needs.

### Route conventions

- Validate dynamic segments with a matcher in `src/params/` (a slug matcher beats a 500 from a
  malformed id).
- Internal links go through `resolve()` from `$app/paths` — ESLint's
  `svelte/no-navigation-without-resolve` enforces it everywhere except the primitives, which receive
  an `href` from their caller.
- Prerender what is genuinely static (marketing, legal). A microsite is not static: it changes when
  the owner edits it.
- Read secrets with `$env/dynamic/private` (as `$lib/server/auth.ts` does). On Workers these are
  per-request runtime values, so build-time `$env/static/private` sees nothing the build machine
  didn't have. `platform.env` is for real bindings (KV, R2, D1), not config.
- No `node:fs` — the Workers runtime has no filesystem. Use `read` from `$app/server`.

## Request flow

```
request → hooks.server.ts (session, authorisation)
        → +page.server.ts load  /  form action  /  +server.ts
        → $lib/server/<domain>/*.service.ts   (use case, authorisation, transactions)
        → $lib/server/<domain>/*.repo.ts      (the only Drizzle queries)
        → $lib/server/db                      (the only DATABASE_URL)
```

Each layer may call the one below it and never the one above.

- **Routes never import `db`.** A `+page.server.ts` that writes its own `select()` is the thing this
  document exists to prevent: the query becomes untestable, unreusable, and impossible to audit.
- **Mutations are form actions**, so they work without JavaScript and get progressive enhancement
  for free. Reach for an `api/` endpoint only when there is no form and no page.
- A service is worth adding when a use case spans more than one repository, needs a transaction, or
  has rules of its own. For a plain read, `load` → repository is the whole story; do not add an
  empty pass-through service.
- Remote functions stay off until they leave `experimental.remoteFunctions`. `load` + form actions
  are the sanctioned data path; revisit in one place when the flag lands.

## Data access / repository layer

Repositories are the only place Drizzle appears. They build on `docs/DATABASE.md` — read that first
for ids, slugs, money and timestamps.

**Shape.** One module per aggregate, named for it: `$lib/server/property/property.repo.ts`. Plain
exported async functions, not classes — there is no state to hold, and functions tree-shake and mock
without ceremony.

**Naming**, so a call site tells you what happens on a miss:

| Prefix                            | Returns          | On miss                                       |
| --------------------------------- | ---------------- | --------------------------------------------- |
| `find…`                           | `T \| undefined` | `undefined` — caller decides.                 |
| `get…`                            | `T`              | Throws. Use when absence is a bug, not a 404. |
| `list…`                           | `T[]`            | Empty array.                                  |
| `count…`                          | `number`         | `0`.                                          |
| `insert…` / `update…` / `delete…` | the changed row  | —                                             |

`load` turns `undefined` into `error(404)`. Repositories never import `error` or `redirect`: an HTTP
status is a transport concern, and a repository must be callable from a script, a seed, or a test.

**Signatures.**

- Take explicit arguments or one plain input object. Never a `RequestEvent`, never `locals` — a
  repository that knows about the request cannot be tested without faking one.
- Accept the executor last so callers can compose inside a transaction:
  `async function insertProperty(input: NewProperty, tx: Executor = db)`. Then a service can run
  several repository calls in one `db.transaction(...)` without any of them opening its own.
- Select columns explicitly for anything a list view renders. `select()` with no argument means the
  next column added to the table silently joins every payload.
- Paginate on `createdAt` (keyset), never on the UUID id — `docs/DATABASE.md` explains why ids carry
  no order.
- Return plain serialisable objects, never a query builder and never a Drizzle relation proxy.

**Authorisation is not the repository's job.** `findPropertyBySlug` returns the property; deciding
whether _this_ user may see or edit it belongs in the service or the route. Repositories that
silently filter by owner become impossible to reuse for an admin view, and reviewing them tells you
nothing about who can reach what. Follow `docs/DATABASE.md`: resolve the slug to a row, then
authorise against that row.

## Authorisation

`hooks.server.ts` already puts `locals.user` / `locals.session` on every request. Route protection
belongs **there**, keyed on the pathname prefix — not in a group's `+layout.server.ts`. A layout
`load` does not run before a form action, so a layout-only guard leaves every `POST` in the subtree
open while looking secure. Guard the subtree in `handle`; let layouts load the user for rendering.

Ownership checks (this host owns this property) are per-row, so they live in the service or action
that touches the row, after the row is fetched.

## Tests

`vite.config.ts` defines three Vitest projects, selected purely by filename:

| File pattern       | Project     | Runs in                            |
| ------------------ | ----------- | ---------------------------------- |
| `*.svelte.test.ts` | `client`    | Chromium, real DOM.                |
| `*.test.ts`        | `server`    | Node. Also `src/lib/server/**`.    |
| `*.stories.svelte` | `storybook` | Chromium, via the Storybook addon. |

So a component test must be `Thing.svelte.test.ts`, and a repository or helper test must not be.
Keep unit tests database-free — `src/lib/server/db/helpers.test.ts` is the model. Anything needing
real SQL is an integration test and must stay out of the default `bun run test` gate.

## Adding a feature — checklist

1. Tables and migrations first, per `docs/DATABASE.md`.
2. `$lib/server/<domain>/<domain>.repo.ts` — the queries, with a DTO type for what pages receive.
3. A service only if the use case spans repositories, needs a transaction, or has real rules.
4. Route files in the right group; `load` for reads, form actions for writes.
5. Client-safe components in `$lib/features/<domain>/`, composed from `$lib` primitives — new
   primitives only if they are domain-free, and then with a story and a barrel export.
6. Guard the subtree in `hooks.server.ts`; check row ownership where the row is used.
7. `bun run check`, `bun run lint`, `bun run test`, and `bun run build` — the last is what catches a
   server import that leaked into client code.
