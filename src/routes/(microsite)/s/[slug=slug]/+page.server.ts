import { error, redirect } from '@sveltejs/kit';
import { loadMicrosite } from '$lib/server/microsite/load';
import type { PageServerLoad } from './$types';

/**
 * `/s/<slug>` (the `slug` matcher in `src/params` 404s malformed slugs at routing) (decision 5). A published property renders; a retired slug 301s to the current one
 * (decision 1); anything else, drafts and archived properties included, is a 404.
 */
export const load: PageServerLoad = async ({ params, url }) => {
	const result = await loadMicrosite(params.slug);
	if (result.kind === 'redirect') redirect(301, `/s/${result.slug}${url.search}`);
	if (result.kind === 'not_found') error(404, 'Not found');
	return { view: result.view };
};
