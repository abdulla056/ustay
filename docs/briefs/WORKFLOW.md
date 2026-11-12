# Multi-session workflow

Ustay is built across focused Claude Code sessions instead of one long thread.

- **Orchestrator session** — holds the roadmap, writes briefs, reviews & merges PRs, keeps
  Linear + project memory current. Does not implement issues itself.
- **Worker sessions** — one per Linear issue. Open a fresh session in this repo, paste
  `read docs/briefs/UST-<n>.md and complete it`, and it does that issue end-to-end.

Worker sessions inherit context automatically: `CLAUDE.md`, project memory, `DESIGN.md`,
and the code are all loaded in any session opened in this folder — so briefs stay lean.

## House rules (every worker session)

- Stack: SvelteKit (Svelte 5 runes), TypeScript, Tailwind v4, **bun**.
- Fresh checkout/worktree setup: `bun install`, `bunx playwright install chromium` (browser-mode
  tests), and copy `.env.example` → `.env` (`hooks.server.ts` 500s without `DATABASE_URL`).
- Build to `DESIGN.md` exactly. Validate every `.svelte` with the Svelte MCP autofixer.
- Green gates before finishing: `bun run check`, `bun run lint`, `bun run test`.
- Branch `ust-<n>-<slug>` off latest `main`.
- Commit `UST-<n>: <summary>` + trailer `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
  (use the model actually running the session).
- Linear issue: **In Progress** at start, **Done** at end (tick its checklist).
- Push the branch, **open a PR to `main`, and STOP — do not merge.** The orchestrator/user merges.

## Brief template

```
# Worker Brief — UST-<n>: <title>
Linear: <url>

## Mission
<goal + why>

## Read first (in the repo)
- DESIGN.md, src/routes/prototype/+page.svelte, references/, CLAUDE.md + memory

## Scope (do) / Out of scope (don't)
## Acceptance  (+ check/lint/test green)
## House rules  (see docs/briefs/WORKFLOW.md)
## Report back to orchestrator  (PR link, decisions, new-issue candidates)
```

## Brief index

- `UST-6.md` — Design tokens & Tailwind v4 theme (**DONE + merged**, PR #1)
- `UST-7.md` — Base UI component library in Storybook (**DONE + merged**, PR #3 → 14 primitives in `src/lib/components/`, tone-scope system via `data-tone`)
- `UST-8.md` — Database & Drizzle conventions (**DONE + merged**, PR #2 → `docs/DATABASE.md` + `src/lib/server/db/helpers.ts`)
- `UST-9.md` — Project architecture & app packaging (**DONE + merged**, PR #6 → `docs/ARCHITECTURE.md`, app-shaped package.json, 4 route groups)
- `UST-40.md` — CI workflow: check/lint/test on every PR (**DONE + merged**, PR #5 → `.github/workflows/ci.yml`)
- `UST-45.md` — Motion utility layer, Lenis + GSAP in `src/lib/motion/` (**DONE + merged**, PR #8 → attachments + `/motion` demo; follow-ups UST-51…54)
- `UST-47.md` — Rebuild `/tokens` on the primitives + fix inverse accent contrast (**DONE + merged**, PR #7; API gaps → UST-50)
- `UST-46.md` — Nav + wordmark + motion wired into `(platform)` layout (**DONE + merged**, PR #11, closes UST-51; follow-ups UST-59…62)
- `UST-50.md` — Primitive API refinements from dogfooding (**DONE + merged**, PR #10 → `Label`/`Heading` `as` props, gap seam; round 2 → UST-58)
- `UST-49.md` — Auth route protection in `hooks.server.ts` (**DONE + merged**, PR #9 → `guardRoute()` + typed locals; follow-ups UST-55…57)
- `UST-59.md` — reveal() play-on-mount fix (**DONE + merged**, PR #12 → in-viewport check in reveal/imageReveal/displayEntrance; Linear update pending re-auth)
- `UST-57.md` — Route-group layouts: (dashboard) shell + (auth) card (**DONE + merged**, PR #13 → sign-out via `/dashboard?/signOut` action; Linear update pending re-auth)
- `UST-10.md` — Seed / dev-data infrastructure (**DONE + merged**, PR #14 → `db:seed`/`db:reset` + dev user `owner@ustay.test`; full loop verified against live Postgres 2026-11-11)
- `UST-58.md` — Primitive API refinements, round 2 (**DONE + merged**, PR #16 → Card `headingLevel`, Eyebrow h2–h6, `warnClassCollision()` in `components/dev.ts`, unnamed Section renders `div`)
- `UST-48.md` — Typed Cloudflare bindings / cf-typegen (**DONE + merged**, PR #15 → `bun run cf-typegen`, `App.Platform.env: Env`; runtime types off)
- `UST-11.md` — Property model + slug redirect table + repository (**DONE + merged**, PR #18 → `property.schema.ts`, `property.repo.ts`, first migration `drizzle/0000_*`; repo covered by `test:db` since UST-41)
- `UST-76.md` — Dev placeholder BETTER_AUTH_SECRET so fresh checkouts build (**DONE + merged**, PR #17)
- `UST-12.md` — Room model + room repo; relations moved to `db/relations.ts` (**DONE + merged**, PR #19 → `room.schema.ts`, `room.repo.ts`, migration `drizzle/0001_*`)
- `UST-55.md` — Sign-in / sign-up forms + `Field` primitive (**DONE + merged**, PR #20 → form actions via better-auth, `(auth)/validate.ts`)
- `UST-13.md` — Amenities catalogue + property/room joins + seed (**DONE + merged**, PR #21 → migration 0002, `amenity.repo.ts`, 24 seeded amenities)
- `UST-41.md` — DB integration-test lane (**DONE + merged**, PR #22 → `bun run test:db` on `ustay_test`, CI `db integration` job; sign-in "bug" was curl's Accept header, not the app)
- `UST-61.md` — Footer component in `(platform)` layout (**DONE + merged**, PR #24)
- `UST-60.md` — Nav full mobile menu (done, PRs #25, #30)
- `UST-14.md` — Media model: per-property library + hero/gallery/room placements (done, PR #29)
- `UST-53.md` — Line-splitting for display type (**DONE + merged**, PR #26 → SplitText inside `displayEntrance`, plain-text headings, text-only split + MutationObserver bail-out)
- `UST-77.md` — End-to-end Playwright lane + CI `e2e` job (done, PR #28)
- `UST-52.md` — ZoomGallery feature component (done, PR #31; prototype gallery swapped to it)
- `UST-15.md` — Host profile (1:1, avatar → media_asset) + property story (done, PR #32; db:reset now applies migrations)
- `UST-78` (no brief) — Flaky browser tests: warm-up, robust waits, unthrottled Chromium (done, PR #33)
- `UST-16.md` — Location (1:1, privacy flag), destinations, per-property attractions with host_note (in progress, Sonnet)
