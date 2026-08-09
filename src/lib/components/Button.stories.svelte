<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Button from './Button.svelte';
	import Icon from './Icon.svelte';
	import Text from './Text.svelte';

	const { Story } = defineMeta({
		title: 'Actions/Button',
		component: Button,
		tags: ['autodocs'],
		args: { variant: 'solid', size: 'md' },
		argTypes: {
			variant: {
				control: 'inline-radio',
				options: ['solid', 'paper', 'outline', 'ghost'],
				description:
					'solid = tone-aware filled chip · paper = always cream (over photography) · outline = currentColor hairline · ghost = borderless'
			},
			size: { control: 'inline-radio', options: ['sm', 'md'] },
			href: { control: 'text', description: 'Present ⇒ renders an <a> instead of a <button>' },
			disabled: { control: 'boolean' }
		}
	});

	const variants = ['solid', 'paper', 'outline', 'ghost'] as const;
</script>

<Story name="Solid">
	{#snippet template(args)}
		<Button {...args}>Reserve</Button>
	{/snippet}
</Story>

<Story name="Outline" args={{ variant: 'outline' }}>
	{#snippet template(args)}
		<Button {...args}>
			Reserve
			<Icon><path d="M7 17 17 7" /><path d="M9 7h8v8" /></Icon>
		</Button>
	{/snippet}
</Story>

<Story name="Ghost" args={{ variant: 'ghost' }}>
	{#snippet template(args)}
		<Button {...args}>Read the story</Button>
	{/snippet}
</Story>

<!-- `paper` is for CTAs sitting on photography, where there is no tonal scope to
     inherit from — the prototype's hero "Explore stays". -->
<Story name="Paper — over photography" args={{ variant: 'paper' }}>
	{#snippet template(args)}
		<div class="relative overflow-hidden rounded-frame">
			<img
				src="/prototype/hero-forest.jpg"
				alt=""
				class="h-72 w-full object-cover"
				loading="lazy"
			/>
			<div class="absolute inset-0 flex items-end p-8">
				<Button {...args}>Explore stays</Button>
			</div>
		</div>
	{/snippet}
</Story>

<Story name="Link semantics" args={{ href: '#stays', variant: 'outline' }}>
	{#snippet template(args)}
		<Button {...args}>Browse every stay</Button>
	{/snippet}
</Story>

<Story name="Disabled" args={{ disabled: true }}>
	{#snippet template(args)}
		<Button {...args}>Sold out</Button>
	{/snippet}
</Story>

<!-- Every variant on both tones. `solid` flips automatically: ink chip on paper,
     paper chip on ink — one variant, two tones. -->
<Story name="Variants on both tones">
	{#snippet template()}
		<div class="flex flex-col gap-8">
			<div class="flex flex-col gap-4">
				<Text size="sm" tone="muted">Light tone</Text>
				<div class="flex flex-wrap items-center gap-4">
					{#each variants as variant (variant)}
						<Button {variant}>{variant}</Button>
					{/each}
				</div>
			</div>
			<div
				data-tone="inverse"
				class="flex flex-col gap-4 rounded-frame bg-surface p-8 text-content"
			>
				<Text size="sm" tone="muted">Inverse tone</Text>
				<div class="flex flex-wrap items-center gap-4">
					{#each variants as variant (variant)}
						<Button {variant}>{variant}</Button>
					{/each}
				</div>
			</div>
		</div>
	{/snippet}
</Story>

<Story name="Sizes">
	{#snippet template()}
		<div class="flex flex-wrap items-center gap-4">
			<Button size="sm">Small</Button>
			<Button size="md">Medium</Button>
		</div>
	{/snippet}
</Story>
