# Worker Brief — UST-19: Reviews

Linear: https://linear.app/abdulla-safar/issue/UST-19/model-review

## Mission

Reviews make a property believable. Ustay's direct-booking model only works if travellers trust what
they read. Model reviews so that genuine guest reviews are clearly distinct from anything an owner
enters. A host can reply in their own voice, and the microsite (Phase 2) and discovery (Phase 5) can
show a rating summary.

## Read first (in the repo)

- `PROJECT_CONTEXT.md` (trust, authenticity) and `docs/DECISIONS.md`.
- `docs/DATABASE.md`, especially the booking section from UST-18, which covers the lifecycle,
  `check_out` as a date in the property's timezone, and the "authorisation is the route's job" note.
- `src/lib/server/db/booking.schema.ts`, `property.schema.ts`, `auth.schema.ts` and `helpers.ts`.
- `src/lib/server/validate.ts`, `src/lib/server/booking/*.ts`, and
  `src/lib/server/property/property.repo.ts` (`lockPropertyOrThrow`, `findPropertyById`). Also read
  the other repos and their `*.db.test.ts` for the hardening patterns: typed errors, `isUuid`, no raw
  Postgres codes, runtime patch stripping, an injected `now`, and the executor as the last parameter.

## Decisions (made by the orchestrator)

### Two sources, never blurred

`source` is a `pgEnum` called `review_source` with two values:

- **`guest`**: a verified review tied to a stay that happened on Ustay.
- **`imported`**: an owner-entered review from elsewhere, for properties that already have a
  reputation, such as a Google review. It needs an `origin` label (for example "Google" or
  "Booking.com"). The UI must always label it as such; record that rule in the docs for Phase 2.

### The `review` table

**Columns:**

- `id()`.
- `property_id`: FK with cascade.
- `source`.
- `booking_request_id`: nullable, **unique**, FK `ON DELETE SET NULL`. A single-column FK is fine
  here.
- `origin`: nullable text.
- `rating`: `smallint`, CHECK 1–5. Whole stars only.
- `title`: nullable text.
- `body`: required, non-blank.
- `author_name`: required, non-blank. For guest reviews, store a display name, such as "Aisha R.",
  never the email address.
- `author_user_id`: nullable FK to `user`, set null.
- `stayed_on`: nullable `date`. For guest reviews, set it from the booking's `check_in`.
- `status`: a `pgEnum` called `review_status` with values `pending`, `published` and `rejected`.
  The default is `pending`.
- `published_at`: nullable.
- `host_reply`: nullable, non-blank when present.
- `host_replied_at`: nullable.
- `timestamps()`.

**CHECKs:**

- A `guest` review has no `origin`. It was created with a booking (enforce that in the repo, since
  the FK may later be nulled).
- An `imported` review has a non-blank `origin` and no booking.
- `host_reply` and `host_replied_at` are either both set or both null.
- `published_at` is set if and only if the status is `published`.

**Indexes:** `(property_id, status, published_at desc)`, plus the unique index on
`booking_request_id`.

### Verified-stay rule (repo, tested)

`createGuestReview` requires all of the following:

- The booking request exists.
- Its kind is `booking` and its status is `accepted`.
- It belongs to the property.
- Its `check_out` is on or before today in the property's timezone (use an injected `now`).
- No review exists yet for that booking. The unique index enforces this; map a 23505 to a typed
  error.

Each failure raises its own typed error. The guest's identity check (the access token or the account)
is the route's job; document that.

### Moderation

- Guest reviews start as `pending`.
- `publishReview` and `rejectReview` are platform or moderation actions. Imported reviews start as
  `pending` too, so an owner can't put fake reviews live on their own.
- **Owners can't delete or edit guest reviews.** The repo offers no update for `rating`, `body` or
  `title` on guest reviews. The owner's tools are a host reply and, for imported reviews only, delete.
  Document that the routes must enforce who calls what.

### Aggregate strategy (decided)

- Compute on read from **published** reviews only. `getRatingSummary(propertyId)` returns:
  - `count`;
  - `average`, rounded half-up to 1 decimal, or `null` when the count is 0;
  - the 1–5 `distribution`;
  - `guestCount` versus `importedCount`.
- Use a single aggregate query and no cached columns. That's cheap at MVP scale. Write in
  `docs/DATABASE.md` that discovery sorting by rating (Phase 5) is when to add a cached or
  materialised summary.

### Repository: `src/lib/server/review/review.repo.ts`

- Creation:
  - `createGuestReview(input)`;
  - `createImportedReview(propertyId, input)`.
- Status changes:
  - `publishReview(id)`;
  - `rejectReview(id)`.
  - Both are allowed only from `pending`. Lock the row and stamp `published_at` from an injected
    `now`.
- Host reply:
  - `setHostReply(id, reply | null)`.
  - A blank or null reply clears it, and a set reply stamps `host_replied_at`.
- `deleteImportedReview(id)`. It refuses guest reviews with a typed error.
- Reads:
  - `listReviews(propertyId, { status?, source?, limit?, cursor? })` returns newest-published
    first. Use a simple keyset cursor on `(published_at, id)` for published reviews.
  - `findReviewById`.
  - `getRatingSummary(propertyId)`.
- Relations:
  - `property.reviews`;
  - `review.bookingRequest`;
  - `review.authorUser`;
  - `bookingRequest.review` (one).

### Tests

**Default gate:**

- the schema shape;
- rounding the average half-up, as a pure helper.

**DB tests:**

- every CHECK;
- the verified-stay rule: wrong status, a question rather than a booking, another property's
  booking, a future `check_out` across timezones, and a duplicate review;
- imported reviews need an `origin`;
- moderation transitions;
- `published_at` stamping;
- the host reply set and clear;
- a guest review can't be deleted;
- the summary counts only published reviews, with the right average and distribution;
- the keyset cursor;
- deleting a booking request nulls `booking_request_id` and keeps the review;
- deleting a property cascades.

### Migration

One migration, following the migration clash rule below. No hand edits should be needed.

## Out of scope (don't)

No routes, UI, emails, review-request emails, photos on reviews, or helpful-votes. No seed data:
that's UST-20.

## Acceptance

- The schema, migration, repo and tests above.
- `bun run check`, `lint`, `test` and `test:db` green locally (Colima).
- CI green on all three jobs. `main` is now branch-protected, and all three are required.
- `bun run db:reset` applies cleanly when run against a scratch database.
- `docs/DATABASE.md` documents the table, the two sources, moderation, the aggregate strategy and
  the labelling rule.

## House rules

- See `docs/briefs/WORKFLOW.md`, including the fresh-worktree setup.
- Branch: `ust-19-reviews`.
- Stage explicit paths only; never `git commit -a`.
- The commit trailer names the model actually running.
- Linear UST-19 goes from In Progress to Done.
- Push and open a PR to `main`, but don't merge. Don't edit `docs/briefs/WORKFLOW.md`.
- Poll `gh pr checks <n>` until all jobs finish.

**Migration clash rule:** before opening the PR, run `git fetch && git rebase origin/main`. If main
gained a migration after yours, delete yours (the SQL, the snapshot and the journal entry) and re-run
`bun run db:generate`.

## Report back to orchestrator

PR link, CI result, migration name, deviations, new-issue candidates.
