<script lang="ts">
	import gsap from 'gsap';
	import { ScrollTrigger } from 'gsap/ScrollTrigger';
	import Lenis from 'lenis';

	// Nav flips from light (over the dark hero) to ink (over light sections) on scroll.
	let light = $state(false);
	// Enables the sticky zoom-parallax; without JS / with reduced-motion a static gallery shows.
	let animated = $state(false);

	// Prototype for UST-38 — Ustay art direction: editorial serif luxury, cinematic
	// photography, a dark hero that tonally opens into light editorial sections on scroll,
	// carried by weighted, eased motion (layered parallax + scale-on-scroll + smooth momentum).

	// Attachment: smooth scroll + scroll-driven motion, scoped to the page root.
	function motion(root: HTMLElement) {
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		gsap.registerPlugin(ScrollTrigger);

		let lenis: Lenis | undefined;
		const ctx = gsap.context(() => {
			if (reduce) return; // reduced motion: leave everything in its final, visible state
			animated = true;

			lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 });
			lenis.on('scroll', ScrollTrigger.update);
			const raf = (time: number) => lenis!.raf(time * 1000);
			gsap.ticker.add(raf);
			gsap.ticker.lagSmoothing(0);

			// Hero headline: lines rise in sequence on load
			gsap.from('.hero__line span', {
				yPercent: 115,
				duration: 1.15,
				ease: 'power3.out',
				stagger: 0.12,
				delay: 0.15
			});
			gsap.from('.hero__meta > *', {
				y: 24,
				opacity: 0,
				duration: 1,
				ease: 'power2.out',
				stagger: 0.1,
				delay: 0.6
			});

			// Hero image: slow Ken-Burns drift + parallax as it leaves
			gsap.to('.hero__img', {
				scale: 1.12,
				ease: 'none',
				scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
			});
			gsap.to('.hero__content', {
				yPercent: -18,
				ease: 'none',
				scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
			});

			// The signature move: dark → light tonal dissolve as section 01 arrives
			gsap.to('.bg', {
				backgroundColor: '#f4efe6',
				ease: 'none',
				scrollTrigger: { trigger: '.essence', start: 'top 85%', end: 'top 35%', scrub: true }
			});
			// Nav flips from light to dark ink across the same transition
			ScrollTrigger.create({
				trigger: '.essence',
				start: 'top 60%',
				onEnter: () => (light = true),
				onLeaveBack: () => (light = false)
			});

			// Editorial reveals
			gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
				gsap.from(el, {
					y: 40,
					opacity: 0,
					duration: 1.1,
					ease: 'power3.out',
					scrollTrigger: { trigger: el, start: 'top 82%' }
				});
			});

			// Zoom parallax (ported from the framer-motion zoom-parallax): the center image
			// expands to fill the screen while the others scale up and spread out of frame.
			const zoomScales = [4, 5, 6, 5, 6, 8, 9];
			gsap.utils.toArray<HTMLElement>('.zoomp__item').forEach((el, i) => {
				gsap.fromTo(
					el,
					{ scale: 1 },
					{
						scale: zoomScales[i],
						ease: 'none',
						scrollTrigger: { trigger: '.zoomp', start: 'top top', end: 'bottom bottom', scrub: true }
					}
				);
			});

			// Featured cards: soft parallax on their imagery
			gsap.utils.toArray<HTMLElement>('.card__img').forEach((el) => {
				gsap.fromTo(
					el,
					{ yPercent: -8 },
					{
						yPercent: 8,
						ease: 'none',
						scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
					}
				);
			});
		}, root);

		return () => {
			ctx.revert();
			lenis?.destroy();
		};
	}
</script>

<svelte:head>
	<title>Ustay — prototype</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..500&family=Inter:wght@400;500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="bg"></div>

