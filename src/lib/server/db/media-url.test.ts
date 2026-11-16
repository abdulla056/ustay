import { describe, expect, it } from 'vitest';
import { isValidMediaUrl } from './media-url';

describe('isValidMediaUrl', () => {
	it.each([
		'/prototype/hero-forest.jpg',
		'/prototype/a/b/c_d.avif',
		'https://example.com/a.jpg',
		'http://localhost:5173/prototype/a.jpg'
	])('accepts %s', (url) => {
		expect(isValidMediaUrl(url)).toBe(true);
	});

	it.each([
		'/\\evil.example/x.jpg',
		'/\tevil',
		'/\nevil',
		'/logout',
		'/prototype/../x.jpg',
		'/prototype/a.svg',
		'prototype/a.jpg',
		'//evil.example/x.jpg',
		'javascript:alert(1)',
		'http://a b',
		'https://x\\y',
		'https://x\ny',
		'https://',
		'',
		42,
		null,
		undefined
	])('rejects %j', (url) => {
		expect(isValidMediaUrl(url)).toBe(false);
	});
});
