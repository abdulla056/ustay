/**
 * One photograph in a gallery. The shape deliberately matches the UST-14
 * `media_asset` columns (`focal_x` / `focal_y` become `focalX` / `focalY`), so
 * the microsite Photo Gallery section can map rows straight in.
 */
export type GalleryFrame = {
	src: string;
	/** Required. Every frame is a photograph, so every frame is described. */
	alt: string;
	/** Intrinsic pixel size; reserves space and keeps the crop honest. */
	width: number;
	height: number;
	/** Focal point as 0–1 reals (0,0 = top-left). Drives `object-position`. Default 0.5. */
	focalX?: number;
	focalY?: number;
	/** Shown beneath the frame in the static grid. */
	caption?: string;
};
