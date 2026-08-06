<script lang="ts">
	// Living reference for the Ustay design tokens (UST-6). Everything on this page
	// is rendered with the real Tailwind v4 utilities generated from the @theme block
	// in layout.css — if a swatch or type sample looks right, the token resolves.

	type Swatch = {
		name: string;
		hex: string;
		role: string;
		/** literal utility class so Tailwind generates + we exercise the token */
		box: string;
		border?: boolean;
	};

	const palette: Swatch[] = [
		{ name: 'ink', hex: '#0B0F0E', role: 'Dark canvas · primary text on light', box: 'bg-ink' },
		{
			name: 'paper',
			hex: '#F4EFE6',
			role: 'Warm cream editorial canvas',
			box: 'bg-paper',
			border: true
		},
		{ name: 'accent', hex: '#5C6B52', role: 'Muted forest — labels, one word', box: 'bg-accent' },
		{ name: 'muted', hex: '#6B6F68', role: 'Secondary text on light', box: 'bg-muted' },
		{ name: 'prose', hex: '#4A4D46', role: 'Body copy on light', box: 'bg-prose' },
		{
			name: 'on-dark',
			hex: '#FFFFFF',
			role: 'Text / UI over photography',
			box: 'bg-on-dark',
			border: true
		}
	];

	type TypeSample = { label: string; cls: string; sample: string };

	const displayScale: TypeSample[] = [
		{ label: 'text-display-xl · hero', cls: 'text-display-xl', sample: 'Every stay' },
		{ label: 'text-display-lg · closing', cls: 'text-display-lg', sample: 'Find your story' },
		{
			label: 'text-display · section',
			cls: 'text-display',
			sample: 'Places with a point of view.'
		},
		{
			label: 'text-display-sm · statement',
			cls: 'text-display-sm',
			sample: 'A story shows you a place.'
		}
	];

	const radii = [
		{ name: 'rounded-image', box: 'rounded-image', note: '3px · gallery frames' },
		{ name: 'rounded-frame', box: 'rounded-frame', note: '4px · stay cards' },
		{ name: 'rounded-pill', box: 'rounded-pill', note: '100px · CTAs / nav' }
	];
</script>

<svelte:head>
	<title>Ustay — design tokens</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="min-h-screen bg-surface px-gutter py-24 text-content">
	<header class="mx-auto max-w-5xl">
		<p class="font-body text-eyebrow tracking-eyebrow text-accent uppercase">Ustay · foundations</p>
		<h1 class="mt-6 font-display text-display tracking-display">Design tokens</h1>
		<p class="mt-6 max-w-[52ch] font-body text-lead text-content-prose">
			The Tailwind v4 theme distilled from <code>DESIGN.md</code>. Editorial serif luxury: a warm
			paper canvas, an oversized Fraunces display face, and colour spent sparingly so the
			photography leads. Every sample below is a live utility.
		</p>
	</header>

	<!-- Palette -->
	<section class="mx-auto mt-24 max-w-5xl">
		<h2 class="font-body text-label tracking-label text-accent uppercase">Palette</h2>
		<div
			class="mt-6 grid gap-px overflow-hidden rounded-frame border border-hairline-c sm:grid-cols-2 lg:grid-cols-3"
		>
			{#each palette as color (color.name)}
				<article class="bg-surface p-6">
					<div
						class="{color.box} mb-4 h-24 w-full rounded-image {color.border
							? 'border border-hairline-c'
							: ''}"
					></div>
					<p class="font-display text-xl">{color.name}</p>
					<p class="mt-1 font-body text-sm text-content-muted">{color.hex}</p>
					<p class="mt-2 font-body text-sm text-content-prose">{color.role}</p>
				</article>
			{/each}
		</div>
	</section>

	<!-- Type -->
	<section class="mx-auto mt-24 max-w-5xl">
		<h2 class="font-body text-label tracking-label text-accent uppercase">
			Type — display (Fraunces)
		</h2>
		<div class="mt-8 space-y-10">
			{#each displayScale as t (t.cls)}
				<div>
					<p class="mb-3 font-body text-sm text-content-muted">{t.label}</p>
					<p class="font-display tracking-display {t.cls}">{t.sample}</p>
				</div>
			{/each}
		</div>

		<h2 class="mt-20 font-body text-label tracking-label text-accent uppercase">
			Type — body &amp; utility (Inter)
		</h2>
		<div class="mt-8 space-y-8">
			<div>
				<p class="mb-3 font-body text-sm text-content-muted">text-lead · lead prose</p>
				<p class="max-w-[52ch] font-body text-lead text-content-prose">
					Homestays, resorts, and hideaways with a character all their own. Discover the place — not
					the listing.
				</p>
			</div>
			<div>
				<p class="mb-3 font-body text-sm text-content-muted">text-eyebrow · tracking-eyebrow</p>
				<p class="font-body text-eyebrow tracking-eyebrow uppercase">
					Independent stays, beautifully told
				</p>
			</div>
			<div>
				<p class="mb-3 font-body text-sm text-content-muted">text-label · tracking-label</p>
				<p class="font-body text-label tracking-label text-accent uppercase">01 — The idea</p>
			</div>
			<div>
				<p class="mb-3 font-body text-sm text-content-muted">font-display italic · wordmark</p>
				<p class="font-display text-4xl italic">Ustay</p>
			</div>
		</div>
	</section>

	<!-- Radii + spacing -->
	<section class="mx-auto mt-24 max-w-5xl">
		<h2 class="font-body text-label tracking-label text-accent uppercase">Radii</h2>
		<div class="mt-8 flex flex-wrap gap-8">
			{#each radii as r (r.name)}
				<div class="text-center">
					<div class="{r.box} h-24 w-24 bg-accent"></div>
					<p class="mt-3 font-display text-base">{r.name}</p>
					<p class="font-body text-sm text-content-muted">{r.note}</p>
				</div>
			{/each}
		</div>

		<h2 class="mt-20 font-body text-label tracking-label text-accent uppercase">
			Spacing · gutter
		</h2>
		<p class="mt-3 font-body text-sm text-content-muted">
			<code>px-gutter</code> — the fluid page inset (clamp 1.5rem → 4.5rem) used across every screen.
		</p>
		<div class="mt-6 border border-hairline-c">
			<div class="bg-accent/15 px-gutter py-6">
				<div class="rounded-image bg-surface-inverse p-6 font-body text-sm text-content-on-inverse">
					Content sits inside the gutter.
				</div>
			</div>
		</div>
	</section>

	<!-- Inverse surface -->
	<section
		class="mx-auto mt-24 max-w-5xl rounded-frame bg-surface-inverse p-12 text-content-on-inverse"
	>
		<h2 class="font-body text-label tracking-label uppercase" style="color: var(--color-accent)">
			Inverse surface
		</h2>
		<p class="mt-6 font-display text-display-sm tracking-display">A listing shows you a room.</p>
		<p class="mt-4 max-w-[52ch] font-body opacity-80">
			The dark cinematic mood — <code>bg-surface-inverse</code> /
			<code>text-content-on-inverse</code>. Flip the semantic tokens under a
			<code>[data-theme]</code> selector and this whole system re-themes.
		</p>
	</section>
</main>
