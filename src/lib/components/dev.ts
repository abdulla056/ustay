// Dev-only guard for the prop-vs-class rule: a utility a primitive generates from one
// of its props must not also arrive through `class`, or Tailwind's stylesheet order
// decides the winner. Silent in production builds.
export function warnClassCollision(
	component: string,
	className: unknown,
	pattern: RegExp,
	hint: string
): void {
	if (!import.meta.env.DEV) return;
	if (pattern.test([className].flat(9).join(' '))) {
		console.warn(`[${component}] ${hint}`);
	}
}
