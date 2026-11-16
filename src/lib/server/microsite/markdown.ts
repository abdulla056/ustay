/**
 * Markdown to HTML for public microsites (UST-21). The property story and the host bio are
 * owner-authored markdown; this is the only place they become HTML.
 *
 * The rules, which a test pins:
 * - `html: false`: raw HTML in the source is escaped, never passed through (`<script>` and
 *   `<img onerror>` come out as text).
 * - markdown-it's default `validateLink` stays on: `javascript:`, `vbscript:`, `file:` and `data:`
 *   links (images excepted for `data:`) are not turned into links at all.
 * - External links (`http(s)://` or `//`) get `rel="noopener noreferrer"` and open in a new tab.
 *
 * The output is safe for `{@html}`. Do not render any other owner text that way.
 */
import MarkdownIt from 'markdown-it';

const md = new MarkdownIt({ html: false, linkify: false, typographer: true });

const isExternal = (href: string) => /^(?:https?:)?\/\//i.test(href);

const defaultLinkOpen =
	md.renderer.rules.link_open ??
	((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
	const token = tokens[idx];
	const href = String(token.attrGet('href') ?? '');
	if (isExternal(href)) {
		token.attrSet('rel', 'noopener noreferrer');
		token.attrSet('target', '_blank');
	}
	return defaultLinkOpen(tokens, idx, options, env, self);
};

/** Render markdown to sanitised HTML. Blank input gives an empty string. */
export function renderMarkdown(source: string | null | undefined): string {
	if (!source || !source.trim()) return '';
	return md.render(source);
}
