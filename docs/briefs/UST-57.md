# Worker Brief — UST-57: Route-group layouts — (dashboard) shell + (auth) card

Linear: https://linear.app/abdulla-safar/issue/UST-57/route-group-layouts-dashboard-shell-auth-card

## Mission

Give the two gated route groups their layouts, per their READMEs and `docs/ARCHITECTURE.md`:
the owner-CMS shell for `(dashboard)` and the bare centred card for `(auth)`. The route guard
(UST-49) and placeholder pages already exist; this wraps them in real chrome.

## Read first (in the repo)

- `src/routes/(dashboard)/README.md` + `(auth)/README.md` — the intent per group.
- `PROJECT_CONTEXT.md` (Owner Dashboard section) — the dashboard prioritises **productivity and
  ease of use** for non-technical owners; editorial flourish belongs to the public site.
- `DESIGN.md` — still the visual language (tokens, type, restraint), applied with a denser hand.
- `src/lib/components/` — compose from the primitives; `src/routes/(platform)/+layout.svelte` —
  the platform layout for contrast (do NOT copy its motion wiring; no Lenis/GSAP in these groups).
- `src/lib/server/auth-guard.ts` — `locals.user` is available in these groups' server loads.

## Scope (do)

- [ ] `src/routes/(auth)/+layout.svelte` — bare centred card on the paper tone: `Wordmark`
      (linking home), a centred content card (hairline/frame per tokens), minimal footer line.
      No nav, no motion.
- [ ] `src/routes/(dashboard)/+layout.svelte` — owner shell: sidebar with `Wordmark`, nav list
      (placeholder items for the future sections: Properties, Bookings, Media, Settings — routes
      may 404 for now, mark clearly as placeholders), a top bar showing the signed-in user
      (`locals.user` via a `+layout.server.ts` load) and a sign-out affordance (POST to
      better-auth's sign-out endpoint or a form action — smallest correct thing).
- [ ] Dense spacing: use the token scale's smaller steps; standard `text-*` sizes over display
      type except the wordmark. No scroll-driven motion; standard scrolling.
- [ ] Mobile: sidebar collapses to something sensible and minimal (no drawer system needed yet).
- [ ] Update both group READMEs to reflect what now exists. Stories optional — layouts are
      route-bound; skip unless trivially extractable.

## Out of scope (don't)

- No dashboard pages/features beyond the existing placeholder, no auth forms (UST-55), no
  changes to `hooks.server.ts`/`auth-guard.ts`, primitives, motion, or `(platform)`/`(microsite)`.
  No dep changes.

## Acceptance

- Signed-out: `/sign-in` renders inside the card layout. `/dashboard` still redirects.
- `bun run check` / `lint` / `test` green; `bun run build` succeeds; CI green on the PR.

## House rules

See `docs/briefs/WORKFLOW.md` (incl. fresh-worktree setup). Branch `ust-57-group-layouts` off
latest `main`. Validate every `.svelte` with the Svelte MCP autofixer. Linear UST-57
In Progress → Done. Push, open a PR to `main`, don't merge.

## Report back to orchestrator

PR link, the layout structure per group, how sign-out is wired, any primitive gaps hit (feeds
UST-58), gate/CI results, new-issue candidates.
