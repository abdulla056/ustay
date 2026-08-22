<script lang="ts">
	// The bare `(auth)` shell (UST-57): a centred credential card on the paper tone,
	// with nothing else competing with the form — no nav, no motion, per the group's
	// README. The wordmark is the only way back to the marketing site; there is
	// deliberately no "back" link beyond it.
	//
	// Static on purpose: DESIGN.md's cinematic scroll belongs to `(platform)`, not to
	// a sign-in screen, so this layout imports nothing from `$lib/motion`.
	import { Wordmark } from '$lib';

	const { children } = $props();
</script>

<div
	class="flex min-h-screen flex-col items-center justify-center gap-10 bg-surface px-gutter py-16 text-content"
>
	<Wordmark href="/" size="sm" />

	<!-- The card: a hairline frame per DESIGN.md's restrained radii, wide enough for
	     a form but never for the wordmark's own display voice, which stays outside. -->
	<div class="w-full max-w-md rounded-frame border border-hairline-c bg-surface p-8 sm:p-10">
		{@render children()}
	</div>

	<p class="font-body text-sm text-content-muted">© Ustay</p>
</div>
