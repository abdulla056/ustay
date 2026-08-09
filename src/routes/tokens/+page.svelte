<script lang="ts">
	// Living reference for the Ustay design system.
	//
	// Two jobs, deliberately in one page (UST-47):
	//   1. show the raw UST-6 tokens — palette, type scale, space, form, elevation;
	//   2. dogfood the UST-7 primitives, by being *built* out of them. Every band is a
	//      `Section` + `Container`, every line of type is a `Heading`/`Text`/`Eyebrow`/
	//      `Label`. If this page looks right, the library composes.
	//
	// The outline is built out of the primitives too (UST-50): each band's numbered
	// spine label *is* its heading, so it renders as `Label as="h2"` — no `id` +
	// `aria-labelledby` pair pointing at a paragraph, as this page used to need. The
	// display lines that are only specimens of the type take `Heading as="p"` and stay
	// out of the outline, which leaves h1 → h2 per band → h3 per card.
	//
	// Nothing here hard-codes a colour, a size or a tone. In particular the specimen
	// block at the bottom is rendered twice from a single snippet — once on paper, once
	// inside `<Section tone="inverse">` — and not one component branches on tone. That
	// is the `data-tone` scope in layout.css doing the work: `text-accent-c` resolves to
	// the AA-safe `accent-on-dark` on ink, so the old `style="color: var(--color-accent)"`
	// (3.4:1) is gone.
	import {
		Badge,
		Button,
		Card,
		Container,
		Eyebrow,
		Grid,
		Heading,
		Icon,
		Image,
		Label,
		Link,
		Section,
		Stack,
		Text
	} from '$lib';
	import type { Attachment } from 'svelte/attachments';

	type Swatch = {
		/** Token name, minus the `--color-` prefix. */
		name: string;
		role: string;
		/** Literal utility class — so Tailwind generates it and the token gets exercised. */
		box: string;
		/** Light values need a hairline to be visible on paper. */
		border?: boolean;
	};

	// The light-tone palette: the raw brand values every semantic token starts from.
	const palette: Swatch[] = [
		{ name: 'ink', role: 'Dark canvas · primary text on light', box: 'bg-ink' },
		{ name: 'paper', role: 'Warm cream editorial canvas', box: 'bg-paper', border: true },
		{ name: 'accent', role: 'Muted forest — labels, one word at a time', box: 'bg-accent' },
		{ name: 'muted', role: 'Secondary text on light', box: 'bg-muted' },
		{ name: 'prose', role: 'Body copy on light', box: 'bg-prose' },
		{ name: 'on-dark', role: 'Text / UI over photography', box: 'bg-on-dark', border: true },
		{ name: 'hairline', role: 'Thin rules and dividers', box: 'bg-hairline', border: true }
	];

	// The same neutrals lifted for ink. These exist because the light set fails badly on
	// the dark tone — `accent` is only 3.4:1 there — so the inverse scope swaps in this
	// set instead of reusing them.
	const paletteOnDark: Swatch[] = [
		{ name: 'accent-on-dark', role: 'accent, lifted — 5.0:1 on ink', box: 'bg-accent-on-dark' },
		{ name: 'muted-on-dark', role: 'muted, lifted — 7.0:1 on ink', box: 'bg-muted-on-dark' },
		{ name: 'prose-on-dark', role: 'Body copy on the dark tone', box: 'bg-prose-on-dark' },
		{ name: 'hairline-on-dark', role: 'Dividers on the dark tone', box: 'bg-hairline-on-dark' }
	];

	type DisplaySample = {
		size: 'xl' | 'lg' | 'md' | 'sm' | 'xs';
		token: string;
		note: string;
		sample: string;
	};

	// `Heading`'s optical scale. The weight rides along with the size (the named
	// display-weight tokens, 340/360/440 on the Fraunces variable axis).
	const display: DisplaySample[] = [
		{ size: 'xl', token: 'text-display-xl · font-editorial', note: 'hero', sample: 'Every stay' },
		{
			size: 'lg',
			token: 'text-display-lg · font-editorial',
			note: 'closing',
			sample: 'Find your story'
		},
		{
			size: 'md',
			token: 'text-display · font-statement',
			note: 'section',
			sample: 'Places with a point of view.'
		},
		{
			size: 'sm',
			token: 'text-display-sm · font-statement',
			note: 'statement',
			sample: 'A story shows you a place.'
		},
		{
			size: 'xs',
			token: 'text-display-xs · font-title',
			note: 'stay name',
			sample: 'Stillwater Cabin'
		}
	];

	// Spacing tokens, drawn to scale as bars. Every one of these is also a padding,
	// margin and gap utility (`px-gutter`, `py-section`, `gap-grid`, …).
	const spacings = [
		{ name: 'gutter', bar: 'w-gutter', note: 'clamp 1.5rem → 4.5rem · the fluid page inset' },
		{ name: 'section', bar: 'w-section', note: 'clamp 5rem → 9rem · band rhythm' },
		{ name: 'section-lg', bar: 'w-section-lg', note: 'clamp 6rem → 12rem · hero + closing bands' },
		{ name: 'section-sm', bar: 'w-section-sm', note: 'clamp 3rem → 6rem · tighter bands' },
		{ name: 'grid', bar: 'w-grid', note: 'clamp 1rem → 2rem · between cards' },
		{ name: 'grid-tight', bar: 'w-grid-tight', note: 'clamp 0.6rem → 1.2rem · gallery frames' }
	];

	const radii = [
		{ name: 'rounded-image', box: 'rounded-image', note: '3px · gallery frames' },
		{ name: 'rounded-frame', box: 'rounded-frame', note: '4px · stay cards' },
		{ name: 'rounded-pill', box: 'rounded-pill', note: '100px · CTAs / nav' }
	];

	const frames = [
		{ ratio: '4/5', src: '/prototype/forest-light.jpg', alt: 'Low sun through a stand of pines' },
		{ ratio: '3/2', src: '/prototype/misty-lake.jpg', alt: 'Mist lying flat over a still lake' },
		{ ratio: '16/9', src: '/prototype/sun-trees.jpg', alt: 'Sunlight breaking through treetops' }
	] as const;

	const stays = [
		{
			src: '/prototype/lake-mountain.jpg',
			alt: 'A still lake below snow-lined mountains',
			title: 'Stillwater Cabin',
			location: 'Lofoten, Norway',
			price: '$220'
		},
		{
			src: '/prototype/foggy-forest.jpg',
			alt: 'Fog threading between dark conifers',
			title: 'The Long Room',
			location: 'Cairngorms, Scotland',
			price: '$185'
		},
		{
			src: '/prototype/hero-forest.jpg',
			alt: 'Mist drifting through a forest of tall pines',
			title: 'Pinewood House',
			location: 'Hakone, Japan',
			price: '$310'
		}
	];

	// The swatch captions are *measured*, not typed in: each chip reports the colour it
	// actually painted, via an attachment. So a caption can never drift from the token it
	// claims to describe — which had already happened here, twice over: this page shipped
	// `muted` as #6B6F68 long after UST-7 nudged it to #686C65 for AA, and never mentioned
	// the lifted dark-tone set at all.
	let measured = $state<Record<string, string>>({});

	function readColour(value: string): string {
		const parts = value.match(/[\d.]+/g)?.map(Number);
		if (!parts || parts.length < 3) return '';
		const [r, g, b, alpha = 1] = parts;
		// Nothing painted — e.g. rendered without the stylesheet in a unit test.
		if (alpha === 0) return '';
		const hex = `#${[r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('')}`;
		return alpha < 1 ? `${hex.toUpperCase()} · ${Math.round(alpha * 100)}% α` : hex.toUpperCase();
	}

	/** Reads the resolved paint off a swatch once it is in the document. */
	function reportColour(name: string): Attachment<HTMLElement> {
		return (node) => {
			measured[name] = readColour(getComputedStyle(node).backgroundColor);
		};
	}
