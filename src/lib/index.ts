/**
 * Ustay's base UI library (UST-7).
 *
 * Standardized primitives every page and microsite section composes from. They are
 * built exclusively from the UST-6 design tokens and are deliberately **static** —
 * no baked-in scroll animation — so the Lenis + GSAP motion layer can wrap and
 * animate them without fighting anything. Grows over time; this is the seed set.
 */

// Layout
export { default as Container } from './components/Container.svelte';
export { default as Section } from './components/Section.svelte';
export { default as Grid } from './components/Grid.svelte';
export { default as Stack } from './components/Stack.svelte';

// Typography
export { default as Heading } from './components/Heading.svelte';
export { default as Text } from './components/Text.svelte';
export { default as Eyebrow } from './components/Eyebrow.svelte';
export { default as Label } from './components/Label.svelte';

// Actions
export { default as Button } from './components/Button.svelte';
export { default as Link } from './components/Link.svelte';

// Content
export { default as Badge } from './components/Badge.svelte';
export { default as Card } from './components/Card.svelte';
export { default as Image } from './components/Image.svelte';
export { default as Icon } from './components/Icon.svelte';

export { ratios, type Ratio } from './components/ratio';
