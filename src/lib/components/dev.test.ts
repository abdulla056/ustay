import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { warnClassCollision } from './dev';

const gap = /(?:^|[\s,])-?gap-(?!x-|y-)/;

describe('warnClassCollision', () => {
	let warn: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	});

	afterEach(() => {
		warn.mockRestore();
	});

	it('warns with the component name and hint when the pattern matches', () => {
		warnClassCollision('Stack', 'mt-4 gap-4', gap, 'use the prop');

		expect(warn).toHaveBeenCalledTimes(1);
		expect(warn).toHaveBeenCalledWith('[Stack] use the prop');
	});

	it('warns when the match is inside an array of classes', () => {
		warnClassCollision('Stack', ['mt-4', 'gap-2'], gap, 'use the prop');

		expect(warn).toHaveBeenCalledWith('[Stack] use the prop');
	});

	it('stays silent when nothing matches', () => {
		warnClassCollision('Stack', 'mt-4 gap-x-2', gap, 'use the prop');
		warnClassCollision('Stack', ['mt-4', 'gap-y-2'], gap, 'use the prop');

		expect(warn).not.toHaveBeenCalled();
	});

	it('handles undefined and empty className without throwing', () => {
		expect(() => warnClassCollision('Stack', undefined, gap, 'use the prop')).not.toThrow();
		expect(() => warnClassCollision('Stack', [undefined], gap, 'use the prop')).not.toThrow();
		expect(() => warnClassCollision('Stack', '', gap, 'use the prop')).not.toThrow();

		expect(warn).not.toHaveBeenCalled();
	});
});