<div class="page" class:is-animated={animated} {@attach motion}>
	<nav class="nav" class:is-light={light}>
		<span class="nav__mark">Ustay</span>
		<ul class="nav__links">
			<li>Stays</li>
			<li>Experiences</li>
			<li>Journal</li>
			<li>About</li>
		</ul>
		<button class="nav__cta">Reserve ↗</button>
	</nav>

	<!-- HERO -->
	<section class="hero">
		<div class="hero__img" style="background-image:url('/prototype/hero-forest.jpg')"></div>
		<div class="hero__scrim"></div>
		<div class="hero__content">
			<p class="hero__eyebrow">Independent stays, beautifully told</p>
			<h1 class="hero__title">
				<span class="hero__line"><span>Every stay</span></span>
				<span class="hero__line"><span>has a <em>story.</em></span></span>
			</h1>
			<div class="hero__meta">
				<p class="hero__sub">
					Homestays, resorts, and hideaways with a character all their own. Discover the place — not
					the listing.
				</p>
				<button class="hero__explore">Explore stays ↗</button>
			</div>
		</div>
		<span class="hero__scroll">Scroll</span>
	</section>

	<!-- 01 · ESSENCE — the dark→light tonal shift lands here -->
	<section class="essence">
		<div class="essence__head">
			<span class="label">01 — The idea</span>
		</div>
		<div class="essence__body">
			<h2 class="statement" data-reveal>
				A listing shows you a room. A <em>story</em> shows you a place.
			</h2>
			<p class="prose" data-reveal>
				Ustay gives every independent property its own branded home — a page with the soul of a
				custom site and the reach of a platform. Not another identical listing in an endless grid,
				but a destination with a personality: its history, its host, its corner of the world.
			</p>
		</div>
	</section>

	<!-- ZOOM PARALLAX — center image expands to fill as the others spread out -->
	<section class="zoomp" aria-label="A few frames">
		<div class="zoomp__stage">
			<div class="zoomp__item zoomp__item--1">
				<div class="zoomp__frame"><img src="/prototype/hero-forest.jpg" alt="Forest cabin in mist" /></div>
			</div>
			<div class="zoomp__item zoomp__item--2">
				<div class="zoomp__frame"><img src="/prototype/lake-mountain.jpg" alt="Mountain lake" /></div>
			</div>
			<div class="zoomp__item zoomp__item--3">
				<div class="zoomp__frame"><img src="/prototype/misty-lake.jpg" alt="Misty lake at dawn" /></div>
			</div>
			<div class="zoomp__item zoomp__item--4">
				<div class="zoomp__frame"><img src="/prototype/forest-light.jpg" alt="Light through the forest" /></div>
			</div>
			<div class="zoomp__item zoomp__item--5">
				<div class="zoomp__frame"><img src="/prototype/sun-trees.jpg" alt="Sun through trees" /></div>
			</div>
			<div class="zoomp__item zoomp__item--6">
				<div class="zoomp__frame"><img src="/prototype/foggy-forest.jpg" alt="Foggy forest" /></div>
			</div>
			<div class="zoomp__item zoomp__item--7">
				<div class="zoomp__frame"><img src="/prototype/lake-mountain.jpg" alt="Mountain lake reflection" /></div>
			</div>
		</div>
	</section>

	<!-- FEATURED STAYS -->
	<section class="featured">
		<div class="featured__head">
			<span class="label">02 — A few of our stays</span>
			<h2 class="featured__title" data-reveal>Places with a point of view.</h2>
		</div>
		<div class="grid">
			<article class="card" data-reveal>
				<div class="card__frame">
					<div class="card__img" style="background-image:url('/prototype/lake-mountain.jpg')"></div>
				</div>
				<div class="card__row">
					<div>
						<h3 class="card__name">Stillwater Cabin</h3>
						<p class="card__loc">Lofoten, Norway</p>
					</div>
					<p class="card__price">$220<span>/night</span></p>
				</div>
			</article>
			<article class="card card--tall" data-reveal>
				<div class="card__frame">
					<div class="card__img" style="background-image:url('/prototype/forest-light.jpg')"></div>
				</div>
				<div class="card__row">
					<div>
						<h3 class="card__name">The Understory</h3>
						<p class="card__loc">Olympic Peninsula, USA</p>
					</div>
					<p class="card__price">$185<span>/night</span></p>
				</div>
			</article>
			<article class="card" data-reveal>
				<div class="card__frame">
					<div class="card__img" style="background-image:url('/prototype/sun-trees.jpg')"></div>
				</div>
				<div class="card__row">
					<div>
						<h3 class="card__name">Larch House</h3>
						<p class="card__loc">Valais, Switzerland</p>
					</div>
					<p class="card__price">$310<span>/night</span></p>
				</div>
			</article>
		</div>
	</section>

	<!-- CLOSING -->
	<section class="closing">
		<h2 class="closing__title" data-reveal>Find your <em>story.</em></h2>
		<button class="closing__cta" data-reveal>Browse every stay ↗</button>
		<p class="closing__foot">Ustay — a prototype exploring art direction (UST-38).</p>
	</section>
</div>

