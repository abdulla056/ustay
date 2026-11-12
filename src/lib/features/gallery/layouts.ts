/**
 * The zoom-out mosaic. Each slot is a frame's resting position on the stage,
 * in the prototype's own units: `x`/`y` are offsets from the stage centre
 * (`vw` / `vh`), `w`/`h` the frame size, and `scale` how far it is scaled up at
 * the *start* of the scroll — frame 0 is the hero that fills the screen.
 * Offsets are relative to the centre because the zoom pivots about it, which is
 * what makes the other frames spread out of view as the hero grows.
 */
export type Slot = { x: number; y: number; w: number; h: number; scale: number };

/** More frames than this are dropped: the composition is designed for seven. */
export const MAX_FRAMES = 7;
/** Fewer than this and a zoom has nothing to reveal — render the static layout. */
export const MIN_ZOOM_FRAMES = 3;

// The original prototype composition, in its original order.
const SEVEN: Slot[] = [
	{ x: 0, y: 0, w: 25, h: 25, scale: 4 },
	{ x: 5, y: -30, w: 35, h: 30, scale: 5 },
	{ x: -25, y: -10, w: 20, h: 45, scale: 6 },
	{ x: 27.5, y: 0, w: 25, h: 25, scale: 5 },
	{ x: 5, y: 27.5, w: 20, h: 25, scale: 6 },
	{ x: -22.5, y: 27.5, w: 30, h: 25, scale: 8 },
	{ x: 25, y: 22.5, w: 15, h: 15, scale: 9 }
];

/** Slot sets for 3–7 frames. Five and six are the seven-frame mosaic with its last slots left empty. */
export const LAYOUTS: Record<number, Slot[]> = {
	3: [
		{ x: 0, y: 0, w: 25, h: 25, scale: 4 },
		{ x: -27, y: -5, w: 20, h: 45, scale: 6 },
		{ x: 27, y: 8, w: 22, h: 30, scale: 6 }
	],
	4: [
		{ x: 0, y: 0, w: 25, h: 25, scale: 4 },
		{ x: -27, y: -5, w: 20, h: 45, scale: 6 },
		{ x: 27, y: 8, w: 22, h: 30, scale: 6 },
		{ x: 2, y: 28, w: 26, h: 20, scale: 5 }
	],
	5: SEVEN.slice(0, 5),
	6: SEVEN.slice(0, 6),
	7: SEVEN
};

/** The frames that will actually be shown: the first {@link MAX_FRAMES}. */
export function clampFrames<T>(frames: readonly T[]): T[] {
	return frames.slice(0, MAX_FRAMES);
}

/** Slots for a (clamped) frame count, or `undefined` when too few for a zoom. */
export function layoutFor(count: number): Slot[] | undefined {
	return count < MIN_ZOOM_FRAMES ? undefined : LAYOUTS[Math.min(count, MAX_FRAMES)];
}

/** `object-position` from 0–1 focal values, clamped. */
export function objectPosition(frame: { focalX?: number; focalY?: number }): string {
	const pct = (v: number | undefined) => `${Math.round(Math.min(1, Math.max(0, v ?? 0.5)) * 100)}%`;
	return `${pct(frame.focalX)} ${pct(frame.focalY)}`;
}
