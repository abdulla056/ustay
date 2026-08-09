import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|ts|svelte)'],
	addons: [
		'@storybook/addon-svelte-csf',
		'@chromatic-com/storybook',
		'@storybook/addon-vitest',
		'@storybook/addon-a11y',
		'@storybook/addon-docs'
	],
	// Stories use the real prototype photography from `static/` — the photograph
	// leads, so the library should be reviewed against actual images.
	staticDirs: ['../static'],
	framework: '@storybook/sveltekit'
};
export default config;
