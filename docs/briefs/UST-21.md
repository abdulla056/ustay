# Worker Brief — UST-21 + UST-22: Microsite route, data loading, section registry and renderer

Linear: https://linear.app/abdulla-safar/issue/UST-21/microsite-route-property-data-loading and
https://linear.app/abdulla-safar/issue/UST-22/section-component-architecture-registry-renderer
(one PR closes both)

## Mission

Phase 2's foundation: turn `/s/<slug>` into a rendered property microsite. That takes four things:

- a route;
- one server function that composes the Phase 1 repos into a single **public view model**;
- a **section registry** that maps each section type to a component;
- a **renderer** that walks the property's enabled sections in order.

The section components themselves (UST-23 to UST-30) are built next, in parallel, by other workers.
Your job is the contract they all plug into, plus a minimal placeholder per section so the page
works end to end against the seeded property **Rumah Kabus** (`rumah-kabus`).

## Read first (in the repo)

- `PROJECT_CONTEXT.md`, `DESIGN.md`, `docs/DECISIONS.md`: especially #1 (slug redirects),
  #5 (microsites at `/s/<slug>`) and #8 (location privacy).
- `docs/ARCHITECTURE.md`: `$lib` layout, the `$lib/server` trust boundary, route groups and request
  flow.
- `docs/DATABASE.md`: all of it, especially Microsite config, Reviews (imported reviews must be
  labelled) and the Media URLs section.
- `src/routes/(microsite)/README.md`. It still says `/stays/[property]`; decision 5 supersedes that,
  so update it.
- `src/lib/features/microsite/registry.ts` and `src/lib/features/gallery/ZoomGallery.svelte`
  (its `GalleryFrame` type).
- The repos the microsite reads:
  - `findPropertyBySlug`, `findRedirectedSlug`
  - `getRenderableMicrosite`
  - `getPublicPropertyLocation`
  - `listPropertyMedia`
  - `getHostProfile`
  - room, amenity and attraction listings
  - `listReviews`, `getRatingSummary`
- `src/lib/server/db/seed/sample-property.ts`, which is the data you render.
- `e2e/`: the Playwright lane and its helpers.

## Decisions (made by the orchestrator)

### Route

- The route is `src/routes/(microsite)/s/[slug]/+page.server.ts` and `+page.svelte`, plus a
  minimal `(microsite)/+layout.svelte`. Real microsite chrome (nav, footer, theme) is UST-31, so keep
  the layout bare but correct: `<main>` and a skip link.
- **Lookup order:**
  1. A published property with that slug: render it.
  2. A slug in `property_slug_redirect`: respond with a **301** to the current slug, but only if
     the target is published.
  3. Anything else (unknown, `draft` or `archived`): **404**.
- Never leak draft content. Owner preview of drafts is a later issue.

### View model: `src/lib/features/microsite/types.ts`

This file is client-safe and holds types only.

- `MicrositeView = { property, theme, sections, seo }`:
  - `theme` holds the resolved template, accent and font keys plus the accent hex from the
    registry. It isn't applied yet; that's UST-31.
  - `sections` is an **ordered discriminated union** keyed by `type`. Each member is
    `{ type, variant, data }`, where `data` is exactly what that section needs: hero, overview,
    gallery, rooms, amenities, host_story, location and booking_cta.
- Shape the data for rendering, not as raw rows:
  - Gallery frames match `GalleryFrame`.
  - Money stays as integer minor units plus currency. Add one shared `formatMoney` in
    `$lib/features/microsite/format.ts` using `Intl.NumberFormat`, following the money rules.
  - Location uses the **public** projection only.
  - Reviews are published only, each carrying `source` and `origin`, so imported reviews can be
    labelled.
  - The rating summary is included.
  - There are no ids the UI doesn't need, no owner ids, no emails, no token hashes and no inbox.
- **Markdown** (the story body and host bio) is rendered to HTML on the server. Use
  `markdown-it` with `html: false`. It is a new dependency, so flag it in the PR. Keep its default
  `validateLink`, which blocks `javascript:`, `vbscript:` and `data:` links except images.
  - External links get `rel="noopener noreferrer"`.
  - The view model carries an `html` string that components render with `{@html}`.
  - Add tests that raw `<script>`, `<img onerror>` and a `javascript:` link come out inert.

### Loader: `src/lib/server/microsite/load.ts`

- Exports `loadMicrosite(slug)`, returning
  `{ kind: 'ok', view } | { kind: 'redirect', slug } | { kind: 'not_found' }`.
  It holds no SvelteKit `error()` or `redirect()`; the route maps the result.
