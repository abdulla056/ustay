<script lang="ts">
	// The owner CMS shell (UST-57): a persistent sidebar + a top bar, dense and
	// productivity-first per `PROJECT_CONTEXT.md`'s Owner Dashboard section — the
	// editorial flourish of `(platform)` stays out of here on purpose. Static: no
	// Lenis/GSAP, no cinematic scroll, standard document scrolling throughout.
	//
	// Authorisation already happened in `hooks.server.ts` (`docs/ARCHITECTURE.md`) —
	// `+layout.server.ts` only loads `locals.user` for the top bar to render.
	import { enhance } from '$app/forms';
	import { Badge, Button, Link, Text, Wordmark } from '$lib';
	import type { LayoutProps } from './$types';

	const { data, children }: LayoutProps = $props();

	type NavItem = {
		label: string;
		href: string;
		/** The section doesn't exist yet — the route 404s; the badge says so up front. */
		placeholder?: boolean;
	};

	// TEMPORARY (UST-57): the real sections (Bookings, Media, …) are later issues, so
	// most of these 404 on click. Kept here rather than in `$lib/components/nav.ts`
	// because this list is specific to this one route group, not shared chrome.
	const navItems: NavItem[] = [
		{ label: 'Dashboard', href: '/dashboard' },
		{ label: 'Properties', href: '/dashboard/properties', placeholder: true },
		{ label: 'Bookings', href: '/dashboard/bookings', placeholder: true },
		{ label: 'Media', href: '/dashboard/media', placeholder: true },
		{ label: 'Settings', href: '/dashboard/settings', placeholder: true }
	];
</script>

<div class="flex min-h-screen flex-col bg-surface text-content md:flex-row">
	<aside class="border-b border-hairline-c md:w-56 md:shrink-0 md:border-r md:border-b-0">
		<div
			class="flex items-center justify-between gap-4 px-6 py-5 md:flex-col md:items-start md:gap-8 md:py-8"
		>
			<Wordmark href="/" size="xs" />

			<nav aria-label="Dashboard" class="w-full overflow-x-auto md:overflow-visible">
				<ul class="flex gap-1 text-sm md:flex-col">
					{#each navItems as item (item.href)}
						<li>
							<Link
								href={item.href}
								variant="quiet"
								class={[
									'flex items-center gap-2 rounded-frame px-3 py-2 font-medium whitespace-nowrap no-underline',
									item.placeholder && 'text-content-muted'
								]}
							>
								{item.label}
								{#if item.placeholder}
									<Badge variant="outline" class="text-[0.6rem]">Soon</Badge>
								{/if}
							</Link>
						</li>
					{/each}
				</ul>
			</nav>
		</div>
	</aside>

	<div class="flex flex-1 flex-col">
		<header class="flex items-center justify-between gap-4 border-b border-hairline-c px-6 py-4">
			<Text size="sm" tone="muted">
				Signed in as
				<span class="font-medium text-content">{data.user?.name ?? data.user?.email}</span>
			</Text>

			<!-- Absolute action path (not the current route) so this works from every page
			     in the group — a layout cannot hold a form action of its own, only a
			     `+page.server.ts` can (`src/routes/(dashboard)/dashboard/+page.server.ts`). -->
			<form method="POST" action="/dashboard?/signOut" use:enhance>
				<Button type="submit" variant="ghost" size="sm">Sign out</Button>
			</form>
		</header>

		<main class="flex-1 px-6 py-8">
			{@render children()}
		</main>
	</div>
</div>
