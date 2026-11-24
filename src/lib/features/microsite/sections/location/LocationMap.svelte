<script lang="ts">
	// Client-only, lazy MapLibre map (OpenFreeMap tiles, no key). Nothing loads until the section
	// nears the viewport; without JS, offline, or on any failure the slot stays a static note and
	// the attraction list carries the section. Exact location -> a pin; otherwise a circle with a
	// 1 km radius (about 2 km across) that still contains the true point after coarsening. A
	// precise pin is never the fallback: if the circle can't be drawn, the map is dropped.
	import { onMount, untrack } from 'svelte';
	import type { Map as MapLibreMap, Marker as MapLibreMarker } from 'maplibre-gl';
	import { reducedMotion } from '$lib/motion';
	import { circleRing } from './geo';

	type MapMarker = { n: number; name: string; latitude: number; longitude: number };
	type Props = {
		latitude: number;
		longitude: number;
		exact: boolean;
		label: string;
		/** Attractions with coordinates; `n` is the 1-based list position, `#attraction-<n>` the target. */
		markers?: MapMarker[];
	};
	let { latitude, longitude, exact, label, markers = [] }: Props = $props();

	const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
	const TOUCH_IDLE_MS = 2500;
	const SOURCE_ID = 'approx';
	const LAYER_IDS = ['approx-fill', 'approx-line'];

	let host: HTMLDivElement | undefined = $state();
	let status = $state<'idle' | 'loading' | 'ready' | 'failed'>('idle');
	let active = $state(false);
	let coarse = $state(false);

	// Not reactive: the live map and what has been drawn on it.
	let maplibre: typeof import('maplibre-gl') | undefined;
	let map: MapLibreMap | undefined;
	let drawn: MapLibreMarker[] = [];

	function fail() {
		status = 'failed';
		active = false;
		clearScene();
		try {
			map?.remove();
		} catch {
			// already torn down
		}
		map = undefined;
	}

	function clearScene() {
		for (const d of drawn) d.remove();
		drawn = [];
		if (!map) return;
		try {
			for (const id of LAYER_IDS) if (map.getLayer(id)) map.removeLayer(id);
			if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
		} catch {
			// style not usable: nothing to clear
		}
	}

	/** Draw the privacy shape and the attraction markers; throws if it can't. */
	function drawScene() {
		if (!map || !maplibre || !host) return;
		clearScene();
		const accent = getComputedStyle(host).color;
		map.jumpTo({ center: [longitude, latitude], zoom: exact ? 14 : 12.6 });
		if (exact) {
			const pin = document.createElement('div');
			pin.className = 'location-pin';
			pin.style.background = accent;
			drawn.push(new maplibre.Marker({ element: pin }).setLngLat([longitude, latitude]).addTo(map));
		} else {
			map.addSource(SOURCE_ID, {
				type: 'geojson',
				data: {
					type: 'Feature',
					properties: {},
					geometry: { type: 'Polygon', coordinates: [circleRing(latitude, longitude)] }
				}
			});
			map.addLayer({
				id: 'approx-fill',
				type: 'fill',
				source: SOURCE_ID,
				paint: { 'fill-color': accent, 'fill-opacity': 0.18 }
			});
			map.addLayer({
				id: 'approx-line',
				type: 'line',
				source: SOURCE_ID,
				paint: { 'line-color': accent, 'line-width': 1.5, 'line-opacity': 0.8 }
			});
		}
		for (const mk of markers) {
			const el = document.createElement('a');
			el.href = `#attraction-${mk.n}`;
			el.className = 'location-marker';
			el.textContent = String(mk.n);
			el.setAttribute('aria-label', `${mk.name}, show in list`);
			drawn.push(
				new maplibre.Marker({ element: el }).setLngLat([mk.longitude, mk.latitude]).addTo(map)
			);
		}
	}

	// React to prop changes once the map is up.
	$effect(() => {
		void [latitude, longitude, exact, markers];
		if (untrack(() => status) !== 'ready') return;
		untrack(() => {
			try {
				drawScene();
			} catch {
				fail();
			}
		});
	});

	onMount(() => {
		if (!host || typeof IntersectionObserver === 'undefined') return;
		const el = host;
		let disposed = false;
		let idleTimer: ReturnType<typeof setTimeout> | undefined;

		const activate = () => {
			if (!map) return;
			active = true;
			map.scrollZoom.enable();
			map.dragPan.enable();
			clearTimeout(idleTimer);
		};
		const deactivate = () => {
			clearTimeout(idleTimer);
			active = false;
			if (!map) return;
			map.scrollZoom.disable();
			if (coarse) map.dragPan.disable();
		};
		const onFocusOut = (e: FocusEvent) => {
			if (e.relatedTarget instanceof Node && el.contains(e.relatedTarget)) return;
			deactivate();
		};
		// Touch: the map gives scrolling back after a short idle, a page scroll or a tap elsewhere.
		const onTouchEnd = () => {
			if (!coarse) return;
			clearTimeout(idleTimer);
			idleTimer = setTimeout(deactivate, TOUCH_IDLE_MS);
		};
		const onTouchStart = () => clearTimeout(idleTimer);
		const onOutside = (e: Event) => {
			if (e.target instanceof Node && !el.contains(e.target)) deactivate();
		};
		const onScroll = () => {
			if (coarse && active) deactivate();
		};

		const start = async () => {
			status = 'loading';
			try {
				const [lib] = await Promise.all([
					import('maplibre-gl'),
					import('maplibre-gl/dist/maplibre-gl.css')
				]);
				if (disposed) return;
				maplibre = lib;
				coarse = matchMedia('(pointer: coarse)').matches;
				const m = new lib.Map({
					container: el,
					style: STYLE_URL,
					center: [longitude, latitude],
					zoom: exact ? 14 : 12.6,
					attributionControl: { compact: true },
					fadeDuration: reducedMotion.current ? 0 : 300
				});
				map = m;
				// Only a style failure before load is fatal; tile, glyph and sprite errors are not.
				m.on('error', (e) => {
					const ev = e as { sourceId?: string; tile?: unknown };
					if (status !== 'ready' && !ev.sourceId && !ev.tile) fail();
				});
				// No scroll-jacking: wheel zoom (and, on touch, one-finger pan) wait for a click or tap.
				m.scrollZoom.disable();
				if (coarse) m.dragPan.disable();
				m.addControl(new lib.NavigationControl({ showCompass: false }), 'top-right');
				m.on('load', () => {
					if (disposed || map !== m) return;
					try {
						drawScene();
						status = 'ready';
					} catch {
						fail();
					}
				});
				el.addEventListener('click', activate);
				el.addEventListener('mouseleave', deactivate);
				el.addEventListener('focusout', onFocusOut);
				el.addEventListener('touchend', onTouchEnd, { passive: true });
				el.addEventListener('touchstart', onTouchStart, { passive: true });
				document.addEventListener('pointerdown', onOutside, { passive: true });
				window.addEventListener('scroll', onScroll, { passive: true });
			} catch {
				// WebGL unavailable, chunk blocked: keep the static fallback.
				if (!disposed) fail();
			}
		};

		const io = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					io.disconnect();
					void start();
				}
			},
			{ rootMargin: '400px 0px' }
		);
		io.observe(el);

		return () => {
			disposed = true;
			io.disconnect();
			clearTimeout(idleTimer);
			el.removeEventListener('click', activate);
			el.removeEventListener('mouseleave', deactivate);
			el.removeEventListener('focusout', onFocusOut);
			el.removeEventListener('touchend', onTouchEnd);
			el.removeEventListener('touchstart', onTouchStart);
			document.removeEventListener('pointerdown', onOutside);
			window.removeEventListener('scroll', onScroll);
			try {
				map?.remove();
			} catch {
				// already torn down
			}
			map = undefined;
			drawn = [];
		};
	});
