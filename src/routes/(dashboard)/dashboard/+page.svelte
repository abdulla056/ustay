<script lang="ts">
	// Placeholder so `/dashboard` resolves: it is where `(auth)` sends an already signed-in
	// visitor, and where `?redirectTo=` points by default. The owner CMS itself (sidebar layout,
	// properties, bookings) is later work — this page loads no data on purpose.
	import { Heading, Text } from '$lib';
</script>

<svelte:head>
	<title>Dashboard · Ustay</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
	<Heading level={1} size="sm" tone="content">Dashboard</Heading>
	<Text tone="muted" measure="default">
		You are signed in. The owner dashboard is not built yet.
	</Text>
</main>
