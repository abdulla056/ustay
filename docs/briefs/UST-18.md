# Worker Brief — UST-18: Booking requests and inquiries

Linear: https://linear.app/abdulla-safar/issue/UST-18/model-booking-and-inquiry

## Mission

Ustay takes **booking requests only** (decision 3): a guest asks, the owner accepts or declines, and
nothing is paid online. Guests can do this with just an email, and accounts are optional (decision 4).
Model the request, its lifecycle, and the message thread between guest and host. This issue is schema
and repository only. The flows (forms, emails, dashboard inbox) come in Phase 6.

## Read first (in the repo)

- `docs/DECISIONS.md` (#2 currency and the money rules, #3, #4), `docs/DATABASE.md`, and
  `docs/ARCHITECTURE.md` → Data access.
- `src/lib/server/db/room.schema.ts` (`nightly_rate_minor`, and the `(id, property_id)` unique for
  composite FKs), `property.schema.ts` (currency, timezone), `auth.schema.ts` (`user`), and
  `helpers.ts`.
- `src/lib/server/validate.ts`, `src/lib/server/db/reorder.ts`, and
  `src/lib/server/property/property.repo.ts` (`lockPropertyOrThrow`, `findPropertyById`). Also read
  the other repos and their `*.db.test.ts` for the hardening patterns: typed errors, `isUuid`, no raw
  Postgres codes, and runtime patch stripping.

## Decisions (made by the orchestrator)

### One table for both kinds: `booking_request`

`kind` is a `pgEnum` `booking_request_kind` with two values. `booking` has dates. `question` is a
general enquiry ("is the villa pet-friendly?") with no dates. Both share the guest fields and a
message thread, and the owner's inbox treats them as one list.

**Columns:**

- **Identity:**
  - `id()`;
  - `property_id`, FK with cascade: guest data goes with the property;
  - `reference`, a short human code, unique and not null, such as `UST-7K3P9Q`. Generate it in the
    repo from an unambiguous alphabet (no `0/O/1/I`) and retry on collision.
- **Room:** `room_id` is nullable. It is a composite FK `(property_id, room_id)` →
  `room(property_id, id)` with `ON DELETE SET NULL (room_id)`. Hand-edit the SQL, as earlier issues
  did, and comment it in the schema.
- **Dates and guests:**
  - `check_in` and `check_out` are `date` columns, nullable. These are calendar dates in the
    property's timezone, not instants;
  - `adults` and `children` are nullable integers.
- **CHECKs:**
  - a `booking` has both dates, `check_out > check_in`, `adults >= 1` and `children >= 0`;
  - a `question` has no dates and no room.
- **Guest:**
  - `guest_name`: required and non-blank;
  - `guest_email`: required. Store it trimmed and lowercased, validate its shape in the repo, and add
    a DB CHECK that it is lowercase and contains `@`;
  - `guest_phone`: nullable;
  - `guest_user_id`: nullable FK to `user`, set null. This is for the optional account.
- **Message:** `message` is the guest's opening note, nullable text.
- **Status:** a `pgEnum` `booking_request_status` with values `pending`, `accepted`, `declined`,
  `cancelled`, `expired` and `closed`, default `pending`.
- **Lifecycle timestamps:**
  - `responded_at` and `cancelled_at`, both nullable `timestamptz`;
  - `expires_at`, a not-null `timestamptz`. The default is created + 72 hours; make it a repo
    constant.
- **Price snapshot, for bookings with a room:**
  - `currency` (copied from the property, not null, with the same `^[A-Z]{3}$` CHECK);
  - `nightly_rate_minor` and `estimated_total_minor`, both nullable integers `>= 0`.
  - The total is `nightly_rate_minor × nights`, following the money rules exactly with no rounding.
    Snapshot it at creation, so later rate changes don't rewrite what the guest was shown.
- **Email-only access:** `guest_access_token_hash` (not null, unique). On create, the repo generates
  a random token of 32 or more bytes with `crypto.getRandomValues`. It stores only the SHA-256 hex and
  returns the plain token **once**, for the Phase 6 email link. Never store or log the plain token.
- `timestamps()`.

**Indexes:** `(property_id, status, created_at desc)` for the inbox, `guest_email`, `guest_user_id`,
and `expires_at` where the status is `pending` (a partial index).

### `booking_message`

- **Columns:**
  - `id()`;
  - `booking_request_id`, FK with cascade;
  - `sender`, a `pgEnum` `booking_message_sender` with values `guest`, `host` and `system`;
  - `author_user_id`: nullable FK to `user`, set null. A guest may have no account;
  - `body`: required and non-blank;
  - `created_at`.
- No updates or edits: messages are append-only.
- Index `(booking_request_id, created_at)`.

### Lifecycle rules (in the repo, tested)

- A `booking` can move:
  - from `pending` to `accepted`, `declined`, `cancelled` or `expired`;
  - from `accepted` to `cancelled`.
- A `question` can move from `pending` to `closed`.
- Everything else throws `BookingTransitionError`.
- `responded_at` and `cancelled_at` are set on the matching transitions.
- Each transition also appends a `system` message ("Request accepted", for example), in the same
  transaction.
- Lock the request row with `FOR UPDATE` while transitioning.
- Who may perform a transition (owner or guest) is the Phase 6 route's job, not this repo's. Note it
  in the docs.

### Repository: `src/lib/server/booking/booking.repo.ts`

- `createBookingRequest(input)` returns `{ request, accessToken }`. It validates the following:
  - the property exists and is `published`; otherwise throw a typed error;
  - the room belongs to the property;
  - the dates are valid;
  - `check_in` isn't in the past in the property's timezone.

  It then snapshots the price and writes the opening message, if any, as the first `guest` message.

- `createQuestion(input)` returns `{ request, accessToken }` and follows the same pattern without
  dates.
- `findBookingRequestById`, `findBookingRequestByReference`, and
  `findBookingRequestByAccessToken(token)` (hash, then look up).
- `listBookingRequests(propertyId, { status?, kind? })` returns the newest first, for the inbox.
- `listGuestRequests({ email?, userId? })`, for the optional guest history.
- The transitions: `acceptRequest`, `declineRequest`, `cancelRequest`, `closeQuestion`, and
  `expireStaleRequests(now = new Date())`. The last one is a single UPDATE that expires overdue
  `pending` bookings and returns their ids. Its system messages go in the same transaction.
- `addMessage(requestId, { sender, authorUserId?, body })` and `listMessages(requestId)`,
  oldest first.
- Use the same hardening as earlier issues: typed errors, no raw Postgres codes, malformed uuids
  return `undefined` or a not-found error, and the executor is the last parameter.

### Relations and tests

- **Relations:** `property.bookingRequests`, `bookingRequest.room`, `bookingRequest.messages`, and
  `bookingRequest.guestUser`.
- **Tests in the default gate:**
  - schema shape;
  - the reference generator: alphabet and length;
  - the transition table, as a pure function exported from the repo or a `booking/lifecycle.ts`.
- **DB tests:**
  - the kind CHECKs;
  - the dates CHECK, including past `check_in` in the property's timezone;
  - only published properties accept requests;
  - a cross-property room is rejected;
  - the price snapshot, which survives a later rate change;
  - deleting a room nulls `room_id` and keeps the request;
  - the email is normalised;
  - the token: found by hash, and the plain token is never stored;
  - every allowed and forbidden transition;
  - each transition writes a system message;
  - `expireStaleRequests`;
  - messages cascade on request delete;
  - a property delete cascades.

**Migration:** one migration only. Follow the migration clash rule below.

## Out of scope (don't)

- No routes, forms, emails, dashboard UI, availability or inventory blocking. Requests don't block
  dates, because the owner decides.
- No payments, and no seed data (that's UST-20).

## Acceptance

- The schema, migration, repo and tests above.
- `bun run check`, `lint`, `test` and `test:db` all green locally, using Colima.
- CI green on all three jobs.
- `bun run db:reset` applies cleanly, run against a scratch database.
- `docs/DATABASE.md` documents the tables, the lifecycle, the token handling, and the "authorisation
  is the route's job" note.

## House rules

See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup.

- Branch: `ust-18-booking-requests`.
- Stage explicit paths only; never `git commit -a`.
- The commit trailer names the model actually running.
- Move Linear UST-18 from In Progress to Done.
- Push, open a PR to `main`, and don't merge. Poll `gh pr checks <n>` until all jobs finish.

**Migration clash rule:** before opening the PR, `git fetch && git rebase origin/main`. If main
gained a migration after yours, delete yours (sql + snapshot + journal entry), re-run
`bun run db:generate`, and re-apply the hand edit.

## Report back to orchestrator

PR link, CI result, migration name, hand edits to the SQL, deviations, new-issue candidates.
