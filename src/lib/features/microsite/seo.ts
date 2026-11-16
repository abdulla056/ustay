/** SEO helpers shared by the microsite page. Pure and client-safe. */
import type { MicrositeView } from './types';

/** Make a site-relative path absolute against the request origin; absolute URLs pass through. */
export function absoluteUrl(src: string, origin: string): string {
	return /^https?:\/\//.test(src) ? src : new URL(src, origin).href;
}

/**
 * schema.org `LodgingBusiness` JSON-LD.
 *
 * Deliberately no `aggregateRating`: the reviews are partly imported or self-collected, and search
 * engines treat self-serving ratings markup as a policy violation. The address is locality,
 * region and country only, never street lines (decision 8).
 */
export function lodgingJsonLd(view: MicrositeView, origin: string): Record<string, unknown> {
	const { seo, property } = view;
	const ld: Record<string, unknown> = {
		'@context': 'https://schema.org',
		'@type': 'LodgingBusiness',
		name: property.name,
		url: absoluteUrl(seo.canonicalPath, origin)
	};
	if (seo.description) ld.description = seo.description;
	if (seo.image) ld.image = absoluteUrl(seo.image.src, origin);
	if (seo.address) {
		ld.address = {
			'@type': 'PostalAddress',
			addressLocality: seo.address.locality,
			...(seo.address.region ? { addressRegion: seo.address.region } : {}),
			addressCountry: seo.address.countryCode
		};
	}
	if (seo.priceRange) ld.priceRange = seo.priceRange;
	return ld;
}

/** Serialise JSON-LD for a `<script>` body: `<` is escaped so it can never close the tag. */
export function jsonLdScript(ld: Record<string, unknown>): string {
	return `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`;
}
