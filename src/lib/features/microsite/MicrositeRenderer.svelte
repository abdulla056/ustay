<script lang="ts">
	// Walks the view's enabled sections in order and renders each through the registry (UST-22).
	// Each section sits in its own boundary, so a component that throws while rendering on the
	// client degrades to nothing instead of taking the page with it. (Boundaries have no effect on
	// the server: a throwing section there fails the request, which the route turns into a 500.)
	import type { Component } from 'svelte';
	import { sectionComponents } from './sections';
	import type { MicrositeView } from './types';

	// The registry is exhaustive per type, but a union of components cannot be called with a
	// union of props; the pairing is guaranteed by `SectionView` being discriminated on `type`.
	type AnySection = Component<{ data: unknown; variant: string }>;

	type Props = {
		view: MicrositeView;
		/** The registry to render with. Only tests pass this. */
		components?: Record<string, AnySection>;
	};
	let { view, components = sectionComponents as unknown as Record<string, AnySection> }: Props =
		$props();

	function onerror(error: unknown) {
		if (import.meta.env.DEV) console.error('[microsite] a section failed to render', error);
	}
</script>

{#each view.sections as section (section.type)}
	{@const Section = components[section.type]}
	<svelte:boundary {onerror}>
		<Section data={section.data} variant={section.variant} />
		{#snippet failed()}{/snippet}
	</svelte:boundary>
{/each}
