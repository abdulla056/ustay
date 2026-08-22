<script lang="ts">
	// Placeholder so `/dashboard` resolves: it is where `(auth)` sends an already signed-in
	// visitor, and where `?redirectTo=` points by default. The owner CMS itself (properties,
	// bookings, …) is later work — this page loads no data of its own beyond what the `(dashboard)`
	// group layout (UST-57) already renders around it, and it also carries that layout's sign-out
	// form action (`+page.server.ts`), since only a page — never a layout — can hold one.
	import { Heading, Text } from '$lib';
</script>

<svelte:head>
	<title>Dashboard · Ustay</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex flex-col gap-3">
	<Heading level={1} size="sm" tone="content">Dashboard</Heading>
	<Text tone="muted" measure="default">
		You are signed in. The owner dashboard is not built yet.
	</Text>
</div>
