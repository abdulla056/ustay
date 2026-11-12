<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Nav from './Nav.svelte';

	// `Nav` normally follows `pageTone`, a module-level singleton the tonal scroll
	// writes to. Stories pin `tone` instead: mutating the singleton would leak the
	// last-rendered story's tone into every other one.
	const { Story } = defineMeta({
		title: 'Chrome/Nav',
		component: Nav,
		tags: ['autodocs'],
		args: { tone: 'dark' },
		argTypes: {
			tone: { control: 'inline-radio', options: ['dark', 'light'] },
			scrim: { control: 'boolean' },
			anchorOffset: { control: 'number' }
		},
		parameters: { layout: 'fullscreen' }
	});
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
</script>

<!--
	Story-only harness. `transform-gpu` is a bare `translateZ(0)`, which makes this
	element the containing block for the nav's `position: fixed` — so the bar lands
	inside the story instead of floating over the Storybook shell.

	The content deliberately starts at the very top, *underneath* the bar, because that
	is the state the scrim exists for: mid-scroll, with the page running behind the nav.
	The `<main>` is also the skip link's target — the link is only real if it lands
	somewhere.
-->
{#snippet frame(dark: boolean, nav: Snippet, tall = false)}
	<div
		data-tone={dark ? 'inverse' : 'light'}
		class={['relative transform-gpu overflow-hidden', tall ? 'h-[44rem]' : 'h-96']}
	>
		{#if dark}
			<img
				src="/prototype/sun-trees.jpg"
				alt=""
				class="absolute inset-0 h-full w-full object-cover"
				loading="eager"
			/>
		{:else}
			<div class="absolute inset-0 bg-surface"></div>
		{/if}

		{@render nav()}

		<main id="content" tabindex="-1" class="absolute inset-0 px-gutter pt-8">
			<p class="max-w-measure text-lead text-content-prose">
				Body copy sitting where the nav is, so the veil has something to hide. Scroll a real page
				and this is what passes under the bar: in the paper tone it dissolves into the page edge,
				and over photography the ink vignette carries the white type instead.
			</p>
		</main>
	</div>
{/snippet}

<!--
	The dark tone: the nav above the fold, over the hero photograph. Deliberately shown
	on the hardest kind of frame — bright sky breaking through trees — because that is
	where white-on-photograph fails. The gradient scrim behind the bar is what keeps it
	legible; switch `scrim` off in the controls to see the problem it solves.
-->
<Story name="Over photography (dark tone)">
	{#snippet template(args)}
		{#snippet nav()}<Nav {...args} />{/snippet}
		{@render frame(true, nav)}
	{/snippet}
</Story>

<!--
	The light tone: the same nav once the tonal dissolve has landed on paper. Contrast is
	not the problem here — ink on paper — but collision is, so the veil switches to an
	opaque paper one. It is invisible against the backdrop and the copy beneath simply
	dissolves at the page edge. Switch `scrim` off to see the copy hit the links.
-->
<Story name="On paper (light tone)" args={{ tone: 'light' }}>
	{#snippet template(args)}
		{#snippet nav()}<Nav {...args} />{/snippet}
		{@render frame(false, nav)}
	{/snippet}
</Story>

<!--
	In-page anchors. These keep a real `href` but are scrolled through the smooth
	scroller on click, so the jump does not fight Lenis's momentum.
-->
<Story
	name="Anchor links"
	args={{
		links: [
			{ label: 'The idea', href: '#idea' },
			{ label: 'Stays', href: '#stays' }
		],
		cta: { label: 'Reserve', href: '#stays' }
	}}
>
	{#snippet template(args)}
		{#snippet nav()}<Nav {...args} />{/snippet}
		{@render frame(true, nav)}
	{/snippet}
</Story>

<!--
	The microsite state: with no links there is nothing to put in a menu, so at every
	width the mark plus the single `Reserve` pill carry the bar.
-->
<Story name="Wordmark and CTA only" args={{ links: [] }}>
	{#snippet template(args)}
		{#snippet nav()}<Nav {...args} />{/snippet}
		{@render frame(true, nav)}
	{/snippet}
</Story>

<!--
	The mobile menu, open (UST-60). Below `md` the links move behind `Menu`, which opens
	a full-screen modal in the ink tone whatever the page tone is — shown here from the
	paper tone so the switch is visible. The panel wipes down over the bar, then the
	numbered display-type lines rise out of their masks one after another; under reduced
	motion it is a short fade and nothing travels.

	The play function opens it, so the a11y check runs against the open dialog. Pinned to
	a phone viewport, since the toggle does not exist at desktop widths.
-->
<Story
	name="Mobile menu (open)"
	args={{ tone: 'light' }}
	globals={{ viewport: { value: 'mobile2', isRotated: false } }}
	play={async ({ canvas, userEvent }) => {
		await userEvent.click(canvas.getByRole('button', { name: 'Open menu' }));
	}}
>
	{#snippet template(args)}
		{#snippet nav()}<Nav {...args} />{/snippet}
		{@render frame(false, nav, true)}
	{/snippet}
</Story>
