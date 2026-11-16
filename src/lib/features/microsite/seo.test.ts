import { describe, expect, it } from 'vitest';
import { absoluteUrl, jsonLdScript, lodgingJsonLd } from './seo';
import type { MicrositeView } from './types';

const view = {
	property: { name: 'Rumah Kabus' },
	seo: {
		canonicalPath: '/s/rumah-kabus',
		description: 'Four rooms.',
		image: { src: '/prototype/hero-forest.jpg', alt: 'x' },
		priceRange: 'RM280 - RM640',
		address: { locality: 'Tanah Rata', region: 'Pahang', countryCode: 'MY' }
	}
} as unknown as MicrositeView;

describe('seo', () => {
	it('absolutises site-relative paths only', () => {
		expect(absoluteUrl('/a.jpg', 'https://x.test')).toBe('https://x.test/a.jpg');
		expect(absoluteUrl('https://cdn.test/a.jpg', 'https://x.test')).toBe('https://cdn.test/a.jpg');
	});

	it('builds LodgingBusiness JSON-LD without aggregateRating or street address', () => {
		const ld = lodgingJsonLd(view, 'https://x.test');
		expect(ld['@type']).toBe('LodgingBusiness');
		expect(ld.image).toBe('https://x.test/prototype/hero-forest.jpg');
		expect(ld.priceRange).toBe('RM280 - RM640');
		expect(ld).not.toHaveProperty('aggregateRating');
		expect(JSON.stringify(ld.address)).not.toContain('streetAddress');
	});

	it('cannot be closed early by a < in the data', () => {
		const script = jsonLdScript({ name: '</script><script>alert(1)</script>' });
		expect(script.match(/<\/script>/g)).toHaveLength(1);
	});
});
