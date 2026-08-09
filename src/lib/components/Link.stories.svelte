<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Link from './Link.svelte';
	import Text from './Text.svelte';

	const { Story } = defineMeta({
		title: 'Actions/Link',
		component: Link,
		tags: ['autodocs'],
		args: { href: '#stays', variant: 'inline', external: false },
		argTypes: {
			href: { control: 'text' },
			variant: {
				control: 'inline-radio',
				options: ['inline', 'quiet'],
				description: 'inline is underlined in running copy; quiet underlines on hover'
			},
			external: {
				control: 'boolean',
				description: 'Opens in a new tab with a safe rel, and appends the ↗ mark'
			}
		}
	});
</script>

<Story name="Inline">
	{#snippet template(args)}
		<Link {...args}>every stay</Link>
	{/snippet}
</Story>

<Story name="In running copy">
	{#snippet template(args)}
		<Text measure="default">
			Ustay gives every independent property its own branded home. Start with
			<Link {...args}>the collection</Link>, or read how a host tells their own story.
		</Text>
	{/snippet}
</Story>

<Story name="Quiet" args={{ variant: 'quiet' }}>
	{#snippet template(args)}
		<Link {...args}>Journal</Link>
	{/snippet}
</Story>

<Story name="External" args={{ href: 'https://example.com', external: true }}>
	{#snippet template(args)}
		<Link {...args}>Visit the property site</Link>
	{/snippet}
</Story>

<Story name="On the dark tone">
	{#snippet template(args)}
		<div data-tone="inverse" class="rounded-frame bg-surface p-12 text-content">
			<Text measure="default" tone="prose">
				The dark cinematic mood — <Link {...args}>every stay</Link> keeps its underline and hovers to
				the lifted accent.
			</Text>
		</div>
	{/snippet}
</Story>
