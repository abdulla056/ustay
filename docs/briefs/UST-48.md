# Worker Brief — UST-48: Typed Cloudflare bindings (cf-typegen)

Linear: https://linear.app/abdulla-safar/issue/UST-48/typed-cloudflare-bindings-wrangler-types-cf-typegen-script

## Mission

`src/app.d.ts` types `App.Platform.env` as `unknown`. Generate env types with `wrangler types` and
wire them in, so future bindings (R2, KV, secrets) are typed. Small, mechanical issue.

## Read first (in the repo)

- `wrangler.jsonc` (no bindings yet), `src/app.d.ts`, `package.json` scripts, `tsconfig.json`,
  `eslint.config.js`, `.prettierignore`.

## Scope (do) — exact decisions

1. `package.json` script: `"cf-typegen": "wrangler types src/worker-configuration.d.ts"`.
   (`wrangler` is already a devDependency — add no deps.)
2. Run it and **commit** the generated `src/worker-configuration.d.ts`.
   - If the generated runtime types conflict with the existing `CfProperties`/`ExecutionContext`
     usage in `app.d.ts` (duplicate identifiers, check errors), rerun with
     `--include-runtime false` and bake that flag into the script. Pick whichever makes
     `bun run check` pass; say which in the report.
3. In `src/app.d.ts`: `env?: unknown` → `env?: Env` (the interface wrangler generates). Add a
   one-line comment: regenerate with `bun run cf-typegen` whenever `wrangler.jsonc` bindings change.
4. Exclude the generated file from lint and formatting (`.prettierignore` + eslint ignores).
5. One line in `README.md` (setup/scripts area) documenting `bun run cf-typegen`.

## Out of scope (don't)

- No bindings added to `wrangler.jsonc`, no CI changes, no edits to `docs/ARCHITECTURE.md` or
  `src/lib/**` (another worker owns those this wave).

## Acceptance

- `bun run cf-typegen` regenerates the file with no diff on a clean tree.
- `bun run check`, `bun run lint`, `bun run test`, `bun run build` green; CI green on the PR.

## House rules

See `docs/briefs/WORKFLOW.md` (incl. fresh-worktree setup). Branch `ust-48-cf-typegen`.
Commit trailer: `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>`. Linear UST-48 In
Progress → Done. Push, open PR to `main`, don't merge. Poll `gh pr checks <n>` until CI
finishes — don't wait for a notification.

## Report back to orchestrator

PR link, CI result, whether `--include-runtime false` was needed.
