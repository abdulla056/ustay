<script lang="ts">
	// Client-only, lazy MapLibre map (OpenFreeMap tiles, no key). Nothing loads until the section
	// nears the viewport; without JS, offline, or on any failure the slot stays a static note and
	// the attraction list carries the section. Exact location -> a pin; otherwise a ~1 km circle.
	import { onMount } from 'svelte';
	import { reducedMotion } from '$lib/motion';
	import { circleRing } from './geo';

	type Marker = { n: number; name: string; latitude: number; longitude: number };
	type Props = {
		latitude: number;
		longitude: number;
		exact: boolean;
		label: string;
		/** Attractions with coordinates; `n` is the 1-based list position, `#attraction-<n>` the target. */
		markers?: Marker[];
	};
	let { latitude, longitude, exact, label, markers = [] }: Props = $props();

	const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';

	let host: HTMLDivElement | undefined = $state();
	let status = $state<'idle' | 'loading' | 'ready' | 'failed'>('idle');
	let active = $state(false);

	onMount(() => {
		if (!host || typeof IntersectionObserver === 'undefined') return;
		let disposed = false;
		let map: import('maplibre-gl').Map | undefined;

		const start = async () => {
			status = 'loading';
			try {
				const [maplibregl] = await Promise.all([
					import('maplibre-gl'),
					import('maplibre-gl/dist/maplibre-gl.css')
				]);
				if (disposed || !host) return;
				const coarse = matchMedia('(pointer: coarse)').matches;
				const accent = getComputedStyle(host).color;
				const m = new maplibregl.Map({
					container: host,
					style: STYLE_URL,
					center: [longitude, latitude],
					zoom: exact ? 14 : 12.6,
					attributionControl: { compact: true },
					fadeDuration: reducedMotion.current ? 0 : 300
				});
				map = m;
				// Tile or style failures (offline, blocked) must never surface as errors.
				m.on('error', () => {
					if (status !== 'ready') status = 'failed';
				});
				// No scroll-jacking: wheel zoom (and, on touch, one-finger pan) wait for a click.
				m.scrollZoom.disable();
				if (coarse) m.dragPan.disable();
				m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
				m.on('load', () => {
					if (disposed) return;
					status = 'ready';
					if (exact) {
						const pin = document.createElement('div');
						pin.className = 'location-pin';
						pin.style.background = accent;
						new maplibregl.Marker({ element: pin }).setLngLat([longitude, latitude]).addTo(m);
					} else {
						m.addSource('approx', {
							type: 'geojson',
							data: {
								type: 'Feature',
								properties: {},
								geometry: { type: 'Polygon', coordinates: [circleRing(latitude, longitude)] }
							}
						});
						m.addLayer({
							id: 'approx-fill',
							type: 'fill',
							source: 'approx',
							paint: { 'fill-color': accent, 'fill-opacity': 0.18 }
						});
						m.addLayer({
							id: 'approx-line',
							type: 'line',
							source: 'approx',
							paint: { 'line-color': accent, 'line-width': 1.5, 'line-opacity': 0.8 }
						});
					}
				});
				for (const mk of markers) {
					const el = document.createElement('a');
					el.href = `#attraction-${mk.n}`;
					el.className = 'location-marker';
					el.textContent = String(mk.n);
					el.setAttribute('aria-label', `${mk.name}, show in list`);
					new maplibregl.Marker({ element: el }).setLngLat([mk.longitude, mk.latitude]).addTo(m);
				}
				const activate = () => {
					active = true;
					m.scrollZoom.enable();
					m.dragPan.enable();
				};
				const deactivate = () => {
					active = false;
					m.scrollZoom.disable();
					if (coarse) m.dragPan.disable();
				};
				host.addEventListener('click', activate);
				host.addEventListener('mouseleave', deactivate);
				host.addEventListener('focusout', deactivate);
			} catch {
				// WebGL unavailable, chunk blocked: keep the static fallback.
				if (!disposed) status = 'failed';
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
		io.observe(host);

		return () => {
			disposed = true;
			io.disconnect();
			try {
				map?.remove();
			} catch {
				// already torn down
			}
		};
	});
</script>

<div
	class="relative aspect-[4/3] w-full overflow-hidden rounded-frame border border-content/15 bg-surface text-accent-c"
	data-map-status={status}
>
	<div
		bind:this={host}
		class="absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none"
		class:opacity-0={status !== 'ready'}
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
				{exact ? 'Exact location' : 'Approximate area, about 1 km across'}: {label}
			{/if}
		</p>
	{/if}
	{#if status === 'ready'}
		<p
			class="pointer-events-none absolute bottom-7 left-3 rounded-pill bg-surface/90 px-3 py-1 text-xs text-content"
		>
			{#if active}
				Scroll to zoom
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
