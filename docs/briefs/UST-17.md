# Worker Brief — UST-17: Microsite template and section config

Linear: https://linear.app/abdulla-safar/issue/UST-17/model-microsite-template-and-section-config

## Mission

Each property's microsite is assembled from a curated set of sections (Hero, Overview, Gallery,
Rooms, Amenities, Host/Story, Location, Booking CTA: UST-23 to 30). It is themed from curated presets,
never free-form design (DESIGN.md "Platform vs. property", decision 6). Model this as data, so the
Phase 2 renderer (UST-22, UST-31) can be config-driven. The data says which template, which theme,
and which sections in which order with which variant.

## Read first (in the repo)

- `DESIGN.md` (especially "Platform vs. property"), `docs/DECISIONS.md` (#5, #6),
  `docs/DATABASE.md`, `docs/ARCHITECTURE.md` (`$lib` layout and the `$lib/server` trust boundary).
- `src/routes/layout.css` (the `--color-accent` / `--color-accent-on-dark` tokens and the
  tone scoping), `src/lib/server/db/*.schema.ts`, `helpers.ts`, `src/lib/server/validate.ts`,
  `src/lib/server/property/*.repo.ts` (the hardening patterns: typed errors, `isUuid`,
  `findPropertyById(id, tx, { lock: true })`, a single-statement reorder in `attraction.repo.ts`).

## Decisions (made by the orchestrator)

### Two sources of truth, split deliberately

**Code registry** (`src/lib/microsite/registry.ts`):

- It's pure data with no server imports, so both the server repo and the Phase 2 renderer can use it.
- It holds the **templates**:
  - key, name, description;
  - an ordered default section list, each entry `{ type, variant }`.
- It holds the **accent presets**:
  - key and name;
  - `light` and `dark` hex values, the dark one for the inverse tone.
- It holds the **font pairings**: key, name, and display/body font families.
- Each section type lists its allowed **variants**.
- Templates, accents and fonts map to code (components, tokens), so they live in code. Adding a preset
  is a code change, not a migration.

**Database:** per-property choices only.

### Seed registry content

Keep it small and mark it provisional, because the palette sign-off is still pending with the user.

- **Templates:**
  - `editorial` is the default. Sections: hero, overview, gallery, rooms, amenities, host_story,
    location, booking_cta.
  - `intimate` is for small homestays. It puts host_story right after the hero and omits amenities
    by default.
- **Accents:**
  - `forest` (the current tokens, `#5C6B52` / `#77876D`) is the default.
  - Add two more candidates, and **verify AA**: at least 4.5:1 for `light` on `paper` (#F4EFE6) and
    for `dark` on `ink`. Use a unit test that computes the contrast ratio, so a bad preset can never
    land.
- **Font pairings:** `editorial`, the current display and body pair, is the default. Add one
  alternative only if it uses fonts already loaded. Otherwise ship just the default.
- **Section variants:** every section type gets a `default` variant. Add more only where an
  existing component already has variants, for example gallery `zoom` (ZoomGallery) and `grid`.

### `microsite_config`, 1:1 with a property

- `property_id` is the primary key, an FK with cascade.
- `template_key`, `accent_key` and `font_key` are text, `not null`, with defaults matching the
  registry defaults.
- Plus `timestamps()`.
- Keys are validated in the repo against the registry. The read path resolves an unknown or removed
  key to the default, so a deleted preset never breaks a live microsite. Test this.

### `microsite_section`

- Columns:
  - `id()`;
  - `property_id`, FK with cascade;
  - `type`, a `pgEnum` `microsite_section_type` with values `hero`, `overview`, `gallery`, `rooms`,
    `amenities`, `host_story`, `location`, `booking_cta`. This is a closed set tied to the Phase 2
    issues, so an enum is right here;
  - `variant` (text, default `'default'`, validated against the registry for that type);
  - `enabled` (boolean, default true);
  - `sort_order`;
  - `timestamps()`.
- `UNIQUE (property_id, type)`: each section at most once per property for the MVP.
- An index on `(property_id, sort_order)`.
- No per-section free-form settings or JSON. Content comes from the domain tables. Headings and copy
  overrides can come later if needed.

### Repository: `src/lib/server/microsite/microsite.repo.ts`

- `getMicrositeConfig(propertyId)` returns the resolved config, with defaults when there's no row and
  unknown keys mapped to defaults.
- `setMicrositeTheme(propertyId, { templateKey?, accentKey?, fontKey? })`.
- `applyTemplate(propertyId, templateKey)`:
  - sets the template key;
  - **replaces** the section list with the template's defaults, in a transaction with the property
    locked.
- `listSections(propertyId, { enabledOnly? })`, ordered.
- `setSectionOrder(propertyId, types[])`, a single statement with the same semantics as
  `setAttractionOrder`.
- `setSectionEnabled(propertyId, type, enabled)`.
- `setSectionVariant(propertyId, type, variant)`, which validates the variant against the registry.
- `getRenderableMicrosite(propertyId)` returns the resolved theme plus the enabled sections in order:
  exactly what the renderer needs. A property with no config or sections falls back to the default
  template's sections.
- Same hardening as UST-15 and UST-16:
  - typed errors;
  - no raw Postgres codes;
  - runtime patch stripping;
  - the executor as the last parameter.
- Relations: `property.micrositeConfig` (one) and `property.micrositeSections` (many).

### Tests

- **Unit tests in the default gate:**
  - registry integrity: every template's sections are valid types and variants with no duplicates,
    and defaults exist;
  - the AA contrast test;
  - schema shape.
- **DB tests:**
  - fallback to defaults;
  - unknown-key resolution;
  - `applyTemplate` replaces the sections;
  - reorder;
  - enable/disable;
  - the variant is validated;
  - the unique type per property;
  - cascade.

### Migration

- One migration only, following the migration clash rule below.
- No hand edits should be needed. Say so if any were.

## Out of scope (don't)

- No renderer, routes or UI. No changes to `layout.css` tokens: applying an accent at runtime is
  UST-31's job.
- No seed data (UST-20 seeds a full property).

## Acceptance

- Registry, schema, migration, repo and tests as above.
- `bun run check`, `lint`, `test` and `test:db` all green locally (Colima). CI green on all three jobs.
- `bun run db:reset` applies cleanly. Use a scratch database for that check, not `local`.
- `docs/DATABASE.md` documents the tables and the code-registry split.

## House rules

See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup. Branch `ust-17-microsite-config`.
Stage explicit paths only, never `git commit -a`. The commit trailer names the model actually
running. Linear UST-17 goes In Progress → Done. Push, open a PR to `main`, don't merge. Poll
`gh pr checks <n>` until all jobs finish.

**Migration clash rule:** before opening the PR, `git fetch && git rebase origin/main`. If main
gained a migration after yours, delete yours (sql + snapshot + journal entry) and re-run
`bun run db:generate`.

## Report back to orchestrator

- PR link and CI result.
- Migration name.
- The accent candidates with their contrast ratios, so the user can sign them off.
- Deviations.
- New-issue candidates.
