<script lang="ts">
	// The site footer — the chrome counterpart to `Nav` (UST-61), and the last beat of
	// DESIGN.md's dark → light → **dark** arc: the page opens on the ink hero, dissolves
	// into paper, and closes back on ink. It reads as the sign-off of a magazine — a
	// short statement, a few quiet indexes, then the `Ustay` mark set large, like a
	// signature at the foot of the last page — rather than a link dump.
	//
	// ## Tone
	//
	// It is always the ink tone, so it stamps `data-tone="inverse"` itself (the same
	// scope `<Section tone="inverse">` uses) and paints its own `bg-surface`. It does
	// not read `pageTone` and does not touch the tonal backdrop: by the time the footer
	// arrives the backdrop is paper, and the footer simply covers it, so the dissolve
	// above it is left exactly as the page set it up.
	//
	// ## Static
	//
	// Like every primitive it carries no motion of its own. Attachments pass through to
	// the `<footer>`, so the layout reveals it from the outside — and its three direct
	// rows (statement + indexes, the mark, the legal line) are the natural stagger
	// targets: `reveal({ select: ':scope > * > *', stagger: 0.1 })`.
	import type { HTMLAttributes } from 'svelte/elements';
	import Container from './Container.svelte';
	import Eyebrow from './Eyebrow.svelte';
	import Heading from './Heading.svelte';
	import Link from './Link.svelte';
	import Wordmark from './Wordmark.svelte';
	import type { FooterLinkGroup } from './footer';
	import type { NavLink } from './nav';

	type Props = HTMLAttributes<HTMLElement> & {
		/** Index columns. Each renders as its own `nav`, named by its heading. */
		groups?: readonly FooterLinkGroup[];
		/** A short closing statement in the display voice. Omitted when absent. */
		tagline?: string;
		/** The small print beside the copyright line — privacy, terms. */
		legal?: readonly NavLink[];
		/** The copyright line. Defaults to `© <current year> Ustay`. */
		copyright?: string;
		/** Where the sign-off mark points. `null` renders it as plain text. */
		home?: string | null;
		class?: string;
	};

	let {
		groups = [],
		tagline,
		legal = [],
		copyright = `© ${new Date().getFullYear()} Ustay`,
		home = '/',
		class: className,
		...rest
	}: Props = $props();

	// Prefix for the group headings' ids, so each `nav` can be named by its visible
	// heading (`aria-labelledby`) and the two can never drift apart.
	const uid = $props.id();
</script>

<footer
	{...rest}
	data-tone="inverse"
	class={['bg-surface pt-section-sm pb-8 text-content md:pt-section', className]}
>
	<Container size="wide">
		{#if tagline || groups.length}
			<div class="grid gap-y-12 md:grid-cols-12 md:gap-x-grid">
				{#if tagline}
					<Heading as="p" size="sm" tone="content" class="md:col-span-5">{tagline}</Heading>
				{/if}

				{#if groups.length}
					<!--
						Two columns on a phone (three stacked indexes would push the sign-off a
						long way down), then one column per group from `sm`, however many there are.
					-->
					<div
						class="grid grid-cols-2 gap-x-grid gap-y-8 sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none md:col-span-6 md:col-start-7"
					>
						{#each groups as group, index (group.heading)}
							{@const headingId = `${uid}-group-${index}`}
							<nav aria-labelledby={headingId}>
								<Eyebrow as="h2" tone="muted" id={headingId}>{group.heading}</Eyebrow>
								<ul class="mt-5 space-y-3">
									{#each group.links as link (link.label)}
										<li>
											<Link href={link.href} variant="quiet" class="text-sm text-content-prose">
												{link.label}
											</Link>
										</li>
									{/each}
								</ul>
							</nav>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!--
			The sign-off. Edge-aligned with `-ml-optical` so the italic U sits on the
			column edge rather than its side-bearing; the layout's `overflow-x-clip`
			contains it if a narrow viewport ever pushes it past the gutter. The em-based
			bottom padding gives the `y`'s italic descender room above the hairline — the
			display-xl line-height (0.92) would otherwise let it cut through the rule.
		-->
		<div class={[(tagline || groups.length) && 'mt-section-sm']}>
			<Wordmark size="xl" href={home ?? undefined} class="-ml-optical pb-[0.14em]" />
		</div>

		<div
			class="mt-6 flex flex-col gap-4 border-t border-hairline-c pt-6 text-sm text-content-muted sm:flex-row sm:items-center sm:justify-between"
		>
			<p class="font-body">{copyright}</p>
			{#if legal.length}
				<nav aria-label="Legal">
					<ul class="flex flex-wrap gap-x-8 gap-y-2">
						{#each legal as link (link.label)}
							<li><Link href={link.href} variant="quiet">{link.label}</Link></li>
						{/each}
					</ul>
				</nav>
			{/if}
		</div>
	</Container>
</footer>
