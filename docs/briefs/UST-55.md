# Worker Brief — UST-55: Sign-in / sign-up forms

Linear: https://linear.app/abdulla-safar/issue/UST-55/auth-ui-sign-in-sign-up-forms-replace-placeholders

## Mission

Replace the `/sign-in` placeholder with a real email + password form, and add `/sign-up`. Both are
SvelteKit form actions calling better-auth on the server, so they work without JS (progressive
enhancement via `use:enhance`). No database runs locally, so you can't sign in end to end. That's
expected; test what you can without one (see Tests).

## Read first (in the repo)

- `src/routes/(auth)/README.md`, `(auth)/+layout.svelte`, `(auth)/sign-in/+page.svelte`.
- `src/lib/server/auth.ts` (better-auth with `emailAndPassword` + `sveltekitCookies`, which sets the
  session cookie automatically when `auth.api.*` is called inside an action).
- `src/lib/server/auth-guard.ts`: `toLocalPath()` (the only sanctioned way to read `?redirectTo=`).
- `src/routes/(dashboard)/dashboard/+page.server.ts`: the existing sign-out action pattern.
- `src/lib/components/Button.svelte`, `Text.svelte`, `Heading.svelte`, `Link.svelte`, `Stack.svelte`,
  plus `Stack.svelte`'s `warnClassCollision` usage and `docs/ARCHITECTURE.md` (components rules).

## Scope (do): exact decisions

### 1. New primitive `src/lib/components/Field.svelte`

A labelled text input. It's domain-agnostic, so it belongs in `components/`.

- Props: `label: string`, `name: string`, `type?: 'text' | 'email' | 'password'` (default
  `'text'`), `value?: string` (bindable), `error?: string`, `hint?: string`, plus the rest of
  `HTMLInputAttributes` spread onto the `<input>`.
- Markup: `<label for={id}>` above the `<input id={id}>`. `id` comes from `$props.id()`. Below them,
  if present, the `hint` (muted) or the `error`, with `id={id + '-msg'}` referenced by
  `aria-describedby`. Set `aria-invalid="true"` when `error` is present.
- Styling, tokens only:
  - label: `font-body text-eyebrow font-medium tracking-eyebrow uppercase text-content-muted`
    (the same classes `Eyebrow` uses; check them there);
  - input: `w-full border-0 border-b border-hairline-c bg-transparent py-3 font-body text-content outline-none transition-colors duration-300 ease-editorial focus:border-accent-c`;
  - error: `text-sm text-accent-c`. Hint: muted.

  If any class name doesn't exist in `src/routes/layout.css`, use the nearest existing token and say
  so in the report.

- `Field.stories.svelte`: default, with hint, with error, password. Export from `src/lib/index.ts`.
- Validate with the Svelte MCP autofixer.

### 2. `/sign-in`, files under `src/routes/(auth)/sign-in/`

- `+page.server.ts`:
  - `load` returns `{ redirectTo: toLocalPath(url.searchParams.get('redirectTo')) }`.
  - The `default` action reads `email`, `password` and `redirectTo` from formData. It returns
    `fail(400, { email, message: 'Enter your email and password.' })` if either is empty. Otherwise
    it calls `auth.api.signInEmail({ body: { email, password }, headers: request.headers })` in a
    try/catch. If it throws `APIError` (from `better-auth/api`), return
    `fail(400, { email, message: 'That email and password don’t match.' })`. Rethrow anything else.
  - On success: `redirect(303, toLocalPath(redirectTo) ?? '/dashboard')`.
- `+page.svelte`: `Heading` "Sign in", then a `<form method="POST" use:enhance>` with Field email
  (`autocomplete="email"`, required), Field password (`autocomplete="current-password"`, required),
  a hidden `redirectTo`, and a `Button type="submit"` "Sign in". The submit button is disabled while
  submitting. Show `form?.message` in a `Text` with `role="alert"`. Refill the email from
  `form?.email`. Add a link "New to Ustay? Create an account" → `/sign-up`, which keeps `?redirectTo`
  if present. Lay it out with `Stack`. Keep the `noindex` head.

### 3. `/sign-up`, under `src/routes/(auth)/sign-up/`

The same shape, plus a `name` field (`autocomplete="name"`). Validation: all three fields required,
password at least 8 characters (`message: 'Use at least 8 characters.'`), checked server-side
**before** calling `auth.api.signUpEmail({ body: { name, email, password }, headers: request.headers })`.
If it throws `APIError`, return `fail(400, { name, email, message: e.body?.message ?? 'Could not create your account.' })`.
Redirect the same way. Add a link back to `/sign-in`.

### 4. Validation helper + tests (no DB)

- Put the pure checks in `src/routes/(auth)/validate.ts`: `validateSignIn(fd)` and
  `validateSignUp(fd)` return either `{ ok: true, data }` or `{ ok: false, message, values }`. Use
  them in both actions.
- `validate.test.ts`: empty fields, a short password, and trimmed email.
- `Field.svelte.test.ts` (browser-mode, copy an existing `*.svelte.test.ts`): the label is linked to
  the input, `aria-invalid` and `aria-describedby` are set when there's an error.

### 5. Decision recorded (no code)

`/reset-password` stays **out of scope**, because email sending doesn't exist yet. Leave
`guardRoute()` unchanged. Add one line to `(auth)/README.md`: "Password reset lands with email
sending (Phase 5); revisit whether it should stay reachable while signed in then."

## Out of scope (don't)

- No social login, no password reset, no email verification, no changes to `auth.ts`,
  `hooks.server.ts` or `auth-guard.ts`.
- Don't touch `src/lib/server/db/`, `src/lib/server/property/`, `drizzle/` (another worker owns them).

## Acceptance

- Both pages render inside the `(auth)` card. Run `bun run dev`, open `/sign-in` and `/sign-up`, and
  submit empty forms to see validation messages. Submitting real credentials will 500/fail without
  a DB, which is expected; note it.
- `bun run check`, `bun run lint`, `bun run test` green; CI green on the PR.

## House rules

See `docs/briefs/WORKFLOW.md`, including fresh-worktree setup. Branch `ust-55-auth-forms`. Commit
trailer: `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>`. Linear UST-55 goes In
Progress → Done. Push, open a PR to `main`, don't merge. Poll `gh pr checks <n>` until CI finishes.

## Report back to orchestrator

PR link, CI result, token substitutions in Field (if any), deviations with reasons.