- Run the independent reads concurrently. Pass the database to each read, not a shared
  transaction, unless one is needed for consistency.
- A section whose data is empty is dropped from `sections`, rather than rendering an empty shell.
  Examples: no attractions and no location means no location section; no rooms means no rooms
  section. Document the rule for each section type.
- Hero and booking CTA always render when enabled.

### Registry and renderer: `src/lib/features/microsite/`

- `sections.ts` maps each section `type` to its component, typed so the registry must cover every
  type exhaustively.
- `MicrositeRenderer.svelte` walks `view.sections` in order. It wraps each section in
  `<svelte:boundary>`, so one broken section degrades to nothing (logged in dev) instead of breaking
  the page.
- Every section component receives typed props `{ data, variant }` for its own type.
- **Placeholder components**, one per type, go in `src/lib/features/microsite/sections/`, named e.g.
  `HeroSection.svelte`. Build them from the existing `$lib` primitives (`Section`, `Container`,
  `Text`, `Eyebrow`, `Image` and so on): honest, simple and on-brand. Each must:
  - render its real data, not lorem ipsum;
  - have a heading;
  - carry a `data-section="<type>"` attribute, so e2e and UST-31 can find it.

  UST-23 to UST-30 will **replace the internals** of these files, so keep each self-contained and
  the props contract stable.

- **Gallery:** for the `zoom` variant, render the existing `ZoomGallery` with the gallery frames.
  That gets the prototype's signature moment working now.

### SEO (`<svelte:head>`)

- `title` is "`<name>` · `<tagline>`".
- The meta description comes from `short_description`.
- Add `link rel=canonical` pointing at `/s/<current-slug>`.
- Add Open Graph and Twitter tags. The image is the hero, as an absolute URL built from
  `url.origin` for site-relative paths.
- Add JSON-LD `LodgingBusiness` with:
  - `name`, `description`, `image`;
  - `address`: locality, region and country only, per the privacy rule;
  - `priceRange`, from the room rates.
- Leave out `aggregateRating`, because the reviews are partly imported or self-collected. Note why
  in a code comment.

### Tests

- **Unit tests:**
  - every section type is in the registry;
  - `formatMoney`;
  - markdown sanitising.
- **DB tests for `loadMicrosite`:**
  - Rumah Kabus loads with the expected section order and gallery variant;
  - the public location has no address lines;
  - pending reviews are excluded;
  - a draft property is `not_found`;
  - a renamed slug gives `redirect`;
  - empty-data sections are dropped.
- **Browser-mode test:** the renderer renders sections in order and survives one throwing section.
- **e2e:**
  - `/s/rumah-kabus` returns 200 with every `data-section` in config order, the `h1` showing the
    property name, and no console errors;
  - an unknown slug returns 404;
  - a draft returns 404;
  - an old slug returns 301 to the current one.
- **e2e data:** the e2e database is seeded by `e2e/support/prepare-db.ts`. Make sure it runs the
  sample-property seed module, or seeds it explicitly.

## Out of scope (don't)

- Real section designs (UST-23 to UST-30), applying the theme, and microsite nav or footer (UST-31).
- The booking form (UST-30, then Phase 6), owner previews, sub-pages and maps (UST-29).
- No schema or migration changes. If you find a data gap, report it.

## Acceptance

- `/s/rumah-kabus` renders every seeded section in order, including the working ZoomGallery, with no
  console errors. Unknown, draft and old slugs behave as specified.
- Svelte MCP autofixer clean on all `.svelte` files.
- `bun run check`, `lint`, `test`, `test:db` and `test:e2e` green locally. CI green; all three jobs
  are required on `main`.
- `docs/ARCHITECTURE.md` documents:
  - the microsite request flow;
  - the view-model contract;
  - how a section plugs in;
  - the markdown rule.

  `(microsite)/README.md` is corrected to `/s/<slug>`.

## House rules

See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup.

- Branch `ust-21-microsite-route`.
- Stage explicit paths only; never `git commit -a`.
- The commit trailer names the model actually running.
- Linear UST-21 and UST-22 go In Progress → Done.
- Open a PR to `main`; don't merge; don't edit `WORKFLOW.md`.
- Poll `gh pr checks <n>` until all jobs finish.
- If a job fails, read `gh run view <id> --log-failed` and fix the cause.
- If you start a dev or preview server, use a port other than 5173, and stop it when you're done.

## Report back to orchestrator

- PR link and CI result.
- The view-model shape: paste the `MicrositeView` type.
- The empty-section rules.
- Screenshots or notes of `/s/rumah-kabus` at desktop and phone widths.
- Deviations.
- New-issue candidates.
