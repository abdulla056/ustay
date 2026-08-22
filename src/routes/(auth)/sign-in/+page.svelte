<script lang="ts">
	// Placeholder so the `(dashboard)` guard in `src/hooks.server.ts` has somewhere to send an
	// anonymous visitor. The real credential form — and reading `?redirectTo=` back off this URL —
	// is its own issue; there is deliberately no form here, so nothing pretends to work. The
	// `(auth)` group layout (UST-57) now supplies the centred card this renders inside of.
	import { Heading, Text } from '$lib';
</script>

<svelte:head>
	<title>Sign in · Ustay</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex flex-col items-center gap-3 text-center">
	<Heading level={1} size="sm" tone="content">Sign in</Heading>
	<Text tone="muted" measure="default">Credential sign-in is not built yet.</Text>
</div>
