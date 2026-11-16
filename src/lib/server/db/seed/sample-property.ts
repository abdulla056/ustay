/**
 * Seed module: the sample property "Rumah Kabus" (UST-20). Phase 1's exit criterion: one fully
 * populated, published property with every relation filled, in real copy, for the Phase 2
 * microsite to be built against.
 *
 * Runs under plain `bun`, so it never imports repositories (they pull `$env`). It writes through
 * `ctx.db` and the Drizzle query builder, and must therefore produce exactly what the repos would
 * have produced: same-library media, images where an image is required, price snapshots of
 * `nightly_rate_minor x nights`, consistent `published_at` / `moderated_at`, display names (never
 * emails) as review authors, `expires_at` = created + 72 hours, lower-cased emails.
 *
 * Idempotent: if the slug exists the module skips. Everything is written in one transaction, so a
 * failure leaves no half property behind.
 *
 * Imagery: local static files only (`/prototype/*.jpg`, `static/prototype/`), reused across
 * placements. No external URLs, so e2e and offline dev never touch the network.
 */
import { createHash, randomBytes } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { TEMPLATES } from '../../../features/microsite/registry';
import { generateReference, nightsBetween, REQUEST_TTL_MS } from '../../booking/lifecycle';
import {
	amenity,
	attraction,
	bookingMessage,
	bookingRequest,
	destination,
	hostProfile,
	mediaAsset,
	micrositeConfig,
	micrositeSection,
	property,
	propertyAmenity,
	propertyLocation,
	propertyMedia,
	review,
	room,
	roomAmenity,
	roomMedia,
	user
} from '../schema';
import type { SeedDb } from './client';
import { DEV_USER_EMAIL, type SeedModuleResult } from './dev-user';

/** Stable, so Phase 2 routes and e2e can rely on it. */
export const SAMPLE_PROPERTY_SLUG = 'rumah-kabus';
export const SAMPLE_PROPERTY_NAME = 'Rumah Kabus';
export const SAMPLE_DESTINATION_SLUG = 'cameron-highlands';

const TIMEZONE = 'Asia/Kuala_Lumpur';
/** Malaysia has no daylight saving, so a fixed offset is exact for `Asia/Kuala_Lumpur`. */
const UTC_OFFSET = '+08:00';
const DAY_MS = 86_400_000;

// --- Dates, computed in the property's timezone ---------------------------------------------

function todayInZone(now: Date): string {
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: TIMEZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(now);
}

