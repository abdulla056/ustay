<script lang="ts">
	// A labelled, underlined text input (UST-55). Domain-agnostic, so it lives with the
	// primitives. The label sits above the field in the Eyebrow voice; the hint or the
	// error sits below it, and both are wired to the input through `aria-describedby`.
	//
	// An `error` also sets `aria-invalid`. Attributes not named here (`required`,
	// `autocomplete`, `disabled`, …) pass straight through to the `<input>`.
	import type { HTMLInputAttributes } from 'svelte/elements';

	type Props = Omit<HTMLInputAttributes, 'type' | 'value'> & {
		label: string;
		name: string;
		type?: 'text' | 'email' | 'password';
		value?: string;
		/** Validation message. Replaces the hint and marks the input `aria-invalid`. */
		error?: string;
		/** Muted guidance shown under the field when there is no error. */
		hint?: string;
	};

	let {
		label,
		name,
		type = 'text',
		value = $bindable(''),
		error,
		hint,
		class: className,
		...rest
	}: Props = $props();

	const id = $props.id();
	const messageId = `${id}-msg`;
	const message = $derived(error ?? hint);
</script>

<div class="flex w-full flex-col gap-2">
	<label
		for={id}
		class="font-body text-eyebrow font-medium tracking-eyebrow text-content-muted uppercase"
		>{label}</label
	>
	<input
		{...rest}
		{id}
		{name}
		{type}
		bind:value
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={message ? messageId : undefined}
		class={[
			'w-full border-0 border-b border-hairline-c bg-transparent py-3 font-body text-content transition-colors duration-300 ease-editorial outline-none focus:border-accent-c',
			className
		]}
	/>
	{#if error}
		<p id={messageId} class="font-body text-sm text-accent-c">{error}</p>
	{:else if hint}
		<p id={messageId} class="font-body text-sm text-content-muted">{hint}</p>
	{/if}
</div>
