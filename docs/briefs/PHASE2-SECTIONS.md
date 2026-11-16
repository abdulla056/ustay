# Worker Brief — Phase 2 microsite sections (UST-23 … UST-30)

One brief for the eight section issues. Each worker builds **one** section, named in their prompt,
in parallel with the others. Read the shared rules, then your section's part.

## Shared context

UST-21/22 (PR #40) built `/s/<slug>`, `loadMicrosite` and the view model in
`src/lib/features/microsite/types.ts`. It also built the registry (`sections.ts`), the renderer, and
a **placeholder component per section** in `src/lib/features/microsite/sections/`. Your job is to
**replace the internals of your section's component** with the real design, against the seeded
property **Rumah Kabus** (`/s/rumah-kabus`).

### Read first

- `DESIGN.md`, all of it. It is the brief for how this should look and move. Also read
  `PROJECT_CONTEXT.md`, `references/` (README, CURATED, SHORTLIST, MOTION) and
  `src/routes/prototype/+page.svelte`, which is the signature look.
- `docs/ARCHITECTURE.md`: the microsite section, how a section plugs in, the markdown rule, and the
  components-vs-features split.
- `src/lib/features/microsite/*`, especially `types.ts` (your section's `data` type) and your
  placeholder component.
- The `$lib` primitives (`src/lib/components/*` and their stories) and `$lib/motion` (`reveal`,
  `displayEntrance`, parallax, `refreshMotion`, reduced-motion gating). Use them; don't hand-roll
  motion.
- `src/lib/server/db/seed/sample-property.ts`, the real copy you are designing for.

### Rules for every section

- **Scope:** your section's component, plus any new files under
  `src/lib/features/microsite/sections/<your-section>/` if it needs sub-components. Add a
  `<Name>Section.stories.svelte` and a browser test (`*.svelte.test.ts`).
- **Don't** change `types.ts`, `load.ts`, the registry, the renderer, other sections, Nav, Footer or
  `layout.css`. If your section needs **more data**, stop and report exactly what field and why; the
  orchestrator coordinates contract changes. Small presentational helpers local to your section are
  fine.
- **Keep the props contract** `{ data, variant }` and the root `data-section="<type>"` attribute.
- **Tone:**
  - `hero` and `booking_cta` use `<Section tone="inverse">` (dark).
  - The editorial middle sections are light.
  - This follows DESIGN.md's dark → light → dark arc. UST-31 owns the final tonal choreography, so
    use the `Section` tone prop, not hard-coded colours.
- **Accent:** use the `accent` tokens (`text-accent-c`). Never use a hex value. UST-31 makes the
  accent per-property.
- **Images:** use `$lib/components/Image.svelte` with width, height and alt from the data. Focal
  points go through `objectPosition()` from `$lib/features/gallery/layouts.ts`. The hero image is
  eager; everything else is lazy.
- **Motion:** weighted and restrained, per DESIGN.md. Use only `$lib/motion` attachments. Reduced
  motion must give a complete static layout. Without JS, the content is fully visible and readable.
- **Accessibility:**
  - Headings must keep the correct order. The hero owns the only `h1`; sections use `h2`.
  - Text must meet AA contrast in both tones.
  - Everything must be reachable by keyboard and have visible focus.
  - Dialogs use native `<dialog>`, following the pattern in `src/lib/components/NavMenu.svelte`.
- **Responsive:** 360px through 1440px wide, with no horizontal scroll.
- **Story:** add a story with the Rumah Kabus data (copy the fixture from the seed or the loader
  test), plus an edge-case story: long text, few items, or missing optional fields.
- **Variants:** honour `variant` where the registry defines more than `default` (see `registry.ts`).
- **No new dependencies**, except where your section below says so.
- Run the Svelte MCP autofixer on every `.svelte` file until clean.
- Gates:
  - `bun run check`, `lint`, `test` and `test:e2e` pass locally;
  - CI passes (all three jobs are required on `main`);
  - the existing e2e test that `/s/rumah-kabus` renders every `data-section` with no console errors
    must keep passing.
- Check your section by eye at desktop (1440) and phone (390) widths, and keep the screenshots for
  your report. Postgres is already running on port 5432, so don't run `docker compose up`. Never use
  port 5173, and stop any server you start.

## Per section

### UST-23 — Hero (`hero`)

- **Layout:** a full-bleed, full-viewport hero image (the focal point honoured), dark tone. Over it go
  the property name in display type with `displayEntrance` (the masked line reveal), the tagline,
  and the place label.
- **Reference:** the Woodvelly touch from DESIGN.md is a booking affordance living over the photo.
  Use a restrained CTA ("Request to stay", say) that anchors to the booking section (`#booking`).
  Coordinate with UST-30, whose root gets `id="booking"`.
- **Motion:** at most a slow image scale-settle on load. Respect reduced motion. Leave room at the
  top for the fixed nav (UST-31).

### UST-24 — Overview (`overview`)

- **Content:**
  - the short description as a lead paragraph, then the long description;
  - **key facts**: rooms, sleeps, from-price via `formatMoney`, and the place label;
  - a few **highlights**, from the data the overview already has.
- **Reviews:** the rating summary and the review excerpts currently live in `overview.data`. Design
  them as a quiet pull-quote moment, not a review widget. Every imported review must show its
  origin label (e.g. "via Google") — the trust rule in DATABASE.md.
- Use the numbered editorial section spine from DESIGN.md (e.g. "01 — The house"). Replace the
  "About this boutique" placeholder heading.

### UST-25 — Rooms (`rooms`)

- **Room cards:** image, name, sleeps, beds, and the nightly price per night with `formatMoney`.
  Avoid "rounded corporate cards" (DESIGN.md's "never" list): editorial, image-led.
- **Detail view:** a native `<dialog>` with more images, the full description and room amenities. It
  must have correct focus handling, Esc to close and scroll lock.
- If a room has no images, show a composed text-only card.

### UST-26 — Gallery (`gallery`)

- **Variants:**
  - `zoom` uses the existing `ZoomGallery`. Don't rewrite it; use it.
  - `grid` (and `default`) is an editorial grid.
- **Lightbox:** for every variant, clicking or pressing Enter on a frame opens a full-screen
  lightbox. It's a native `<dialog>`; use the arrow keys to move between photos, Esc to close, show
  the caption and alt text, and preload the neighbouring images.
- **Zoom-variant entry:** the zoom variant needs a way into the lightbox that doesn't fight the scroll
  animation. A "View all photographs" button after the sequence works.
- Lazy-load every image except the first.

### UST-27 — Amenities (`amenities`)

- **Layout:** group the amenities by category, in category order, each with an icon. Show the
  amenity `note` where present. It should be scannable but editorial (not a checklist wall). Collapse
  long lists behind "Show all" on phone widths.
- **Icons:** add **`@lucide/svelte`** (tree-shaken) as the one allowed new dependency, and flag it
  in the PR.
  - Map every amenity `icon` key (the 24 keys in `src/lib/server/db/seed/amenities.ts`, where
    icon equals key) to a Lucide icon in `src/lib/features/microsite/sections/amenities/icons.ts`,
    with a neutral fallback icon.
  - Use a thin stroke (around 1.25) and size it to the type.
  - Add a unit test that every standard key has a mapping.

### UST-28 — Host and story (`host_story`)

- **Content:**
  - the story heading in display type;
  - the story body, which is server-sanitised HTML rendered with `{@html}`, so style its prose
    elements;
  - the host: avatar, display name, bio (also HTML), languages and "hosting since".
- **Layout:** this is the authenticity centrepiece. Give it a long-form editorial layout that is
  generous, readable and well measured (max-width for line length). The pull-quote treatment is
  optional.
- **Not here:** local recommendations live in the location section (UST-29).

### UST-29 — Location, map and attractions (`location`)

- **Content:** the place label, the area description, and the attractions list. Each attraction shows
  its category, travel time and mode or distance, the host's note, its image if it has one, and its
  link.
- **Map:** use **MapLibre GL JS** (`maplibre-gl`) with **OpenFreeMap** vector tiles (no API key,
  OSM data). It is the one allowed new dependency, so flag it.
  - Load it **client-only and lazily**, when the section nears the viewport, with a static,
    accessible fallback (the list alone) before that, without JS, and with reduced motion. Avoid a
    scroll-jacking map: no scroll zoom until the user clicks into it.
  - **Privacy (decision 8):** when the location isn't exact (`showExactLocation` is false), draw an
    **approximate circle of about 1 km** around the coarsened point, not a pin.
  - Attractions with coordinates get small markers linked to their list items.
  - Include OSM/OpenFreeMap attribution.

### UST-30 — Booking and contact CTA, stub (`booking_cta`)

- **Layout:** dark tone, with the root `id="booking"`. Show a closing invitation and the from-price.
- **Form UI:** check-in and check-out dates, adults and children, room (optional, from the data),
  name, email, and a message. It's **non-functional for now**. Submitting shows a calm inline notice,
  "Requests open soon", and persists nothing.
- Do the validation UI properly: native constraints plus inline errors, reusing
  `$lib/components/Field.svelte`. Phase 6 wires it to `createBookingRequest`.
- Make the form reachable from the hero CTA anchor.

## Report back to orchestrator

PR link, CI result, screenshots (desktop and phone), any data you needed but didn't have, deviations,
and new-issue candidates.
