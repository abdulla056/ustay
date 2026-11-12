import { test } from '@playwright/test';

// UST-60 (mobile menu toggle in `Nav`) is not on main yet: `Nav.svelte` has no toggle or
// `aria-expanded`. Replace this skip with: open the menu at the phone viewport, assert
// `aria-expanded="true"`, press Escape, assert it is `"false"`.
test.skip('@mobile nav menu toggle opens and Escape closes it', () => {});