/** `YYYY-MM-DD` plus whole days (negative for the past). */
function addDays(date: string, days: number): string {
	return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** An instant at a local wall-clock time on a calendar date in the property's timezone. */
function at(date: string, time = '10:00'): Date {
	return new Date(`${date}T${time}:00${UTC_OFFSET}`);
}

const minutes = (date: Date, n: number) => new Date(date.getTime() + n * 60_000);

// --- Images ---------------------------------------------------------------------------------

type Photo = { file: string; width: number; height: number };
const PHOTO = {
	foggyForest: { file: 'foggy-forest.jpg', width: 2400, height: 1600 },
	forestLight: { file: 'forest-light.jpg', width: 2400, height: 1598 },
	heroForest: { file: 'hero-forest.jpg', width: 2400, height: 1430 },
	lakeMountain: { file: 'lake-mountain.jpg', width: 2400, height: 1600 },
	mistyLake: { file: 'misty-lake.jpg', width: 2400, height: 1802 },
	sunTrees: { file: 'sun-trees.jpg', width: 2400, height: 3600 }
} satisfies Record<string, Photo>;

type AssetSpec = {
	photo: Photo;
	alt: string;
	caption?: string;
	focal?: [number, number];
};

/** Library rows, keyed by what they are used for. Several rows may share one file. */
const ASSETS = {
	hero: {
		photo: PHOTO.heroForest,
		alt: 'Morning light breaking through low cloud over green highland ridges, with a narrow road curving down the valley.',
		caption: 'First light over the valley below the house.',
		focal: [0.7, 0.4]
	},
	seaOfCloud: {
		photo: PHOTO.lakeMountain,
		alt: 'A sea of cloud filling a highland valley at sunrise, with pale peaks standing out of it and the sky turning pink.',
		caption: 'Most mornings the valley fills with cloud and the house floats above it.',
		focal: [0.35, 0.4]
	},
	forestTrack: {
		photo: PHOTO.forestLight,
		alt: 'A gravel track running between tall, slender trees in the forest, with low green undergrowth and soft light filtering through.',
		caption: 'The track from the veranda into the forest.'
	},
	jetty: {
		photo: PHOTO.mistyLake,
		alt: 'A wooden jetty extending onto a still lake, with a line of orange floats and a tree-covered shore reflected in the water.',
		caption: 'The jetty at the lake, ten minutes below the house.',
		focal: [0.5, 0.75]
	},
	fig: {
		photo: PHOTO.sunTrees,
		alt: 'Looking up through the spreading branches of an old fig tree with buttress roots, the sun a bright star between the leaves.',
		caption: 'The fig tree at the bottom of the garden.',
		focal: [0.5, 0.55]
	},
	clouds: {
		photo: PHOTO.foggyForest,
		alt: 'Two white peaks rising out of a bank of soft cloud under a pale blue sky.',
		caption: 'Above the cloud line, on a clear day.',
		focal: [0.5, 0.8]
	},
	buoys: {
		photo: PHOTO.mistyLake,
		alt: 'Orange floats strung across the surface of a calm lake, trees mirrored behind them.',
		caption: 'The swimming line, as early as the water is still.',
		focal: [0.7, 0.58]
	},
	thumb: {
		photo: PHOTO.forestLight,
		alt: 'Shafts of morning light between tall trees on a forest track.',
		focal: [0.5, 0.5]
	},
	avatar: {
		photo: PHOTO.sunTrees,
		alt: 'The old fig tree below the house, which Hajar uses as her picture in place of a portrait.',
		focal: [0.5, 0.45]
	}
} satisfies Record<string, AssetSpec>;
type AssetKey = keyof typeof ASSETS;

// --- Copy -----------------------------------------------------------------------------------

const TAGLINE = 'A tea planter’s house above the cloud line.';

const SHORT_DESCRIPTION =
	'Four rooms in a restored 1950s planter’s bungalow on the edge of a tea estate in the Cameron Highlands. Mornings begin in fog and end with a pot of tea on the veranda.';

const DESCRIPTION = `Rumah Kabus sits at 1,400 metres, where the tea terraces meet the first of the mossy forest. It is a long timber house with a deep veranda, a stone fireplace that is lit most evenings, and four rooms that look onto the valley or the garden.

There is no pool and no television. Breakfast is served at one long table, the kitchen garden supplies most of what is on it, and the only schedule is the one the weather sets. The nights are cool enough for a blanket, and the mornings are usually white until about nine.`;

const STORY_HEADING = 'A house built to watch the weather';

const STORY_BODY = `Cheong Yew Meng built Rumah Kabus in 1954. He was a tea taster at the estate below the ridge, a quiet man whose job was to judge a leaf by its smell and the colour of the liquor it made, and he wanted a house from which he could see what the morning was going to do. He bought the plot for the price of a good bicycle, because nobody else wanted a site that spent half the year in cloud. The veranda faces the valley because the fog comes up from that side, and he liked to be sitting there when it arrived.

He built it with what the highlands offered: meranti from a sawmill at Ringlet, granite from the stream bed for the chimney, and roof tiles carried up the hill on the back of the estate lorry. The floorboards are the originals. They are wide, dark and a little uneven, and they creak in the same places they always did. Mr Cheong lived here for thirty-four years, kept bees at the bottom of the garden, and is said to have never once locked the front door.

After he died in 1988 the house passed to the estate, which let it to a succession of forestry officers and then to nobody. By 2003 the veranda had sagged, the roof leaked in four places, and a fig had taken root in the garden wall. Hajar Mansor's father, an agronomist at the estate, walked past it every day for twelve years before he bought it in 2016, mostly to stop it being pulled down.

The restoration took three years. Pak Samad, a carpenter from the village, replaced the rotten beams one by one and refused to use a nail where a joint would do. The floors were sanded by hand, the chimney was rebuilt with its own stones, and the four rooms were made from the old bedrooms and the tea-sorting room at the back. Nothing was moved that did not need to be. The house opened to guests in the spring of 2019.

We have kept to Mr Cheong’s one rule, which is that the day starts with the view. The beds face the windows. Breakfast waits until the fog lifts. If you ask, we will tell you what the morning is going to do, and we are right about two times in three.`;

const HOST_BIO = `I grew up in the estate village below the house and left at eighteen to study in Kuala Lumpur, as everyone did. I came back in 2017 when my father bought Rumah Kabus and needed someone to keep him from sanding the floors with the wrong paper.

I look after the guests, the kitchen garden and most of the breakfast. My husband, Iskandar, looks after the fire, the generator, and the two dogs. If you want to walk through the estate, borrow a pair of boots, or find out which warung is open on a Monday, ask me. I would rather answer a question than leave you with a map.`;

// --- Rooms ----------------------------------------------------------------------------------

type RoomSpec = {
	key: string;
	name: string;
	description: string;
	maxGuests: number;
	beds: { type: 'single' | 'double' | 'queen' | 'king' | 'bunk' | 'sofa'; count: number }[];
	nightlyRateMinor: number;
	unitCount: number;
	media: AssetKey[];
	amenities: [string, string | null][];
};

const ROOMS: RoomSpec[] = [
	{
		key: 'tea-loft',
		name: 'Tea Loft',
		description:
			'The former tea-sorting room, under the old rafters at the back of the house. A king bed faces a tall window onto the estate terraces, and the room smells faintly of cedar and, on warm afternoons, of leaf. Two rooms of this type share the upper floor.',
		maxGuests: 2,
		beds: [{ type: 'king', count: 1 }],
		nightlyRateMinor: 42000,
		unitCount: 2,
		media: ['seaOfCloud', 'forestTrack'],
		amenities: [
			['wifi', null],
			['hot-water', null],
			['toiletries', null],
			['coffee-maker', 'Local ground coffee and a kettle of estate tea'],
			['workspace', 'A small writing desk under the window']
		]
	},
	{
		key: 'garden-room',
		name: 'Garden Room',
		description:
			'On the ground floor, with its own door onto the lawn and the kitchen garden. A queen bed and a single day bed, a deep bathtub, and a low window that holds the first sun. Suits a couple, or a couple with one child.',
		maxGuests: 3,
		beds: [
			{ type: 'queen', count: 1 },
			{ type: 'single', count: 1 }
		],
		nightlyRateMinor: 36000,
		unitCount: 2,
		media: ['forestTrack', 'fig', 'jetty'],
		amenities: [
			['wifi', null],
			['hot-water', null],
			['bathtub', 'Deep, cast iron, with a view of the garden'],
			['toiletries', null],
			['balcony', 'A small stone terrace onto the lawn']
		]
	},
	{
		key: 'kabus-suite',
		name: 'Kabus Suite',
		description:
			'Mr Cheong’s own bedroom, at the front of the house, with the best view of the valley and a wide window seat to watch the fog from. A king bed, a sofa bed for a third guest, and a private end of the veranda.',
		maxGuests: 3,
		beds: [
			{ type: 'king', count: 1 },
			{ type: 'sofa', count: 1 }
		],
		nightlyRateMinor: 68000,
		unitCount: 1,
		media: ['hero', 'seaOfCloud', 'clouds'],
		amenities: [
			['wifi', null],
			['hot-water', null],
			['bathtub', null],
			['balcony', 'Private veranda, facing the valley'],
			['coffee-maker', null],
			['toiletries', null]
		]
	},
	{
		key: 'long-house',
		name: 'The Long House',
		description:
			'The old annexe, a separate two-room cottage across the lawn for families and small groups. A queen bed in one room, two bunks in the other, a sitting room with its own fireplace, and a kitchenette stocked for breakfast.',
		maxGuests: 6,
		beds: [
			{ type: 'queen', count: 1 },
			{ type: 'bunk', count: 2 }
		],
		nightlyRateMinor: 89000,
		unitCount: 1,
		media: ['fig', 'forestTrack', 'buoys'],
		amenities: [
			['wifi', null],
			['hot-water', null],
			['kitchen', 'Kitchenette, no oven'],
			['crib', 'On request'],
			['high-chair', 'On request'],
			['toiletries', null]
		]
	}
];

// --- Property amenities ---------------------------------------------------------------------

const PROPERTY_AMENITIES: [string, string | null][] = [
	['wifi', 'Fibre to the house; the signal fades by the fig tree'],
	['hot-water', 'Wood-fired boiler with an electric backup'],
	['breakfast', 'Served from 8 to 10 at the long table, Malay and Western'],
	['parking', 'Room for six cars on the gravel forecourt'],
	['garden', 'Kitchen garden, lawn and a beehive at the bottom'],
	['coffee-maker', null],
	['bbq', 'Fire pit on request, for guests of the Long House'],
	['yoga-deck', 'Covered, facing east; mats provided'],
	['airport-transfer', 'From Ipoh or Kuala Lumpur, by arrangement and at cost'],
	['daily-housekeeping', null],
	['concierge', 'Hajar answers by message from 7 to 21']
];

// --- Attractions ----------------------------------------------------------------------------

type AttractionSpec = {
	name: string;
	category: (typeof attraction.$inferInsert)['category'];
	hostNote: string;
	travelMinutes?: number;
	travelMode?: (typeof attraction.$inferInsert)['travelMode'];
	distanceMeters?: number;
	url?: string;
	latitude?: number;
	longitude?: number;
	image?: AssetKey;
};

const ATTRACTIONS: AttractionSpec[] = [
	{
		name: 'Ladang Teh Bukit Sinar',
		category: 'nature',
		hostNote:
			'Start at the factory gate at seven, before the pickers reach the top terraces. Walk the contour path to the end and back; it takes about two hours and the light is better than at any viewpoint.',
		travelMinutes: 12,
		travelMode: 'walk',
		latitude: 4.4195,
		longitude: 101.3772,
		image: 'hero'
	},
	{
		name: 'Warung Kak Ros',
		category: 'restaurant',
		hostNote:
			'Kak Ros makes nasi lemak from five and sells out by ten. Ask for the sambal sotong, and do not leave without the pisang goreng, which she fries when you order it.',
		travelMinutes: 8,
		travelMode: 'walk',
		latitude: 4.4172,
		longitude: 101.3801
	},
	{
		name: 'Kopi Lumut',
		category: 'cafe',
		hostNote:
			'A roaster in a converted shophouse with three tables. The flat white is fine; the cold-brew with a slice of orange peel is what I go for after a long day of nothing.',
		travelMinutes: 10,
		travelMode: 'drive',
		latitude: 4.4688,
		longitude: 101.3796,
		url: 'https://example.test/kopi-lumut'
	},
	{
		name: 'Hutan Lumut Boardwalk',
		category: 'nature',
		hostNote:
			'The mossy forest at its best is the first hour after the gate opens, when you can still hear your own footsteps. Wear something warm, because it is ten degrees cooler than the house.',
		travelMinutes: 35,
		travelMode: 'drive',
		latitude: 4.5214,
		longitude: 101.3911,
		image: 'forestTrack'
	},
	{
		name: 'Pasar Tani Saturday Market',
		category: 'shopping',
		hostNote:
			'Go early for the strawberries and stay for the kuih. Mak Cik Zainab at the third stall sells a tapioca cake I have not managed to copy in seven years of trying.',
		travelMinutes: 20,
		travelMode: 'drive',
		latitude: 4.4731,
		longitude: 101.3774
	},
	{
		name: 'Semai Weaving Cooperative',
		category: 'culture',
		hostNote:
			'Run by a group of women from the nearby Orang Asli village. Buy directly from them, and if it is quiet ask to see the pandan being prepared. They will tell you about it for as long as you want to hear.',
		travelMinutes: 25,
		travelMode: 'drive',
		latitude: 4.4402,
		longitude: 101.4012,
		image: 'fig'
	},
	{
		name: 'The Lake Jetty',
		category: 'activity',
		hostNote:
			'A cold, clear swim before breakfast, for those who are brave. The floats mark the safe water. Take a towel and a flask, and do not expect to feel your feet.',
		travelMinutes: 10,
		travelMode: 'walk',
		latitude: 4.4152,
		longitude: 101.3745,
		image: 'jetty'
	},
	{
		name: 'Ringlet Bus Stop',
		category: 'transport',
		hostNote:
			'Coaches from Kuala Lumpur and Ipoh stop here, about six kilometres down the hill. Message me your arrival time and we will send someone to meet you; the last coach is at seven.',
		distanceMeters: 6200,
		latitude: 4.4175,
		longitude: 101.3869
	}
];

// --- Reviews, bookings, inbox ---------------------------------------------------------------

type GuestStay = {
	name: string;
	email: string;
	room: string;
	/** Days before today that the guest checked in. */
	checkInAgo: number;
	nights: number;
	adults: number;
	children: number;
	rating: number;
	title: string | null;
	body: string;
	/** `pending` leaves the review in the moderation queue. */
	status: 'published' | 'pending';
	hostReply?: string;
};

const GUEST_STAYS: GuestStay[] = [
	{
		name: 'Aisha Rahman',
		email: 'aisha.rahman@example.test',
		room: 'tea-loft',
		checkInAgo: 200,
		nights: 3,
		adults: 2,
		children: 0,
		rating: 5,
		title: 'We did not look at our phones once',
		status: 'published',
		body: `We came for a long weekend after a bad few months at work and left feeling like different people. The house is exactly what the photographs promise and somehow quieter. On the first morning we woke to complete white outside the window, no valley, no trees, nothing, and by nine it had lifted like a curtain and the whole terrace was lit up in green. Hajar brought tea to the veranda without being asked.

Breakfast at the long table was the best meal of the trip: soft-boiled eggs from the neighbour's hens, kaya made in the kitchen, a pot of strong tea and a plate of fruit that actually tasted of something. We walked the tea estate before the pickers arrived, borrowed boots when it rained, and spent two evenings by the fire with books we had been carrying around for a year. The bed was warm, the blankets were thick and the room smelled of cedar.

It is not a place for people who want a pool or a bar. It is a place for people who want to listen. We have already asked about next March.`,
		hostReply:
			'Thank you, Aisha. The eggs are Pak Din’s, and he is very pleased to be mentioned. March is lovely, with fewer guests and more fog. We will keep the Tea Loft for you.'
	},
	{
		name: 'Daniel Teo',
		email: 'daniel.teo@example.test',
		room: 'garden-room',
		checkInAgo: 140,
		nights: 2,
		adults: 2,
		children: 1,
		rating: 4,
		title: 'Cold nights, warm house',
		status: 'published',
		body: 'Came with my wife and our six-year-old. The garden room was ideal: he had the day bed and the lawn outside the door, and we had the bath. It gets properly cold at night, so pack a jumper, although the blankets are very good. We lost half a star only because the wifi dropped by the garden, which was perhaps the point.'
	},
	{
		name: 'Priya Nair',
		email: 'priya.nair@example.test',
		room: 'kabus-suite',
		checkInAgo: 95,
		nights: 4,
		adults: 2,
		children: 0,
		rating: 5,
		title: null,
		status: 'published',
		body: 'Quiet. Come in the rain.'
	},
	{
		name: 'Hannah Weiss',
		email: 'hannah.weiss@example.test',
		room: 'long-house',
		checkInAgo: 60,
		nights: 3,
		adults: 4,
		children: 2,
		rating: 5,
		title: 'Six of us, one fireplace, no arguments',
		status: 'published',
		body: 'We brought my parents, my sister’s family and two over-excited children, and the Long House held all of us without a single complaint. The sitting room fire was lit every evening, the children were out with the dogs by seven, and Hajar left a map of the estate with her own marks on it. Genuinely the easiest family holiday we have taken.'
	},
	{
		name: 'Wei Jie Tan',
		email: 'weijie.tan@example.test',
		room: 'tea-loft',
		checkInAgo: 14,
		nights: 2,
		adults: 2,
		children: 0,
		rating: 4,
		title: 'Lovely, and worth the drive',
		status: 'pending',
		body: 'A beautiful house with the right kind of quiet. The Tea Loft was spotless and the view in the morning was unreal. The road up is narrow and steep, so go slowly after dark. We would have stayed longer if we could.'
	}
];

type ImportedReview = {
	origin: string;
	authorName: string;
	rating: number;
	title: string | null;
	body: string;
	/** Days ago the reviewer stayed. */
	stayedAgo: number;
	/** Days ago it was published. */
	publishedAgo: number;
};

const IMPORTED_REVIEWS: ImportedReview[] = [
	{
		origin: 'Google',
		authorName: 'Jonathan K.',
		rating: 4,
		title: null,
		body: 'Peaceful place with excellent breakfast and very helpful hosts. The road up is narrow, so a smaller car helps.',
		stayedAgo: 310,
		publishedAgo: 300
	},
	{
		origin: 'Booking.com',
		authorName: 'Mei Ling',
		rating: 5,
		title: 'The best breakfast in the highlands',
		body: 'We were here for two nights and came away with a jar of the kaya. The house is lovely, the hosts are kind and the views are the real thing. I would go back tomorrow.',
		stayedAgo: 260,
		publishedAgo: 250
	}
];

// --- Helpers --------------------------------------------------------------------------------

/** First name and last initial, never an email: the same rule as `displayName()` in the repo. */
function displayName(fullName: string): string {
	const parts = fullName.split(/\s+/).filter((p) => p !== '' && !p.includes('@'));
	if (parts.length < 2) return parts[0] ?? 'Guest';
	return `${parts[0]} ${[...parts[parts.length - 1]][0].toUpperCase()}.`;
}

/** SHA-256 hex of a fresh random token. The plain token is dropped, never stored or printed. */
const tokenHash = () => createHash('sha256').update(randomBytes(32)).digest('hex');

function must<T>(value: T | undefined, what: string): T {
	if (value === undefined) throw new Error(`Sample property seed: missing ${what}`);
	return value;
}

// --- The module -----------------------------------------------------------------------------

export async function seedSampleProperty(db: SeedDb, now = new Date()): Promise<SeedModuleResult> {
	const [existing] = await db
		.select({ id: property.id })
		.from(property)
		.where(eq(property.slug, SAMPLE_PROPERTY_SLUG))
		.limit(1);
	if (existing) {
		return { created: false, detail: `${SAMPLE_PROPERTY_SLUG} already exists (${existing.id})` };
	}

	const today = todayInZone(now);

	const counts = await db.transaction(async (tx) => {
		const [owner] = await tx
			.select({ id: user.id })
			.from(user)
			.where(eq(user.email, DEV_USER_EMAIL))
			.limit(1);
		if (!owner) throw new Error(`Sample property seed needs the dev user ${DEV_USER_EMAIL}`);

		const amenityKeys = [
			...new Set([...PROPERTY_AMENITIES, ...ROOMS.flatMap((r) => r.amenities)].map(([k]) => k))
		];
		const amenityRows = await tx
			.select({ id: amenity.id, key: amenity.key })
			.from(amenity)
			.where(inArray(amenity.key, amenityKeys));
		const amenityId = (key: string) =>
			must(amenityRows.find((a) => a.key === key)?.id, `amenity "${key}"`);

		// Property.
		const [prop] = await tx
			.insert(property)
			.values({
				slug: SAMPLE_PROPERTY_SLUG,
				name: SAMPLE_PROPERTY_NAME,
				type: 'boutique',
				status: 'published',
				tagline: TAGLINE,
				shortDescription: SHORT_DESCRIPTION,
				description: DESCRIPTION,
				storyHeading: STORY_HEADING,
				storyBody: STORY_BODY,
				currency: 'MYR',
				timezone: TIMEZONE,
				ownerId: owner.id,
				publishedAt: now
			})
			.returning({ id: property.id });
		const propertyId = prop.id;

		// Media library: one row per asset, all in this property's library.
		const assetKeys = Object.keys(ASSETS) as AssetKey[];
		const assetRows = await tx
			.insert(mediaAsset)
			.values(
				assetKeys.map((key) => {
					const spec: AssetSpec = ASSETS[key];
					return {
						propertyId,
						kind: 'image' as const,
						url: `/prototype/${spec.photo.file}`,
						storageKey: null,
						width: spec.photo.width,
						height: spec.photo.height,
						altText: spec.alt,
						caption: spec.caption ?? null,
						focalX: spec.focal?.[0] ?? null,
						focalY: spec.focal?.[1] ?? null
					};
				})
			)
			.returning({ id: mediaAsset.id, url: mediaAsset.url, altText: mediaAsset.altText });
		const asset = (key: AssetKey) =>
			must(assetRows.find((r) => r.altText === ASSETS[key].alt)?.id, `media asset "${key}"`);

		// Placements: hero, a 7-frame gallery, thumbnail.
		const gallery: AssetKey[] = [
			'hero',
			'seaOfCloud',
			'forestTrack',
			'jetty',
			'fig',
			'clouds',
			'buoys'
		];
		await tx.insert(propertyMedia).values([
			{ propertyId, mediaAssetId: asset('hero'), role: 'hero', sortOrder: 0 },
			...gallery.map((key, sortOrder) => ({
				propertyId,
				mediaAssetId: asset(key),
				role: 'gallery' as const,
				sortOrder
			})),
			{ propertyId, mediaAssetId: asset('thumb'), role: 'thumbnail', sortOrder: 0 }
		]);

		// Host.
		await tx.insert(hostProfile).values({
			propertyId,
			displayName: 'Hajar Mansor',
			bio: HOST_BIO,
			avatarAssetId: asset('avatar'),
			hostingSince: 2019,
			languages: ['en', 'ms']
		});

		// Rooms, with their media and amenities.
		const roomRows = await tx
			.insert(room)
			.values(
				ROOMS.map((r, sortOrder) => ({
					propertyId,
					name: r.name,
					description: r.description,
					maxGuests: r.maxGuests,
					beds: r.beds,
					nightlyRateMinor: r.nightlyRateMinor,
					unitCount: r.unitCount,
					sortOrder
				}))
			)
			.returning({ id: room.id, name: room.name });
		const roomIdByKey = new Map<string, string>();
		for (const spec of ROOMS) {
			const row = must(
				roomRows.find((r) => r.name === spec.name),
				`room ${spec.key}`
			);
			roomIdByKey.set(spec.key, row.id);
			await tx.insert(roomMedia).values(
				spec.media.map((key, sortOrder) => ({
					roomId: row.id,
					propertyId,
					mediaAssetId: asset(key),
					sortOrder
				}))
			);
			await tx
				.insert(roomAmenity)
				.values(
					spec.amenities.map(([key, note]) => ({ roomId: row.id, amenityId: amenityId(key), note }))
				);
		}

		// Property amenities.
		await tx
			.insert(propertyAmenity)
			.values(
				PROPERTY_AMENITIES.map(([key, note]) => ({ propertyId, amenityId: amenityId(key), note }))
			);

		// Destination (shared across properties: reuse it if another seed created it), location.
		let [dest] = await tx
			.select({ id: destination.id })
			.from(destination)
			.where(eq(destination.slug, SAMPLE_DESTINATION_SLUG))
			.limit(1);
		dest ??= (
			await tx
				.insert(destination)
				.values({
					slug: SAMPLE_DESTINATION_SLUG,
					name: 'Cameron Highlands',
					region: 'Pahang',
					countryCode: 'MY',
					summary:
						'A plateau of tea terraces, mossy forest and strawberry farms in the Titiwangsa range, 1,300 to 1,800 metres up. Cool enough for a blanket all year, and white with cloud most mornings. Three hours by road from Kuala Lumpur and an hour from Ipoh.'
				})
				.returning({ id: destination.id })
		)[0];
		await tx.insert(propertyLocation).values({
			propertyId,
			addressLine1: 'Lot 214, Jalan Ladang Bukit Sinar',
			addressLine2: 'Off Jalan Ringlet',
			locality: 'Ringlet',
			region: 'Pahang',
			postalCode: '39200',
			countryCode: 'MY',
			latitude: 4.418234,
			longitude: 101.379512,
			destinationId: dest.id,
			// Privacy projection (decision 8): public pages see locality and ~1 km coordinates only.
			showExactLocation: false
		});

		// Attractions.
		await tx.insert(attraction).values(
			ATTRACTIONS.map((a, sortOrder) => ({
				propertyId,
				name: a.name,
				category: a.category,
				hostNote: a.hostNote,
				travelMinutes: a.travelMinutes ?? null,
				travelMode: a.travelMode ?? null,
				distanceMeters: a.distanceMeters ?? null,
				url: a.url ?? null,
				latitude: a.latitude ?? null,
				longitude: a.longitude ?? null,
				mediaAssetId: a.image ? asset(a.image) : null,
				sortOrder
			}))
		);

		// Microsite: the editorial template's sections, all enabled, gallery as the zoom variant.
		await tx
			.insert(micrositeConfig)
			.values({ propertyId, templateKey: 'editorial', accentKey: 'forest', fontKey: 'editorial' });
		const template = TEMPLATES.find((t) => t.key === 'editorial')!;
		await tx.insert(micrositeSection).values(
			template.sections.map((s, sortOrder) => ({
				propertyId,
				type: s.type,
				variant: s.type === 'gallery' ? 'zoom' : s.variant,
				enabled: true,
				sortOrder
			}))
		);

		// Guest stays and their reviews.
		const guestReviewBookingIds: string[] = [];
		for (const stay of GUEST_STAYS) {
			const spec = must(
				ROOMS.find((r) => r.key === stay.room),
				`room ${stay.room}`
			);
			const checkIn = addDays(today, -stay.checkInAgo);
			const checkOut = addDays(checkIn, stay.nights);
			const createdAt = at(addDays(checkIn, -21), '09:00');
			const respondedAt = minutes(createdAt, 60 * 20);
			const [booking] = await tx
				.insert(bookingRequest)
				.values({
					propertyId,
					reference: generateReference(),
					kind: 'booking',
					roomId: roomIdByKey.get(stay.room)!,
					checkIn,
					checkOut,
					adults: stay.adults,
					children: stay.children,
					guestName: stay.name,
					guestEmail: stay.email.trim().toLowerCase(),
					status: 'accepted',
					respondedAt,
					expiresAt: new Date(createdAt.getTime() + REQUEST_TTL_MS),
					currency: 'MYR',
					nightlyRateMinor: spec.nightlyRateMinor,
					estimatedTotalMinor: spec.nightlyRateMinor * nightsBetween(checkIn, checkOut),
					guestAccessTokenHash: tokenHash(),
					createdAt,
					updatedAt: respondedAt
				})
				.returning({ id: bookingRequest.id });
			guestReviewBookingIds.push(booking.id);

			// The stay is over; a review follows a few days later (moderated the day after it is written).
			const writtenAt = at(addDays(checkOut, 2), '20:15');
			const moderatedAt = at(addDays(checkOut, 3), '11:00');
			const published = stay.status === 'published';
			await tx.insert(review).values({
				propertyId,
				source: 'guest',
				bookingRequestId: booking.id,
				rating: stay.rating,
				title: stay.title,
				body: stay.body,
				authorName: displayName(stay.name),
				stayedOn: checkIn,
				status: stay.status,
				moderatedAt: published ? moderatedAt : null,
				publishedAt: published ? moderatedAt : null,
				hostReply: stay.hostReply ?? null,
				hostRepliedAt: stay.hostReply ? at(addDays(checkOut, 4), '08:30') : null,
				createdAt: writtenAt,
				updatedAt: writtenAt
			});
		}

		// Imported reviews: labelled with their origin, no booking, published.
		for (const imp of IMPORTED_REVIEWS) {
			const publishedAt = at(addDays(today, -imp.publishedAgo), '12:00');
			await tx.insert(review).values({
				propertyId,
				source: 'imported',
				origin: imp.origin,
				rating: imp.rating,
				title: imp.title,
				body: imp.body,
				authorName: imp.authorName,
				stayedOn: addDays(today, -imp.stayedAgo),
				status: 'published',
				moderatedAt: publishedAt,
				publishedAt,
				createdAt: publishedAt,
				updatedAt: publishedAt
			});
		}

		// Inbox: one future pending booking and one open question, each with a short thread.
		const gardenRoom = must(
			ROOMS.find((r) => r.key === 'garden-room'),
			'garden room'
		);
		const futureIn = addDays(today, 35);
		const futureOut = addDays(futureIn, 3);
		const bookingCreated = new Date(now.getTime() - 20 * 3_600_000);
		const [futureBooking] = await tx
			.insert(bookingRequest)
			.values({
				propertyId,
				reference: generateReference(),
				kind: 'booking',
				roomId: roomIdByKey.get('garden-room')!,
				checkIn: futureIn,
				checkOut: futureOut,
				adults: 2,
				children: 0,
				guestName: 'Farah Aziz',
				guestEmail: 'farah.aziz@example.test',
				status: 'pending',
				expiresAt: new Date(bookingCreated.getTime() + REQUEST_TTL_MS),
				currency: 'MYR',
				nightlyRateMinor: gardenRoom.nightlyRateMinor,
				estimatedTotalMinor: gardenRoom.nightlyRateMinor * nightsBetween(futureIn, futureOut),
				guestAccessTokenHash: tokenHash(),
				createdAt: bookingCreated,
				updatedAt: bookingCreated
			})
			.returning({ id: bookingRequest.id });

		const questionCreated = new Date(now.getTime() - 6 * 3_600_000);
		const [question] = await tx
			.insert(bookingRequest)
			.values({
				propertyId,
				reference: generateReference(),
				kind: 'question',
				guestName: 'Lars Eriksen',
				guestEmail: 'lars.eriksen@example.test',
				status: 'pending',
				expiresAt: new Date(questionCreated.getTime() + REQUEST_TTL_MS),
				currency: 'MYR',
				guestAccessTokenHash: tokenHash(),
				createdAt: questionCreated,
				updatedAt: questionCreated
			})
			.returning({ id: bookingRequest.id });

		await tx.insert(bookingMessage).values([
			{
				bookingRequestId: futureBooking.id,
				sender: 'guest',
				body: 'We are celebrating our anniversary and would love the Garden Room. Is it possible to have the bath ready on arrival, and is there anywhere nearby for a quiet dinner on the first night?',
				createdAt: bookingCreated
			},
			{
				bookingRequestId: futureBooking.id,
				sender: 'host',
				authorUserId: owner.id,
				body: 'Congratulations. Yes to both. Kak Ros’s warung is a short walk and does a good dinner if you order by four. I will light the boiler an hour before you arrive.',
				createdAt: minutes(bookingCreated, 90)
			},
			{
				bookingRequestId: question.id,
				sender: 'guest',
				body: 'We are travelling with a toddler and plan to come by coach from Kuala Lumpur. Is there a cot, and is the last stretch to the house safe to walk with a pushchair?',
				createdAt: questionCreated
			},
			{
				bookingRequestId: question.id,
				sender: 'host',
				authorUserId: owner.id,
				body: 'There is a cot in the Long House, and we can send someone to meet the coach at Ringlet. The last kilometre is steep, so I would not walk it with a pushchair. Which dates are you thinking of?',
				createdAt: minutes(questionCreated, 120)
			},
			{
				bookingRequestId: question.id,
				sender: 'guest',
				body: 'Thank you. Probably the first week of next month. We will arrive on the 4 pm coach.',
				createdAt: minutes(questionCreated, 200)
			}
		]);

		return {
			amenities: PROPERTY_AMENITIES.length,
			rooms: ROOMS.length,
			gallery: gallery.length,
			attractions: ATTRACTIONS.length,
			reviews: GUEST_STAYS.length + IMPORTED_REVIEWS.length
		};
	});

	return {
		created: true,
		detail:
			`${SAMPLE_PROPERTY_SLUG}: ${counts.rooms} rooms, ${counts.amenities} amenities, ` +
			`${counts.gallery}-image gallery, ${counts.attractions} attractions, ${counts.reviews} reviews, ` +
			'1 pending booking, 1 question'
	};
}
