# Worker Brief — UST-20: Seed a realistic sample property (end-to-end)

Linear: https://linear.app/abdulla-safar/issue/UST-20/seed-a-realistic-sample-property-end-to-end

## Mission

Phase 1's exit criterion is **one fully populated property** that the Phase 2 microsite can be built
against. It has every relation filled, and it is written in real, evocative copy that stresses the
design (no lorem ipsum). It runs through the existing seed harness and is verified to be queryable
end-to-end through the repositories the microsite will use.

## Read first (in the repo)

- `PROJECT_CONTEXT.md` (the voice: experiences, not rooms), `DESIGN.md` (editorial, cinematic,
  quiet luxury), `docs/DECISIONS.md` (all of it, especially money, booking, privacy #8).
- `docs/DATABASE.md`: every section, especially "Seeding" and its conventions.
- `src/lib/server/db/seed/*`. `dev-user.ts` is the module template. Seed modules write with
  `ctx.db` and the Drizzle query builder; **they never import repos**, because repos pull `$env`.
- Every `*.schema.ts` and `relations.ts`, plus the repos the microsite will read:
  - `getRenderableMicrosite`
  - `getPublicPropertyLocation`
  - `listPropertyMedia`
  - `getHostProfile`
  - `listAttractions`
  - `listReviews`
  - `getRatingSummary`
  - room and amenity listings

## Decisions (made by the orchestrator)

### Imagery strategy (deferred from UST-10)

**Use local static files, with no CDN placeholder service.** The repo already ships six photographs
in `static/prototype/` (2400px wide). Seed `media_asset.url` with their site-relative paths
(`/prototype/hero-forest.jpg`), using their real `width`/`height`:

| file              | size      |
| ----------------- | --------- |
| foggy-forest.jpg  | 2400×1600 |
| forest-light.jpg  | 2400×1598 |
| hero-forest.jpg   | 2400×1430 |
| lake-mountain.jpg | 2400×1600 |
| misty-lake.jpg    | 2400×1802 |
| sun-trees.jpg     | 2400×3600 |

Read the dimensions programmatically if you prefer, but don't guess. Write real alt text for each.

- Reusing an image across placements is fine: gallery, rooms, attraction images, host avatar. The
  `storage_key` stays null.
- No new image files and no external URLs, so e2e and offline dev never depend on the network.
- Record this in `docs/DATABASE.md` → Seeding.

### The property

The photos are misty highland forest and lake, so the property should match them. Use a fictional
highland retreat in **Malaysia**: currency `MYR`, timezone `Asia/Kuala_Lumpur`. A Cameron
Highlands-style setting works, with tea estates, mossy forest and cool mornings. Invent the name; a
Malay name with a simple meaning works well, e.g. "Rumah Kabus" ("house of mist").

- It is `published`, with a stable slug, so Phase 2 and e2e can rely on it. Export the slug as a
  constant.
- It is owned by the dev user (`owner@ustay.test`).

**Content:** fill every relation.

- Tagline, short description and description.
- Story: a heading plus a body of several paragraphs of markdown. It needs real history: who built
  the house, when, and why.
- Host profile: display name, bio, avatar, hosting since, and languages (e.g. `en`, `ms`).
- 3–4 rooms with varied beds, guests, unit counts and realistic MYR nightly rates in minor units.
  Each room has media and amenities.
- Property amenities from the 24 seeded standard amenities, some with `note`s.
- Media: a hero, a gallery of 6–7 images (so the ZoomGallery 7-frame mosaic is exercised), and a
  thumbnail.
- Location: a full address with plausible coordinates. Set `show_exact_location` to `false`, so the
  privacy projection is exercised.
- A destination, e.g. "Cameron Highlands", with a summary, linked to the property.
- 6–8 attractions across categories, each with a `host_note` in the host's voice, travel
  minutes/mode or a distance, and some with images.
- Microsite config: the `editorial` template's default sections. Enable all of them, and set the
  gallery variant to `zoom`. The accent is `forest`.
- Reviews:
  - 4–6 `guest` reviews, each backed by an `accepted` booking request whose `check_out` is in the
    past. Most are published. Include one with a host reply, and leave one `pending` so there is a
    moderation queue.
  - 2 `imported` reviews with an `origin` (e.g. "Google"), both published.
  - Ratings should give a believable average (around 4.6–4.8). Don't make them all 5s.
- Inbox:
  - one `pending` booking request in the future;
  - one open `question`, each with a short message thread.
  - Generate access-token hashes like the repo does (SHA-256 of random bytes), and don't print the
    plain tokens.

**Copy:** write it like a good boutique travel magazine: specific, sensory, restrained. No clichés
("nestled", "hidden gem", "breathtaking"), no exclamation marks, and keep the language British or
Malaysian English. The aim is to stress the layouts with realistic length variation: a short tagline,
long story paragraphs, a review long enough to wrap many lines, and one very short review.

### Mechanics

- New module `src/lib/server/db/seed/sample-property.ts`, added to `seedModules` after `amenities`.
  It needs the dev user and amenities to exist.
- **Idempotent:** if the property slug already exists, skip it and report `skipped`. Seed everything
  in **one transaction**, so a failure leaves no half property behind.
- Respect every CHECK and invariant that the repos enforce. The seed bypasses the repos, so it must
  produce data the repos would have produced:
  - same-library media;
  - images where an image is required;
  - price snapshots computed as `nightly_rate_minor × nights`;
  - `published_at` and `moderated_at` set consistently;
  - `author_name` as a display name, never an email;
  - `expires_at`;
  - lowercased emails.
- Dates relative to "now" (past stays, future requests) should be computed in the property's
  timezone, so the seed stays valid whenever it runs.

### Verification (the "queryable end-to-end" criterion)

- Extend `src/lib/server/db/seed/seed.db.test.ts`, or add a sibling db test.
- Run the seed against the test database, then read the property back **through the repos**:
  - `getRenderableMicrosite` returns the 8 enabled sections, with gallery `zoom`;
  - `getPublicPropertyLocation` has no address lines and coarsened coordinates;
  - the hero and gallery media come back with at least 6 gallery items;
  - the host profile has an image avatar;
  - the attractions are ordered;
  - `getRatingSummary` counts only published reviews and returns the expected average;
  - `listReviews` excludes the pending review;
  - the inbox lists one pending booking and one question.
- Also test that a second seed run is skipped and that the row counts are unchanged.

## Out of scope (don't)

- No UI or routes, no new images, no schema or migration changes.
- If a schema gap blocks something, stop and report it rather than altering the schema.

## Acceptance

- `bun run db:reset` locally produces the sample property. Do this against a scratch database
  first; then the orchestrator resets `local`.
- `check`, `lint`, `test` and `test:db` are green, and so is CI (all three jobs are required on
  `main`).
- Run `prettier --check` on the changed files.
- `docs/DATABASE.md` → Seeding describes the sample property, its slug constant and the imagery
  strategy.

## House rules

- See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup.
- Branch `ust-20-sample-property`.
- Stage explicit paths only; never `git commit -a`.
- The commit trailer names the model actually running.
- Linear UST-20 goes In Progress → Done.
- Open a PR to `main`, don't merge, and don't edit `WORKFLOW.md`.
- Poll `gh pr checks <n>` until all jobs finish. If a job fails, read
  `gh run view <id> --log-failed` and fix the cause.

## Report back to orchestrator

- PR link and CI result.
- The property name, slug, and a two-line summary of the copy.
- Any schema gaps found.
- Deviations.
- New-issue candidates.
