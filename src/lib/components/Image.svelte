<script lang="ts">
	// A cropped image frame. The photograph leads (DESIGN.md layout principle #1),
	// so the frame owns the crop and the image always fills it — never letterboxed,
	// never distorted. `alt` is a required prop: there is no way to ship an
	// unlabelled image through this component (pass `alt=""` for decorative art).
	import type { HTMLImgAttributes } from 'svelte/elements';
	import { ratios, type Ratio } from './ratio';
	import { warnClassCollision } from './dev';

	type Props = HTMLImgAttributes & {
		src: string;
		/** Required. `""` marks the image as decorative. */
		alt: string;
		ratio?: Ratio;
		rounded?: 'image' | 'frame' | 'none';
		loading?: 'lazy' | 'eager';
		/** Classes for the inner `<img>` — the handle the motion layer will animate. */
		imgClass?: string;
	};

	let {
		src,
		alt,
		ratio = '4/5',
		rounded = 'image',
		loading = 'lazy',
		class: className,
		imgClass,
		...rest
	}: Props = $props();

	const radii = {
		image: 'rounded-image',
		frame: 'rounded-frame',
		none: 'rounded-none'
	};

	// `rounded` always generates a radius (it defaults to `image`), so the guard is
	// always on: any `rounded-*` through `class` is a second radius declaration.
	if (import.meta.env.DEV) {
		$effect(() => {
			warnClassCollision(
				'Image',
				className,
				/(?:^|[\s,])rounded-/,
				'a `rounded-*` utility came in through `class`; the `rounded` prop owns the corner radius and Tailwind CSS order decides the winner. Use `rounded`.'
			);
		});
	}
</script>

<div class={['overflow-hidden', ratios[ratio], radii[rounded], className]}>
	<img
		{...rest}
		{src}
		{alt}
		{loading}
		decoding="async"
		class={['w-full object-cover', ratio === 'auto' ? 'h-auto' : 'h-full', imgClass]}
	/>
</div>
