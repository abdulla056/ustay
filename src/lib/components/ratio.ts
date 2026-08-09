/**
 * Aspect ratios the image frames are allowed to take. Keeping them as a closed
 * set (rather than an arbitrary string) means every frame on the site is one of
 * a handful of editorial crops — the portrait `4/5` card, the taller `4/6`
 * feature, the `4/3` gallery frame, cinematic `16/9`, and so on.
 */
export const ratios = {
	'4/5': 'aspect-[4/5]',
	'4/6': 'aspect-[4/6]',
	'4/3': 'aspect-[4/3]',
	'3/2': 'aspect-[3/2]',
	'16/9': 'aspect-[16/9]',
	'1/1': 'aspect-square',
	auto: ''
} as const;

export type Ratio = keyof typeof ratios;