</script>

<svelte:head>
	<title>Ustay — design tokens</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- A token name set in the one monospace voice on the page. -->
{#snippet token(name: string)}
	<code class="font-mono text-sm text-content">{name}</code>
{/snippet}

<!-- A colour swatch. This is the one thing on the page that can't be a primitive —
     it *is* a raw token — so `Card` carries it: the `media` snippet takes the chip,
     `children` takes the caption. -->
{#snippet swatch(s: Swatch)}
	<Card>
		{#snippet media()}
			<div
				{@attach reportColour(s.name)}
				class={['h-24 w-full rounded-image', s.box, s.border && 'border border-hairline-c']}
			></div>
		{/snippet}
		<Stack gap="xs">
			<Heading level={3} size="xs" tone="content">{s.name}</Heading>
			<Text size="sm" tone="muted">{measured[s.name] || `--color-${s.name}`}</Text>
			<Text size="sm">{s.role}</Text>
		</Stack>
	</Card>
{/snippet}

<!-- Rendered twice below — once on paper, once on ink — with no tone prop threaded
     through and no conditional anywhere. `Section tone="inverse"` re-points the
     semantic vars and every primitive inside follows. -->
{#snippet specimens()}
	<Stack gap="lg">
		<Stack gap="sm">
			<Text size="sm" tone="muted">
				Button — solid · paper · outline · ghost. The second is
				<em>paper</em>, which is always cream-on-ink because it is for CTAs over photography — so on
				a paper surface it reads as fill-less by design.
			</Text>
			<Stack direction="row" gap="sm" align="center" wrap>
				<Button>Explore stays</Button>
				<Button variant="paper">Reserve</Button>
				<Button variant="outline">
					Reserve
					<Icon><path d="M7 17 17 7M9 7h8v8" /></Icon>
				</Button>
				<Button variant="ghost">Later</Button>
				<Button size="sm" variant="outline">Small</Button>
				<Button disabled>Disabled</Button>
			</Stack>
		</Stack>

		<Stack gap="sm">
			<Text size="sm" tone="muted">Badge — outline · solid · accent</Text>
			<Stack direction="row" gap="sm" align="center" wrap>
				<Badge>Cabin</Badge>
				<Badge variant="solid">Sleeps 4</Badge>
				<Badge variant="accent">Sea view</Badge>
			</Stack>
		</Stack>

		<Stack gap="sm">
			<Text size="sm" tone="muted">Label · Eyebrow · Link</Text>
			<Label number="01">The idea</Label>
			<Eyebrow tone="accent">Independent stays, beautifully told</Eyebrow>
			<Text size="sm">
				Read the <Link href="/prototype">prototype</Link>, or the
				<Link href="https://svelte.dev/docs/kit" external>SvelteKit docs</Link>.
			</Text>
		</Stack>

		<Stack gap="sm">
			<Text size="sm" tone="muted">Card in a Grid — cols=3 · gap-grid</Text>
			<Grid cols={3}>
				{#each stays as stay (stay.title)}
					<Card {...stay} ratio="4/5" />
				{/each}
			</Grid>
		</Stack>
	</Stack>
{/snippet}

<main class="min-h-screen bg-surface text-content">
	<Section space="lg">
		<Container>
			<Eyebrow tone="accent">Ustay · foundations</Eyebrow>
			<Heading level={1} size="md" tone="content" class="mt-6">Design tokens</Heading>
			<Text size="lead" measure="default" class="mt-6">
				The Tailwind v4 theme distilled from <em>DESIGN.md</em>, and the primitives built on it.
				Editorial serif luxury: a warm paper canvas, an oversized Fraunces display face, and colour
				spent sparingly so the photography leads. Every sample below is a live utility or a live
				component — nothing here is a picture of the system.
			</Text>
		</Container>
	</Section>

	<Section space="sm">
		<Container>
			<Label as="h2" number="01">Palette</Label>
			<Text size="sm" tone="muted" measure="default" class="mt-4">
				Values are read back off each rendered chip after mount, so a caption can't drift from its
				token.
			</Text>

			<Grid cols={3} class="mt-8">
				{#each palette as s (s.name)}
					{@render swatch(s)}
				{/each}
			</Grid>

			<!-- The lifted set shown where it is actually used: inside an inverse scope. -->
			<Section tone="inverse" space="none" class="mt-grid rounded-frame p-8">
				<Heading level={3} size="xs">Lifted for the dark tone</Heading>
				<Text size="sm" measure="default" class="mt-2">
					Contrast is part of the palette, not a later fix. The light neutrals fail on ink, so the
					inverse scope swaps in these instead of reusing them.
				</Text>
				<Grid cols={2} class="mt-8">
					{#each paletteOnDark as s (s.name)}
						{@render swatch(s)}
					{/each}
				</Grid>
			</Section>
		</Container>
	</Section>

	<Section space="sm">
		<Container>
			<Label as="h2" number="02">Type — display (Fraunces)</Label>
			<Stack gap="lg" class="mt-8">
				{#each display as d (d.size)}
					<Stack gap="xs">
						<Text size="sm" tone="muted">{d.token} · {d.note}</Text>
						<!-- Specimens of the type, not headings of anything — `as="p"` keeps the
						     display voice out of the outline. -->
						<Heading as="p" size={d.size} tone="content">{d.sample}</Heading>
					</Stack>
				{/each}
				<Stack gap="xs">
					<Text size="sm" tone="muted">
						italic — the calligraphic accent word, and the wordmark
					</Text>
					<Heading as="p" size="sm" tone="content">
						Every stay has a <em>story</em>.
					</Heading>
				</Stack>
			</Stack>
		</Container>
	</Section>

	<Section space="sm">
		<Container>
			<Label as="h2" number="03">Type — body &amp; utility (Inter)</Label>
			<Stack gap="lg" class="mt-8">
				<Stack gap="xs">
					<Text size="sm" tone="muted">text-lead · measure=default (52ch)</Text>
					<Text size="lead" measure="default">
						Homestays, resorts, and hideaways with a character all their own. Discover the place —
						not the listing.
					</Text>
				</Stack>
				<Stack gap="xs">
					<Text size="sm" tone="muted">text-base · measure=tight (34ch)</Text>
					<Text measure="tight">
						Line length is a type decision, so it comes from a measure token rather than a one-off
						width.
					</Text>
				</Stack>
				<Stack gap="xs">
					<Text size="sm" tone="muted">tone — content · prose · muted</Text>
					<Text tone="content">Primary copy sits at full contrast.</Text>
					<Text tone="prose">Running body copy steps back a little.</Text>
					<Text tone="muted">Captions and metadata step back further.</Text>
				</Stack>
				<Stack gap="xs">
					<Text size="sm" tone="muted">text-eyebrow · tracking-eyebrow (0.22em)</Text>
					<Eyebrow>Independent stays, beautifully told</Eyebrow>
				</Stack>
				<Stack gap="xs">
					<Text size="sm" tone="muted">text-label · tracking-label (0.18em)</Text>
					<Label number="04">The idea</Label>
				</Stack>
			</Stack>
		</Container>
	</Section>

	<Section space="sm">
		<Container>
			<Label as="h2" number="04">Space</Label>
			<Stack gap="sm" class="mt-8">
				{#each spacings as s (s.name)}
					<Stack direction="row" gap="sm" align="center" wrap>
						<div class="w-32 shrink-0">{@render token(s.name)}</div>
						<div class={['h-2 shrink-0 rounded-pill bg-accent-c/40', s.bar]}></div>
						<Text size="sm" tone="muted">{s.note}</Text>
					</Stack>
				{/each}
			</Stack>

			<Text size="sm" tone="muted" measure="default" class="mt-10">
				Two more are relative rather than absolute: {@render token('icon')} is
				<em>1em</em>, so an icon always scales with the text beside it, and
				{@render token('optical')} is <em>0.04em</em> of side-bearing correction for edge-bleeding display
				type.
			</Text>

			<div class="mt-8 border border-hairline-c">
				<div class="bg-accent-c/15 px-gutter py-6">
					<Section tone="inverse" space="none" class="rounded-image p-6">
						<Text size="sm">Content sits inside the gutter.</Text>
					</Section>
				</div>
			</div>
		</Container>
	</Section>

	<Section space="sm">
		<Container>
			<Label as="h2" number="05">Form &amp; elevation</Label>

			<Stack direction="row" gap="lg" wrap class="mt-8">
				{#each radii as r (r.name)}
					<Stack gap="xs" align="center">
						<div class={['size-24 bg-accent-c', r.box]}></div>
						<Heading level={3} size="xs" tone="content">{r.name}</Heading>
						<Text size="sm" tone="muted">{r.note}</Text>
					</Stack>
				{/each}
			</Stack>

			<Text size="sm" tone="muted" class="mt-12">Image — ratio + rounded=frame</Text>
			<Grid cols={3} gap="tight" class="mt-4">
				{#each frames as f (f.src)}
					<!-- Caption above the frame: the crops are different heights, so captions
					     underneath would sit on three different baselines. -->
					<Stack gap="xs">
						<Text size="sm" tone="muted">ratio="{f.ratio}"</Text>
						<Image src={f.src} alt={f.alt} ratio={f.ratio} rounded="frame" />
					</Stack>
				{/each}
			</Grid>

			<Text size="sm" tone="muted" class="mt-12">shadow-frame — barely there, on purpose</Text>
			<div class="mt-4 max-w-measure rounded-frame bg-surface p-8 shadow-frame">
				<Text size="sm">
					Depth comes from the photography, not from chrome — so elevation is one shadow, used
					sparingly. Transitions ride {@render token('ease-editorial')}, the single weighted curve
					in the system; hover any button below to feel it.
				</Text>
			</div>
		</Container>
	</Section>

	<Section space="sm" tone="surface">
		<Container>
			<Label as="h2" number="06">Primitives — paper tone</Label>
			<Text size="sm" tone="muted" measure="default" class="mt-4">
				The same specimen block renders below on ink. One snippet, no tone prop, no conditionals.
			</Text>
			<div class="mt-10">{@render specimens()}</div>
		</Container>
	</Section>

	<Section space="lg" tone="inverse">
		<Container>
			<Label as="h2" number="07">Primitives — inverse tone</Label>
			<!-- A pull statement, not this band's title — the label above is the heading,
			     so the display line steps out of the outline with `as="p"`. -->
			<Heading as="p" size="sm" tone="content" class="mt-6">
				A listing shows you a room. A <em>story</em> shows you a place.
			</Heading>
			<Text size="lead" measure="default" class="mt-6">
				The dark cinematic mood. Everything inside this band — the label above, this copy, the
				hairlines, the accent on every hover — resolves through
				{@render token("data-tone='inverse'")} to its lifted value. No component knows it is on ink.
			</Text>
			<div class="mt-10">{@render specimens()}</div>
		</Container>
	</Section>
</main>
