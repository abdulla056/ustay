<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import Field from './Field.svelte';

	const { Story } = defineMeta({
		title: 'Forms/Field',
		component: Field,
		tags: ['autodocs'],
		args: { label: 'Email', name: 'email', type: 'email' },
		argTypes: {
			type: { control: 'inline-radio', options: ['text', 'email', 'password'] },
			label: { control: 'text' },
			hint: { control: 'text' },
			error: { control: 'text' }
		}
	});
</script>

<Story name="Default" />

<Story name="With hint" args={{ hint: 'We will never share your email.' }} />

<Story name="With error" args={{ error: 'Enter a valid email address.', value: 'ana@ustay' }} />

<Story
	name="Password"
	args={{ label: 'Password', name: 'password', type: 'password', hint: 'At least 8 characters.' }}
/>
