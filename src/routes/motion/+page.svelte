<script lang="ts">
	// Live demo of the UST-45 motion layer — the visual acceptance surface, the way
	// `/tokens` is for the design tokens. Every utility in `$lib/motion` appears
	// here exactly once, on real `$lib` primitives, in the order a real page would
	// use them: momentum scroll → hero entrance → tonal dissolve → media reveals →
	// parallax frame → editorial reveals.
	//
	// To check the reduced-motion path, turn on "reduce motion" in the OS and
	// reload (or don't — the gate is live, the chip top-right follows it): all
	// content stays visible, nothing animates, and the scroll is the browser's own.
	import {
		Button,
		Card,
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
		pageTone,
		parallax,
		reducedMotion,
		reveal,
		scrollTo,
		smoothScroll,
		tonalScroll
	} from '$lib/motion';

	const gallery = [
		{ src: '/prototype/misty-lake.jpg', alt: 'A misty lake at dawn' },
		{ src: '/prototype/forest-light.jpg', alt: 'Light falling through a forest' },
		{ src: '/prototype/foggy-forest.jpg', alt: 'Fog between dark pines' }
	];

	const stays = [
		{
			src: '/prototype/lake-mountain.jpg',
			alt: 'A still lake below snow-lined mountains',
			title: 'Stillwater Cabin',
			location: 'Lofoten, Norway',
			price: '$220'
		},
		{
			src: '/prototype/forest-light.jpg',
			alt: 'A timber house under tall trees',
			title: 'The Understory',
			location: 'Olympic Peninsula, USA',
			price: '$185'
		},
		{
			src: '/prototype/sun-trees.jpg',
			alt: 'Sun breaking through larch trees',
			title: 'Larch House',
			location: 'Valais, Switzerland',
			price: '$310'
		}
	];
</script>

<svelte:head>
	<title>Ustay — motion layer</title>
	<meta name="description" content="Demo surface for the Lenis + GSAP motion utilities." />
</svelte:head>

<!-- The one element the tonal dissolve paints. Fixed, full-bleed, behind everything. -->
<div data-tonal-backdrop class="fixed inset-0 -z-10 bg-ink"></div>

<!--
	How UST-46's nav consumes the layer: read `pageTone.current`, let CSS carry the
	colour change on the brand curve. No scroll listener, no ScrollTrigger here.
-->
<header
	class={[
		'fixed inset-x-0 top-0 z-20 flex items-center justify-between px-gutter py-6',
		'transition-colors duration-700 ease-editorial',
		pageTone.current === 'light' ? 'text-content' : 'text-on-dark'
	]}
>
	<span class="font-display text-display-xs italic">Ustay</span>
	<Stack direction="row" gap="sm" align="center">
		<Eyebrow as="span" class="hidden opacity-70 sm:block">
			tone: {pageTone.current} · motion: {reducedMotion.current ? 'reduced' : 'full'}
		</Eyebrow>
		<Button variant="outline" size="sm" onclick={() => scrollTo('#stays', { offset: -96 })}>
			Stays ↓
		</Button>
	</Stack>
</header>

