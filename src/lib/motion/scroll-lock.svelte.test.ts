import { afterEach, describe, expect, it } from 'vitest';
import { lockScroll } from './scroll-lock';

const overflow = () => document.documentElement.style.overflow;

describe('lockScroll', () => {
	afterEach(() => {
		document.documentElement.style.overflow = '';
	});

	it('clips the root and restores the previous value', () => {
		document.documentElement.style.overflow = 'auto';
		const release = lockScroll();
		expect(overflow()).toBe('hidden');
		release();
		expect(overflow()).toBe('auto');
	});

	it('stays locked until the last of nested locks releases', () => {
		const outer = lockScroll();
		const inner = lockScroll();
		inner();
		expect(overflow()).toBe('hidden');
		outer();
		expect(overflow()).toBe('');
	});

	it('release is idempotent and cannot unlock someone else', () => {
		const a = lockScroll();
		const b = lockScroll();
		a();
		a();
		expect(overflow()).toBe('hidden');
		b();
		expect(overflow()).toBe('');
	});
});
