<script lang="ts">
	// Account creation (UST-55). Same shape as `/sign-in`: a plain POST to the `default` action,
	// progressively enhanced with `use:enhance`. Validation runs on the server before better-auth
	// is called, so the messages here are the same with or without JS.
	import { enhance } from '$app/forms';
	import { Button, Field, Heading, Link, Stack, Text } from '$lib';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();

	let submitting = $state(false);

	// Carry `?redirectTo=` back to sign-in so the destination survives switching forms.
	const signInHref = $derived(
		data.redirectTo ? `/sign-in?redirectTo=${encodeURIComponent(data.redirectTo)}` : '/sign-in'
	);
</script>

<svelte:head>
	<title>Create account · Ustay</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<Stack gap="lg">
	<Heading level={1} size="sm" tone="content">Create account</Heading>

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
			<Field label="Name" name="name" autocomplete="name" required value={form?.name ?? ''} />
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
				autocomplete="new-password"
				hint="At least 8 characters."
				required
			/>

			<input type="hidden" name="redirectTo" value={data.redirectTo ?? ''} />

			{#if form?.message}
				<Text as="p" size="sm" tone="inherit" class="text-accent-c" role="alert">
					{form.message}
				</Text>
			{/if}

			<Button type="submit" disabled={submitting}>Create account</Button>
		</Stack>
	</form>

	<Text size="sm" tone="muted">
		Already have an account? <Link href={signInHref}>Sign in</Link>
	</Text>
</Stack>