<div {@attach smoothScroll()} class="overflow-x-clip">
	<!-- HERO — display entrance on mount, Ken-Burns + parallax on the way out. -->
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
			class="absolute inset-x-0 -inset-y-[6%] rounded-none"
			imgClass="h-full!"
			{@attach parallax({
				y: [0, -10],
				scale: [1, 1.12],
				trigger: 'section',
				start: 'top top',
				end: 'bottom top'
			})}
		/>
		<div class="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-ink/50"></div>

		<div
			class="relative"
			{@attach parallax({ y: [0, -18], trigger: 'section', start: 'top top', end: 'bottom top' })}
		>
			<Eyebrow class="mb-6 opacity-90">Independent stays, beautifully told</Eyebrow>
			<Heading level={1} size="xl" tone="content" bleed {@attach displayEntrance()}>
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
				<Button variant="paper">Explore stays ↗</Button>
			</Stack>
		</div>

		<Eyebrow as="span" class="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-70">
			Scroll
		</Eyebrow>
	</Section>

	<!--
		01 — the signature dissolve. `tonalScroll` is attached to the first light
		section: the backdrop scrubs ink → paper as this arrives, and the tone flips
		inside that transition, which is what the header above is reading.
	-->
	<Section tone="inherit" space="lg" {@attach tonalScroll()}>
		<Container size="wide">
			<Grid cols={3} gap="default">
				<Label number="01">The dissolve</Label>
				<div class="md:col-span-2">
					<Heading size="sm" tone="content" {@attach reveal()}>
						The page doesn't pick a mood. It <em>moves</em> between them.
					</Heading>
					<Text size="lead" measure="default" class="mt-8" {@attach reveal({ delay: 0.1 })}>
						One fixed backdrop, scrubbed from ink to paper as this section arrives, plus a discrete
						tone flip published to <code>pageTone</code> so the nav changes colour with it rather than
						near it. Under reduced motion the swap still happens — just instantly, because a nav in the
						wrong colour is a legibility bug, not decoration.
					</Text>
				</div>
			</Grid>
		</Container>
	</Section>

	<!-- 02 — media reveals: clip wipe + scale settle, once, as each frame enters. -->
	<Section tone="inherit" space="sm">
		<Container size="wide">
			<Stack gap="lg">
				<Stack gap="sm">
					<Label number="02">Media reveal</Label>
					<Heading size="sm" tone="content" {@attach reveal()}>
						The photograph arrives, it doesn't appear.
					</Heading>
				</Stack>
				<Grid cols={3} gap="tight">
					{#each gallery as frame, index (frame.src)}
						<Image
							src={frame.src}
							alt={frame.alt}
							ratio="4/3"
							{@attach imageReveal({ delay: index * 0.08 })}
						/>
					{/each}
				</Grid>
			</Stack>
		</Container>
	</Section>

	<!-- 03 — the parallax frame: media drifting inside a fixed crop. -->
	<Section tone="inherit" space="sm">
		<Container size="wide">
			<Stack gap="lg">
				<Stack gap="sm">
					<Label number="03">Parallax frame</Label>
					<Heading size="sm" tone="content" {@attach reveal()}>Depth, not movement.</Heading>
				</Stack>
				<Image
					src="/prototype/lake-mountain.jpg"
					alt="A still lake below snow-lined mountains"
					ratio="16/9"
					rounded="frame"
					imgClass="h-[124%]! -mt-[12%]"
					{@attach parallax({ y: [-6, 6] })}
				/>
			</Stack>
		</Container>
	</Section>

	<!-- 04 — editorial reveals on the primitives, staggered by their own entry. -->
	<Section tone="inherit" space="lg" id="stays">
		<Container size="wide">
			<Stack gap="lg">
				<Stack gap="sm">
					<Label number="04">Editorial reveal</Label>
					<Heading size="md" tone="content" {@attach reveal()}>Places with a point of view.</Heading
					>
				</Stack>
				<Grid cols={3} gap="default">
					{#each stays as stay, index (stay.title)}
						<Card
							src={stay.src}
							alt={stay.alt}
							title={stay.title}
							location={stay.location}
							price={stay.price}
							priceUnit="/night"
							{@attach reveal({ delay: index * 0.06 })}
						/>
					{/each}
				</Grid>
			</Stack>
		</Container>
	</Section>

	<!-- Closing — the display entrance again, this time on scroll. -->
	<Section tone="inherit" space="lg" class="text-center">
		<Container size="content">
			<Heading size="lg" tone="content" {@attach displayEntrance({ onScroll: true })}>
				<span class="block"><span class="block">Find your <em>story.</em></span></span>
			</Heading>
			<div class="mt-10" {@attach reveal({ delay: 0.2 })}>
				<Button variant="outline">Browse every stay ↗</Button>
			</div>
			<Eyebrow tone="muted" class="mt-16">
				UST-45 — the motion layer, on the UST-7 primitives
			</Eyebrow>
		</Container>
	</Section>
</div>
