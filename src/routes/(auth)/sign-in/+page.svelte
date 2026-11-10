<script lang="ts">
	// Credential sign-in (UST-55). The form posts to this page's `default` action, so it works
	// without JS; `use:enhance` only keeps the page from reloading and disables the button while
	// the request is in flight. The `(auth)` card from UST-57 supplies the frame.
	import { enhance } from '$app/forms';
	import { Button, Field, Heading, Link, Stack, Text } from '$lib';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let submitting = $state(false);

	// Carry `?redirectTo=` across to sign-up so a visitor who switches forms keeps their destination.
	const signUpHref = $derived(
		data.redirectTo ? `/sign-up?redirectTo=${encodeURIComponent(data.redirectTo)}` : '/sign-up'
	);
</script>

<svelte:head>
	<title>Sign in · Ustay</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<Stack gap="lg">
	<Heading level={1} size="sm" tone="content">Sign in</Heading>

	<form
		method="POST"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				await update();
				submitting = false;
			};
		}}
	>
		<Stack gap="lg">
			<Field
				label="Email"
				name="email"
				type="email"
				autocomplete="email"
				required
				value={form?.email ?? ''}
			/>
			<Field
				label="Password"
				name="password"
				type="password"
				autocomplete="current-password"
				required
			/>

			<input type="hidden" name="redirectTo" value={data.redirectTo ?? ''} />

			{#if form?.message}
				<Text as="p" size="sm" tone="inherit" class="text-accent-c" role="alert">
					{form.message}
				</Text>
			{/if}

			<Button type="submit" disabled={submitting}>Sign in</Button>
		</Stack>
	</form>

	<Text size="sm" tone="muted">
		New to Ustay? <Link href={signUpHref}>Create an account</Link>
	</Text>
</Stack>