<style>
	:global(html) {
		scroll-behavior: auto;
	}

	.bg {
		position: fixed;
		inset: 0;
		background-color: #0b0f0e;
		z-index: -1;
	}

	.page {
		--ink: #0b0f0e;
		--paper: #f4efe6;
		--accent: #5c6b52;
		font-family: 'Inter', system-ui, sans-serif;
		color: #f4efe6;
		overflow-x: clip;
	}

	em {
		font-style: italic;
		font-optical-sizing: auto;
	}

	/* ---------- nav ---------- */
	.nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.6rem clamp(1.2rem, 4vw, 3.5rem);
		color: #fff;
		mix-blend-mode: normal;
		transition: color 0.5s ease;
	}
	.nav.is-light {
		color: var(--ink);
	}
	.nav__mark {
		font-family: 'Fraunces', serif;
		font-size: 1.5rem;
		font-weight: 500;
		letter-spacing: -0.01em;
	}
	.nav__links {
		display: flex;
		gap: 2.2rem;
		list-style: none;
		margin: 0;
		padding: 0;
		font-size: 0.9rem;
		font-weight: 500;
	}
	.nav__links li {
		cursor: pointer;
		opacity: 0.85;
	}
	.nav__cta {
		border: 1px solid currentColor;
		background: transparent;
		color: inherit;
		padding: 0.55rem 1.25rem;
		border-radius: 100px;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
	}
	@media (max-width: 720px) {
		.nav__links {
			display: none;
		}
	}

	/* ---------- hero ---------- */
	.hero {
		position: relative;
		height: 100svh;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		padding: clamp(1.5rem, 5vw, 4.5rem);
	}
	.hero__img {
		position: absolute;
		inset: -5% 0 0 0;
		background-size: cover;
		background-position: center;
		will-change: transform;
	}
	.hero__scrim {
		position: absolute;
		inset: 0;
		background:
			linear-gradient(180deg, rgba(11, 15, 14, 0.55) 0%, rgba(11, 15, 14, 0.05) 35%),
			linear-gradient(0deg, rgba(11, 15, 14, 0.85) 0%, rgba(11, 15, 14, 0) 55%);
	}
	.hero__content {
		position: relative;
		z-index: 2;
		will-change: transform;
	}
	.hero__eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.22em;
		font-size: 0.72rem;
		font-weight: 500;
		margin: 0 0 1.2rem;
		opacity: 0.9;
	}
	.hero__title {
		font-family: 'Fraunces', serif;
		font-weight: 340;
		font-size: clamp(3.2rem, 12vw, 12rem);
		line-height: 0.92;
		letter-spacing: -0.02em;
		margin: 0;
		margin-left: -0.04em;
	}
	.hero__line {
		display: block;
		overflow: hidden;
	}
	.hero__line > span {
		display: block;
		will-change: transform;
	}
	.hero__meta {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 2rem;
		margin-top: 2rem;
		flex-wrap: wrap;
	}
	.hero__sub {
		max-width: 34ch;
		font-size: 1.05rem;
		line-height: 1.5;
		opacity: 0.92;
		margin: 0;
	}
	.hero__explore {
		border: none;
		background: var(--paper);
		color: var(--ink);
		padding: 0.9rem 1.8rem;
		border-radius: 100px;
		font-size: 0.95rem;
		font-weight: 500;
		cursor: pointer;
		white-space: nowrap;
	}
	.hero__scroll {
		position: absolute;
		bottom: 1.4rem;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.7rem;
		letter-spacing: 0.25em;
		text-transform: uppercase;
		opacity: 0.7;
		z-index: 2;
	}

	/* ---------- essence (light) ---------- */
	.label {
		font-size: 0.75rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		font-weight: 500;
		color: var(--accent);
	}
	.essence {
		color: var(--ink);
		padding: clamp(6rem, 16vh, 12rem) clamp(1.5rem, 5vw, 4.5rem);
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: clamp(2rem, 6vw, 6rem);
	}
	.essence__body {
		max-width: 60ch;
	}
	.statement {
		font-family: 'Fraunces', serif;
		font-weight: 360;
		font-size: clamp(1.9rem, 4.4vw, 3.6rem);
		line-height: 1.08;
		letter-spacing: -0.015em;
		margin: 0 0 2rem;
	}
	.prose {
		font-size: 1.1rem;
		line-height: 1.65;
		color: #4a4d46;
		margin: 0;
		max-width: 46ch;
	}
	@media (max-width: 720px) {
		.essence {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}
	}

	/* ---------- zoom parallax ---------- */
	/* Default / no-JS / reduced-motion: a clean static gallery. */
	.zoomp {
		color: var(--ink);
		padding: clamp(3rem, 8vh, 6rem) clamp(1.5rem, 5vw, 4.5rem);
	}
	.zoomp__stage {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: clamp(0.6rem, 1.5vw, 1.2rem);
	}
	.zoomp__frame {
		aspect-ratio: 4 / 3;
		overflow: hidden;
		border-radius: 3px;
	}
	.zoomp__frame img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	/* Animated (JS + motion allowed): sticky zoom-out reveal. */
	.is-animated .zoomp {
		height: 300vh;
		padding: 0;
	}
	.is-animated .zoomp__stage {
		position: sticky;
		top: 0;
		height: 100svh;
		overflow: hidden;
		display: block;
	}
	.is-animated .zoomp__item {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		will-change: transform;
	}
	.is-animated .zoomp__frame {
		position: relative;
		height: 25vh;
		width: 25vw;
		aspect-ratio: auto;
		border-radius: 0;
	}
	.is-animated .zoomp__item--2 .zoomp__frame {
		top: -30vh;
		left: 5vw;
		height: 30vh;
		width: 35vw;
	}
	.is-animated .zoomp__item--3 .zoomp__frame {
		top: -10vh;
		left: -25vw;
		height: 45vh;
		width: 20vw;
	}
	.is-animated .zoomp__item--4 .zoomp__frame {
		left: 27.5vw;
		height: 25vh;
		width: 25vw;
	}
	.is-animated .zoomp__item--5 .zoomp__frame {
		top: 27.5vh;
		left: 5vw;
		height: 25vh;
		width: 20vw;
	}
	.is-animated .zoomp__item--6 .zoomp__frame {
		top: 27.5vh;
		left: -22.5vw;
		height: 25vh;
		width: 30vw;
	}
	.is-animated .zoomp__item--7 .zoomp__frame {
		top: 22.5vh;
		left: 25vw;
		height: 15vh;
		width: 15vw;
	}

	/* ---------- featured ---------- */
	.featured {
		color: var(--ink);
		padding: clamp(5rem, 12vh, 9rem) clamp(1.5rem, 5vw, 4.5rem);
	}
	.featured__head {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 3.5rem;
	}
	.featured__title {
		font-family: 'Fraunces', serif;
		font-weight: 360;
		font-size: clamp(2rem, 5vw, 4rem);
		line-height: 1;
		letter-spacing: -0.02em;
		margin: 0;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: clamp(1rem, 2.5vw, 2rem);
		align-items: start;
	}
	.card__frame {
		overflow: hidden;
		border-radius: 4px;
		aspect-ratio: 4 / 5;
	}
	.card--tall .card__frame {
		aspect-ratio: 4 / 6;
	}
	.card__img {
		width: 100%;
		height: 120%;
		margin-top: -10%;
		background-size: cover;
		background-position: center;
		will-change: transform;
	}
	.card__row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-top: 1rem;
		gap: 1rem;
	}
	.card__name {
		font-family: 'Fraunces', serif;
		font-weight: 440;
		font-size: 1.3rem;
		margin: 0;
	}
	.card__loc {
		font-size: 0.9rem;
		color: #6b6f68;
		margin: 0.2rem 0 0;
	}
	.card__price {
		font-family: 'Fraunces', serif;
		font-size: 1.2rem;
		margin: 0;
		white-space: nowrap;
	}
	.card__price span {
		font-family: 'Inter', sans-serif;
		font-size: 0.8rem;
		color: #6b6f68;
	}
	@media (max-width: 720px) {
		.grid {
			grid-template-columns: 1fr;
		}
	}

	/* ---------- closing ---------- */
	.closing {
		color: var(--ink);
		text-align: center;
		padding: clamp(6rem, 18vh, 14rem) 1.5rem;
	}
	.closing__title {
		font-family: 'Fraunces', serif;
		font-weight: 340;
		font-size: clamp(3rem, 10vw, 9rem);
		line-height: 0.95;
		letter-spacing: -0.02em;
		margin: 0 0 2rem;
	}
	.closing__cta {
		border: 1px solid var(--ink);
		background: transparent;
		color: var(--ink);
		padding: 0.9rem 2rem;
		border-radius: 100px;
		font-size: 0.95rem;
		cursor: pointer;
	}
	.closing__foot {
		margin-top: 4rem;
		font-size: 0.78rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: #9a9a92;
	}
</style>
