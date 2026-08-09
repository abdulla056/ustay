import type { Preview } from '@storybook/sveltekit';

// Storybook has to inherit the design system, otherwise every story renders in
// Times New Roman with no tokens. Same imports as `src/routes/+layout.svelte`:
// self-hosted Fraunces (with its optical-size + italic axes) and Inter, then the
// UST-6 token layer.
import '@fontsource-variable/fraunces/opsz.css';
import '@fontsource-variable/fraunces/opsz-italic.css';
import '@fontsource-variable/inter/index.css';
import '../src/routes/layout.css';
import './preview.css';

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},

		// The two tones of DESIGN.md, so any primitive can be checked on both.
		// Literal hex is unavoidable here — the addon writes an inline style into
		// the preview shell and the manager renders the swatch in another document.
		// Keep these in step with `--color-paper` / `--color-ink` in layout.css.
		backgrounds: {
			options: {
				paper: { name: 'Paper', value: '#F4EFE6' },
				ink: { name: 'Ink', value: '#0B0F0E' }
			}
		},

		a11y: {
			// 'todo' - show a11y violations in the test UI only
			// 'error' - fail CI on a11y violations
			// 'off' - skip a11y checks entirely
			//
			// 'error': the component library is the one place violations must never
			// be allowed to accumulate — every page downstream inherits them.
			test: 'error'
		}
	},

	initialGlobals: {
		backgrounds: { value: 'paper' }
	}
};

export default preview;
