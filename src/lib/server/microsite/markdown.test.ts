import { describe, expect, it } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
	it('renders ordinary markdown', () => {
		const html = renderMarkdown('One.\n\nTwo with *emphasis*.');
		expect(html).toContain('<p>One.</p>');
		expect(html).toContain('<em>emphasis</em>');
	});

	it('returns an empty string for blank input', () => {
		expect(renderMarkdown(null)).toBe('');
		expect(renderMarkdown('  \n ')).toBe('');
	});

	it('escapes a raw <script>', () => {
		const html = renderMarkdown('hello <script>alert(1)</script>');
		expect(html).not.toContain('<script');
		expect(html).toContain('&lt;script&gt;');
	});

	it('does not pass through an <img onerror>', () => {
		const html = renderMarkdown('<img src=x onerror="alert(1)">');
		expect(html).not.toContain('<img');
		expect(html).toContain('&lt;img');
	});

	it('does not render inline images, third-party or data:', () => {
		for (const src of [
			'http://tracker/p.gif',
			'data:image/gif;base64,R0lGOD',
			'/prototype/x.jpg'
		]) {
			const html = renderMarkdown(`![x](${src})`);
			expect(html).not.toContain('<img');
		}
	});

	it('does not link javascript:, vbscript: or data: URLs', () => {
		for (const href of [
			'javascript:alert(1)',
			'JaVaScRiPt:alert(1)',
			'vbscript:x',
			'data:text/html,x'
		]) {
			const html = renderMarkdown(`[click](${href})`);
			expect(html).not.toContain('<a ');
			expect(html).not.toContain('href=');
		}
	});

	it('marks external links noopener noreferrer, leaves internal ones alone', () => {
		const external = renderMarkdown('[out](https://example.com/x)');
		expect(external).toContain('href="https://example.com/x"');
		expect(external).toContain('rel="noopener noreferrer"');
		const internal = renderMarkdown('[in](/s/rumah-kabus)');
		expect(internal).toContain('href="/s/rumah-kabus"');
		expect(internal).not.toContain('rel=');
	});
});
