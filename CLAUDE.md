## Project Configuration

- **Language**: TypeScript
- **Package Manager**: bun
- **Add-ons**: prettier, eslint, vitest, tailwindcss, drizzle, better-auth, storybook, mcp

## Product Context

Read [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md) for the product vision, goals, constraints, and
design philosophy behind Ustay. Reference it when making product or design decisions.

The locked visual + motion direction lives in [`DESIGN.md`](./DESIGN.md) — build all UI to it.

## Conventions

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — where code lives: the `$lib` layout, the
  `$lib/server` trust boundary, route groups, request flow, and data-access/repository conventions.
  Read before adding a route, a component, or a query.
- [`docs/DATABASE.md`](./docs/DATABASE.md) — Drizzle + Postgres conventions: ids, naming, slugs,
  shared columns, and the `db:push` vs `db:generate` migration workflow. Read before adding a table.

## Development workflow (multi-session)

Ustay is built across focused Claude Code sessions, one per Linear issue, coordinated by an
orchestrator session. See [`docs/briefs/WORKFLOW.md`](./docs/briefs/WORKFLOW.md) for the model and
`docs/briefs/UST-<n>.md` for per-issue briefs. House rules for any **work** session:

- Branch `ust-<n>-<slug>` off `main`; **open a PR, don't merge** (the orchestrator/user merges).
- Build to `DESIGN.md`. Validate every `.svelte` with the Svelte MCP autofixer.
- Green gates before finishing: `bun run check`, `bun run lint`, `bun run test`.
- Commit `UST-<n>: <summary>` + trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Update the Linear issue: In Progress at start, Done at end.

---

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available Svelte MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.
