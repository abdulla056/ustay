<script lang="ts">
	// TEMPORARY placeholder home page (UST-46) — Phase 2 builds the real one.
	//
	// It exists so the chrome above it is actually testable: a dark cinematic hero,
	// then the first light section carrying `tonalScroll()`, which is what makes the
	// fixed nav's dark→light flip visible on `/` rather than only on `/motion`. The
	// copy is placeholder; the *structure* is the part worth keeping —
	//
	//   1. one fixed `data-tonal-backdrop` behind everything, opening on ink,
	//   2. a full-bleed hero in the `inverse` tonal scope,
	//   3. `tonalScroll()` attached to the first section that turns to paper.
	//
	// Section ids match the nav's temporary anchor links in `+layout.svelte`.
	import {
		Button,
		Container,
		Eyebrow,
		Grid,
		Heading,
		Image,
		Label,
		Section,
		Stack,
		Text
	} from '$lib';
	import {
		displayEntrance,
		imageReveal,
		parallax,
		reveal,
		scrollTo,
		tonalScroll
	} from '$lib/motion';

	const gallery = [
		{ src: '/prototype/misty-lake.jpg', alt: 'A misty lake at dawn' },
		{ src: '/prototype/forest-light.jpg', alt: 'Light falling through a forest' },
		{ src: '/prototype/lake-mountain.jpg', alt: 'A still lake below snow-lined mountains' }
	];
</script>

<svelte:head>
	<title>Ustay</title>
	<meta
		name="description"
		content="A property discovery, branding, and booking platform for independent homestays, resorts, boutique hotels, and vacation rentals."
	/>
</svelte:head>

<!-- The single element the tonal dissolve paints. Opens on ink, scrubs to paper. -->
<div data-tonal-backdrop class="fixed inset-0 -z-10 bg-ink"></div>

<Section
	tone="inverse"
	space="none"
	class="relative flex h-svh flex-col justify-end overflow-hidden px-gutter pb-gutter"
>
	<Image
		src="/prototype/hero-forest.jpg"
		alt=""
		ratio="auto"
		rounded="none"
		loading="eager"
		class="absolute inset-0 rounded-none"
		imgClass="h-full!"
		{@attach parallax({
			y: [0, -8],
			scale: [1, 1.1],
			trigger: 'section',
			start: 'top top',
			end: 'bottom top'
		})}
	/>
	<!-- Bottom-weighted only: the nav brings its own scrim for the top of the frame,
	     so the photograph is left alone up there rather than darkened twice. -->
	<div class="absolute inset-0 bg-linear-to-t from-ink/85 via-ink/15 to-transparent"></div>

	<div class="relative">
		<Eyebrow class="mb-6 opacity-90">Independent stays, beautifully told</Eyebrow>
		<Heading level={1} size="xl" tone="inherit" bleed {@attach displayEntrance()}>
			<span class="block"><span class="block">Every stay</span></span>
			<span class="block"><span class="block">has a <em>story.</em></span></span>
		</Heading>
		<Stack
			direction="row"
			gap="lg"
			align="end"
			justify="between"
			wrap
			class="mt-8"
			{@attach reveal({ select: ':scope > *', stagger: 0.1, delay: 0.6, y: 24 })}
		>
			<Text size="lead" tone="inherit" measure="tight" class="opacity-90">
				Homestays, resorts, and hideaways with a character all their own. Discover the place — not
				the listing.
			</Text>
			<Button variant="paper" onclick={() => scrollTo('#stays', { offset: -96 })}>
				Explore stays ↗
			</Button>
		</Stack>
	</div>
</Section>

<!-- The dissolve. `tonalScroll()` belongs on the *first light section* — the arrival
     of this element is the transition, and the tone flip inside it is what the nav
     is reading. -->
<Section tone="inherit" space="lg" id="idea" {@attach tonalScroll()}>
	<Container size="wide">
		<Stack gap="lg">
			<Label number="01">The idea</Label>
			<Heading size="sm" tone="content" class="max-w-4xl" {@attach reveal()}>
				A quiet frame around someone else's <em>picture.</em>
			</Heading>
			<Text size="lead" measure="default" {@attach reveal({ delay: 0.1 })}>
				Every independent property gets a home with the soul of a magazine feature and the machinery
				of a booking engine underneath. Placeholder copy — this page is scaffolding for the nav and
				the scroll, not the real home page.
			</Text>
		</Stack>
	</Container>
</Section>

<Section tone="inherit" space="sm" id="stays">
	<Container size="wide">
		<Stack gap="lg">
			<Stack gap="sm">
				<Label number="02">Stays</Label>
				<Heading size="md" tone="content" {@attach reveal()}>Places with a point of view.</Heading>
			</Stack>
			<Grid cols={3} gap="default">
				{#each gallery as frame, index (frame.src)}
					<Image
						src={frame.src}
						alt={frame.alt}
						ratio="4/5"
						{@attach imageReveal({ delay: index * 0.08 })}
					/>
				{/each}
			</Grid>
			<Eyebrow tone="muted" {@attach reveal({ delay: 0.1 })}>
				Placeholder — UST-46 chrome demo
			</Eyebrow>
		</Stack>
	</Container>
</Section>