</script>

<div
	class="relative aspect-[4/3] w-full overflow-hidden rounded-frame border border-content/15 bg-surface text-accent-c"
	data-map-status={status}
>
	<!-- Until the map is ready it must not be focusable or clickable: inert + invisible. -->
	<div
		bind:this={host}
		class="absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none"
		class:opacity-0={status !== 'ready'}
		class:invisible={status !== 'ready'}
		inert={status !== 'ready'}
		role="region"
		aria-label="Map of the area around {label}"
	></div>
	{#if status !== 'ready'}
		<p
			class="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-content"
		>
			{#if status === 'failed'}
				The map isn’t available right now.
			{:else}
				{exact ? 'Exact location' : 'Approximate area, about 2 km across'}: {label}
			{/if}
		</p>
	{/if}
	{#if status === 'ready'}
		<p
			class="pointer-events-none absolute bottom-7 left-3 rounded-pill bg-surface/90 px-3 py-1 text-xs text-content"
		>
			{#if active}
				{coarse ? 'Pinch and drag to explore' : 'Scroll to zoom'}
			{:else if coarse}
				{exact ? 'Tap to explore the map' : 'Approximate area · tap to explore'}
			{:else if exact}
				Click the map to zoom with scroll
			{:else}
				Approximate area · click the map to zoom
			{/if}
		</p>
	{/if}
</div>

<style>
	:global(.location-marker) {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--color-surface);
		color: var(--color-content);
		border: 1px solid var(--color-content);
		font-size: 11px;
		line-height: 1;
		text-decoration: none;
		box-shadow: 0 1px 4px rgb(0 0 0 / 0.25);
	}
	:global(.location-marker:hover),
	:global(.location-marker:focus-visible) {
		background: var(--color-content);
		color: var(--color-surface);
	}
	:global(.location-pin) {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 2px solid white;
		box-shadow: 0 1px 6px rgb(0 0 0 / 0.35);
	}
</style>
