# Worker Brief — UST-14: Media model (images / video)

Linear: https://linear.app/abdulla-safar/issue/UST-14/model-mediaasset-images-video

## Mission

Model a property's media: the photographs and video that carry Ustay's cinematic look. It needs a
per-property media library, plus ordered placements of those assets on the property (hero, gallery)
and on rooms. The microsite (Phase 2) and the owner media library (Phase 3) both build on it.

## Read first (in the repo)

- `docs/DATABASE.md` (including the new "Integration tests" section if UST-41 has merged),
  `docs/DECISIONS.md`, `docs/ARCHITECTURE.md` → Data access.
- `DESIGN.md` → photography (what the hero/gallery need: aspect ratios, focal point, captions).
- `src/lib/server/db/*.schema.ts`, `relations.ts`, `src/lib/server/property/*.repo.ts` and the
  `*.db.test.ts` files from UST-41.

## Decisions (made by the orchestrator)

- **Storage for MVP is external URLs only.** No upload pipeline (that comes with Phase 3/6 image
  storage on R2). Add a nullable `storage_key` now so R2-hosted assets can slot in without a
  migration of meaning. A row has a `url` (required for now) and an optional `storage_key`.
- **The library is per-property.** `media_asset.property_id` (cascade). An asset belongs to exactly
  one property's library. A host avatar (UST-15) will reference an asset by id later; don't model
  hosts here.
- **Explicit placement tables, not polymorphism**: `property_media` (asset × role × order) and
  `room_media` (asset × order). Role enum `media_role`: `hero`, `gallery`, `thumbnail`. Enforce at
  most one `hero` per property with a partial unique index.
- `media_kind` enum: `image`, `video`. Required metadata: `width`, `height` (positive ints, so the UI
  can reserve aspect ratio and avoid layout shift) and `alt_text` (required, non-empty: accessibility
  is not optional). Optional: `caption`, `credit`, focal point `focal_x`/`focal_y` (0–1 reals) for
  art-directed crops, and `duration_seconds` + `poster_asset_id` (self-FK, set null) for video.
- Placements must reference assets from the **same property**. Enforce this in the repository and
  test it. Optionally also enforce it in the database with a composite FK; that's your call, so explain
  it in the report.
- Repository at `src/lib/server/property/media.repo.ts`, following the existing conventions:
  - library CRUD;
  - `listPropertyMedia(propertyId, role?)` ordered;
  - `setPropertyGallery(propertyId, assetIds[])` (replace + order, in a transaction);
  - `setPropertyHero(propertyId, assetId | null)`;
  - `setRoomMedia(roomId, assetIds[])`.
- Tests: schema-shape tests in the default gate. Repository behaviour goes in `*.db.test.ts`, if the
  UST-41 lane is on main when you start (it should be). Cover:
  - the one-hero rule;
  - the cross-property rejection;
  - cascade behaviour;
  - ordering;
  - the alt-text and dimension checks.
- One migration only. Follow the migration clash rule below.

## Out of scope (don't)

- No upload, no image transforms/CDN, no UI or routes, no seed data (UST-20 seeds a full property).

## Acceptance

- Schema, migration, repo and tests as above. `bun run check`, `lint`, `test` green, plus
  `bun run test:db` green locally (Postgres runs via Colima: `colima start` then `docker compose up -d`).
  CI green, both jobs.

## House rules

See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup. Branch `ust-14-media`. The commit
trailer names the model actually running. Linear UST-14 goes In Progress → Done. Push, open a PR to
`main`, don't merge. Poll `gh pr checks <n>` until CI finishes.

**Migration clash rule:** before opening the PR, `git fetch && git rebase origin/main`. If main
gained a migration after yours, delete yours (sql + snapshot + journal entry) and re-run
`bun run db:generate`.

## Report back to orchestrator

PR link, CI result, migration name, the same-property enforcement choice, deviations, new-issue
candidates.
