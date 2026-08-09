<script lang="ts">
	// Placeholder so the `(dashboard)` guard in `src/hooks.server.ts` has somewhere to send an
	// anonymous visitor. The real credential form — and reading `?redirectTo=` back off this URL —
	// is its own issue; there is deliberately no form here, so nothing pretends to work.
	import { Heading, Text } from '$lib';
</script>

<svelte:head>
	<title>Sign in · Ustay</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
	<Heading level={1} size="sm" tone="content">Sign in</Heading>
	<Text tone="muted" measure="default">Credential sign-in is not built yet.</Text>
</main>
