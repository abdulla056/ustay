/**
 * Seed module: the sample property "Rumah Kabus" (UST-20). Phase 1's exit criterion: one fully
 * populated, published property with every relation filled, in real copy, for the Phase 2
 * microsite to be built against.
 *
 * Runs under plain `bun`, so it never imports repositories (they pull `$env`). It writes through
 * `ctx.db` and the Drizzle query builder, and must therefore produce exactly what the repos would
 * have produced: same-library media, images where an image is required, price snapshots of
 * `nightly_rate_minor x nights`, consistent `published_at` / `moderated_at`, display names (never
 * emails) as review authors, `expires_at` = created + 72 hours, lower-cased emails. The pure
 * helpers it shares with the repos (`booking/lifecycle`, `review/display-name`) are imported, not
 * copied.
 *
 * Idempotent: if the slug exists the module skips, except that the inbox fixtures (one pending
 * booking, one open question) are refreshed when they have gone stale, because a pending request
 * expires after 72 hours and its dates are relative to "now". Everything else is never touched on
 * a re-run. A first run writes everything in one transaction, so a failure leaves no half property
 * behind.
 *
 * Imagery: local static files only (`/prototype/*.jpg`, `static/prototype/`), reused across
 * placements. No external URLs, so e2e and offline dev never touch the network.
 */
import { and, eq, inArray } from 'drizzle-orm';
import { TEMPLATES } from '../../../features/microsite/registry';
import {
	generateAccessToken,
	generateReference,
	hashAccessToken,
	nightsBetween,
	REQUEST_TTL_MS,
	todayInZone
} from '../../booking/lifecycle';
import { displayName } from '../../review/display-name';
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

/** The exact address, which public pages coarsen (decision 8). Attractions are placed from it. */
const LATITUDE = 4.418234;
const LONGITUDE = 101.379512;

// --- Dates, computed in the property's timezone ---------------------------------------------

/** `YYYY-MM-DD` plus whole days (negative for the past). */
function addDays(date: string, days: number): string {
	return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** An instant at a local wall-clock time on a calendar date in the property's timezone. */
function at(date: string, time = '10:00'): Date {
	return new Date(`${date}T${time}:00${UTC_OFFSET}`);
}

const minutes = (date: Date, n: number) => new Date(date.getTime() + n * 60_000);

/** A point `north` and `east` metres from the exact address, to six decimal places. */
function pointFrom(north: number, east: number): { latitude: number; longitude: number } {
	const metresPerDegree = 111_320;
	const round = (n: number) => Math.round(n * 1e6) / 1e6;
	return {
		latitude: round(LATITUDE + north / metresPerDegree),
		longitude: round(LONGITUDE + east / (metresPerDegree * Math.cos((LATITUDE * Math.PI) / 180)))
	};
}

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

After he died in 1988 the house passed to the estate, which let it to a succession of forestry officers and then to nobody. By 2003 the veranda had sagged, the roof leaked in four places, and a fig had taken root in the garden wall. Hajar Mansor's father, an agronomist at the estate, walked past it every day for thirteen years before he bought it in 2016, mostly to stop it being pulled down.

The restoration took three years. Pak Samad, a carpenter from the village, replaced the rotten beams one by one and refused to use a nail where a joint would do. The floors were sanded by hand, the chimney was rebuilt with its own stones, and the four rooms were made from the old bedrooms and the tea-sorting room at the back. Nothing was moved that did not need to be. The house opened to guests in the spring of 2019.

We have kept to Mr Cheong’s one rule, which is that the day starts with the view. The beds face the windows. Breakfast waits until the fog lifts. If you ask, we will tell you what the morning is going to do, and we are right about two times in three.`;

const HOST_BIO = `I grew up in the estate village below the house and left at eighteen to study in Kuala Lumpur, as everyone did. I came back in 2016, when my father bought Rumah Kabus and needed someone to keep him from sanding the floors with the wrong paper.

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
	/** Metres north and east of the exact address; the stored coordinates are derived from it. */
	offset: [north: number, east: number];
	image?: AssetKey;
};

// The offsets are chosen so the straight-line distance fits the travel time: about 70 m a minute
// on foot, about 400 m a minute by car on these hill roads (the road is always longer than the
// straight line). The bus stop has a distance instead of a time, and is 6.2 km by road.
const ATTRACTIONS: AttractionSpec[] = [
	{
		name: 'Ladang Teh Bukit Sinar',
		category: 'nature',
		hostNote:
			'Start at the factory gate at seven, before the pickers reach the top terraces. Walk the contour path to the end and back; it takes about two hours and the light is better than at any viewpoint.',
		travelMinutes: 12,
		travelMode: 'walk',
		offset: [450, -520], // 690 m
		image: 'hero'
	},
	{
		name: 'Warung Kak Ros',
		category: 'restaurant',
		hostNote:
			'Kak Ros makes nasi lemak from five and sells out by ten. Ask for the sambal sotong, and do not leave without the pisang goreng, which she fries when you order it.',
		travelMinutes: 8,
		travelMode: 'walk',
		offset: [-380, 260] // 460 m
	},
	{
		name: 'Kopi Lumut',
		category: 'cafe',
		hostNote:
			'A roaster in a converted shophouse with three tables. The flat white is fine; the cold-brew with a slice of orange peel is what I go for after a long day of nothing.',
		travelMinutes: 10,
		travelMode: 'drive',
		url: 'https://example.test/kopi-lumut',
		offset: [4200, 1500] // 4.5 km
	},
	{
		name: 'Hutan Lumut Boardwalk',
		category: 'nature',
		hostNote:
			'The mossy forest at its best is the first hour after the gate opens, when you can still hear your own footsteps. Wear something warm, because it is ten degrees cooler than the house.',
		travelMinutes: 35,
		travelMode: 'drive',
		offset: [11500, 7800], // 13.9 km
		image: 'forestTrack'
	},
	{
		name: 'Pasar Tani Saturday Market',
		category: 'shopping',
		hostNote:
			'Go early for the strawberries and stay for the kuih. Mak Cik Zainab at the third stall sells a tapioca cake I have not managed to copy in seven years of trying.',
		travelMinutes: 20,
		travelMode: 'drive',
		offset: [-6200, 4900] // 7.9 km
	},
	{
		name: 'Semai Weaving Cooperative',
		category: 'culture',
		hostNote:
			'Run by a group of women from the Orang Asli village across the valley. Buy directly from them, and if it is quiet ask to see the pandan being prepared. They will tell you about it for as long as you want to hear.',
		travelMinutes: 25,
		travelMode: 'drive',
		offset: [-3500, -9300], // 9.9 km
		image: 'fig'
	},
	{
		name: 'The Lake Jetty',
		category: 'activity',
		hostNote:
			'A cold, clear swim before breakfast, for those who are brave. The floats mark the safe water. Take a towel and a flask, and do not expect to feel your feet.',
		travelMinutes: 10,
		travelMode: 'walk',
		offset: [-250, -520], // 580 m
		image: 'jetty'
	},
	{
		name: 'Ringlet Bus Stop',
		category: 'transport',
		hostNote:
			'Coaches from Kuala Lumpur and Ipoh stop here, about six kilometres down the hill. Message me your arrival time and we will send someone to meet you; the last coach is at seven.',
		distanceMeters: 6200,
		offset: [-3900, 4800] // 6.2 km straight line
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
		body: 'Came with my wife and our six-year-old. The garden room was ideal: he had the day bed and the lawn outside the door, and we had the bath. It gets properly cold at night, so pack a jumper, although the blankets are very good. I would have said five stars, but the wifi dropped by the garden, which was perhaps the point.'
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

function must<T>(value: T | undefined, what: string): T {
	if (value === undefined) throw new Error(`Sample property seed: missing ${what}`);
	return value;
}

/** The transaction handle drizzle passes to `db.transaction`. */
type Tx = Parameters<Parameters<SeedDb['transaction']>[0]>[0];

/** Pair the rows an `insert ... returning` produced with the specs they came from, in order. */
function zipRows<S, R>(specs: readonly S[], rows: readonly R[], what: string): [S, R][] {
	if (specs.length !== rows.length) throw new Error(`Sample property seed: ${what} count mismatch`);
	return specs.map((spec, i) => [spec, rows[i]]);
}

// --- The inbox: one pending booking and one open question -----------------------------------

const FARAH_EMAIL = 'farah.aziz@example.test';
const LARS_EMAIL = 'lars.eriksen@example.test';
const INBOX_EMAILS = [FARAH_EMAIL, LARS_EMAIL];
const GARDEN_ROOM_NAME = 'Garden Room';

/**
 * Write the inbox fixtures: a pending booking for the Garden Room 35 days out, created 20 hours
 * ago, and a pending question created 6 hours ago, each with a short thread. Dates and creation
 * times are relative to `now`, in the property's timezone.
 */
async function insertInbox(
	tx: Tx,
	args: {
		propertyId: string;
		ownerId: string | null;
		gardenRoom: { id: string; nightlyRateMinor: number };
		now: Date;
	}
) {
	const { propertyId, ownerId, gardenRoom, now } = args;
	const today = todayInZone(TIMEZONE, now);
	const futureIn = addDays(today, 35);
	const futureOut = addDays(futureIn, 3);
	const bookingCreated = new Date(now.getTime() - 20 * 3_600_000);
	const questionCreated = new Date(now.getTime() - 6 * 3_600_000);

	const [bookingHash, questionHash] = await Promise.all([
		hashAccessToken(generateAccessToken()),
		hashAccessToken(generateAccessToken())
	]);
	const rows = await tx
		.insert(bookingRequest)
		.values([
			{
				propertyId,
				reference: generateReference(),
				kind: 'booking',
				roomId: gardenRoom.id,
				checkIn: futureIn,
				checkOut: futureOut,
				adults: 2,
				children: 0,
				guestName: 'Farah Aziz',
				guestEmail: FARAH_EMAIL,
				status: 'pending',
				expiresAt: new Date(bookingCreated.getTime() + REQUEST_TTL_MS),
				currency: 'MYR',
				nightlyRateMinor: gardenRoom.nightlyRateMinor,
				estimatedTotalMinor: gardenRoom.nightlyRateMinor * nightsBetween(futureIn, futureOut),
				guestAccessTokenHash: bookingHash,
				createdAt: bookingCreated,
				updatedAt: bookingCreated
			},
			{
				propertyId,
				reference: generateReference(),
				kind: 'question',
				guestName: 'Lars Eriksen',
				guestEmail: LARS_EMAIL,
				status: 'pending',
				expiresAt: new Date(questionCreated.getTime() + REQUEST_TTL_MS),
				currency: 'MYR',
				guestAccessTokenHash: questionHash,
				createdAt: questionCreated,
				updatedAt: questionCreated
			}
		])
		.returning({ id: bookingRequest.id, guestEmail: bookingRequest.guestEmail });
	const bookingId = must(rows.find((r) => r.guestEmail === FARAH_EMAIL)?.id, 'inbox booking');
	const questionId = must(rows.find((r) => r.guestEmail === LARS_EMAIL)?.id, 'inbox question');

	await tx.insert(bookingMessage).values([
		{
			bookingRequestId: bookingId,
			sender: 'guest',
			body: 'We are celebrating our anniversary and would love the Garden Room. Is it possible to have the bath ready on arrival, and is there anywhere nearby for a quiet dinner on the first night?',
			createdAt: bookingCreated
		},
		{
			bookingRequestId: bookingId,
			sender: 'host',
			authorUserId: ownerId,
			body: 'Congratulations. Yes to both. Kak Ros’s warung is a short walk and does a good dinner if you order by four. I will light the boiler an hour before you arrive.',
			createdAt: minutes(bookingCreated, 90)
		},
		{
			bookingRequestId: questionId,
			sender: 'guest',
			body: 'We are travelling with a toddler and plan to come by coach from Kuala Lumpur. Is there a cot, and is the last stretch to the house safe to walk with a pushchair?',
			createdAt: questionCreated
		},
		{
			bookingRequestId: questionId,
			sender: 'host',
			authorUserId: ownerId,
			body: 'There is a cot in the Long House, and we can send someone to meet the coach at Ringlet. The last kilometre is steep, so I would not walk it with a pushchair. Which dates are you thinking of?',
			createdAt: minutes(questionCreated, 120)
		},
		{
			bookingRequestId: questionId,
			sender: 'guest',
			body: 'Thank you. Probably the first week of next month. We will arrive on the 4 pm coach.',
			createdAt: minutes(questionCreated, 200)
		}
	]);
}

/**
 * The property exists, so only the inbox may change. A pending request expires 72 hours after it
 * is created, and the booking's dates are relative to "now", so the fixtures go stale: if either
 * is missing, no longer `pending` or past `expires_at`, both are deleted (their threads cascade)
 * and written again with fresh dates. Everything else is left exactly as it is.
 */
async function refreshInbox(db: SeedDb, propertyId: string, now: Date): Promise<SeedModuleResult> {
	return db.transaction(async (tx) => {
		const requests = await tx
			.select({
				id: bookingRequest.id,
				email: bookingRequest.guestEmail,
				status: bookingRequest.status,
				expiresAt: bookingRequest.expiresAt
			})
			.from(bookingRequest)
			.where(
				and(
					eq(bookingRequest.propertyId, propertyId),
					inArray(bookingRequest.guestEmail, INBOX_EMAILS)
				)
			);
		const fresh =
			INBOX_EMAILS.every((email) => requests.some((r) => r.email === email)) &&
			requests.every((r) => r.status === 'pending' && r.expiresAt.getTime() > now.getTime());
		if (fresh) {
			return {
				created: false,
				detail: `${SAMPLE_PROPERTY_SLUG} already exists, inbox is current`
			};
		}

		const [gardenRoom] = await tx
			.select({ id: room.id, nightlyRateMinor: room.nightlyRateMinor })
			.from(room)
			.where(and(eq(room.propertyId, propertyId), eq(room.name, GARDEN_ROOM_NAME)))
			.limit(1);
		if (!gardenRoom) {
			return {
				created: false,
				detail: `${SAMPLE_PROPERTY_SLUG} exists but has no "${GARDEN_ROOM_NAME}"; inbox left alone`
			};
		}
		const [owner] = await tx
			.select({ ownerId: property.ownerId })
			.from(property)
			.where(eq(property.id, propertyId))
			.limit(1);

		if (requests.length > 0) {
			await tx.delete(bookingRequest).where(
				inArray(
					bookingRequest.id,
					requests.map((r) => r.id)
				)
			);
		}
		await insertInbox(tx, { propertyId, ownerId: owner?.ownerId ?? null, gardenRoom, now });
		return {
			created: false,
			refreshed: true,
			detail: `${SAMPLE_PROPERTY_SLUG} inbox fixtures were stale; recreated with fresh dates`
		};
	});
}

// --- The module -----------------------------------------------------------------------------

export async function seedSampleProperty(db: SeedDb, now = new Date()): Promise<SeedModuleResult> {
	const [existing] = await db
		.select({ id: property.id })
		.from(property)
		.where(eq(property.slug, SAMPLE_PROPERTY_SLUG))
		.limit(1);
	if (existing) return refreshInbox(db, existing.id, now);

	const today = todayInZone(TIMEZONE, now);

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

		// Media library: one row per ASSETS key, all in this property's library. A multi-row INSERT
		// returns its rows in VALUES order, so each returned row is paired with its key by position
		// (and the url is checked, in case that ever stops being true).
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
			.returning({ id: mediaAsset.id, url: mediaAsset.url });
		const assetIds = new Map<AssetKey, string>(
			zipRows(assetKeys, assetRows, 'media assets').map(([key, row]) => {
				if (row.url !== `/prototype/${ASSETS[key].photo.file}`) {
					throw new Error(`Sample property seed: media asset "${key}" came back out of order`);
				}
				return [key, row.id];
			})
		);
		const asset = (key: AssetKey) => must(assetIds.get(key), `media asset "${key}"`);

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

		// Rooms, with their media and amenities in one insert each.
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
		const rooms = zipRows(ROOMS, roomRows, 'rooms').map(([spec, row]) => {
			if (row.name !== spec.name)
				throw new Error('Sample property seed: rooms came back out of order');
			return { spec, id: row.id };
		});
		const roomIdByKey = new Map(rooms.map((r) => [r.spec.key, r.id]));
		await tx.insert(roomMedia).values(
			rooms.flatMap(({ spec, id }) =>
				spec.media.map((key, sortOrder) => ({
					roomId: id,
					propertyId,
					mediaAssetId: asset(key),
					sortOrder
				}))
			)
		);
		await tx
			.insert(roomAmenity)
			.values(
				rooms.flatMap(({ spec, id }) =>
					spec.amenities.map(([key, note]) => ({ roomId: id, amenityId: amenityId(key), note }))
				)
			);

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
			latitude: LATITUDE,
			longitude: LONGITUDE,
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
				...pointFrom(...a.offset),
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

		// Guest stays: one accepted past booking each, inserted together.
		const stays = await Promise.all(
			GUEST_STAYS.map(async (stay) => {
				const spec = must(
					ROOMS.find((r) => r.key === stay.room),
					`room ${stay.room}`
				);
				const checkIn = addDays(today, -stay.checkInAgo);
				const checkOut = addDays(checkIn, stay.nights);
				const createdAt = at(addDays(checkIn, -21), '09:00');
				const respondedAt = minutes(createdAt, 60 * 20);
				return {
					stay,
					checkIn,
					checkOut,
					booking: {
						propertyId,
						reference: generateReference(),
						kind: 'booking' as const,
						roomId: must(roomIdByKey.get(stay.room), `room ${stay.room}`),
						checkIn,
						checkOut,
						adults: stay.adults,
						children: stay.children,
						guestName: stay.name,
						guestEmail: stay.email.trim().toLowerCase(),
						status: 'accepted' as const,
						respondedAt,
						expiresAt: new Date(createdAt.getTime() + REQUEST_TTL_MS),
						currency: 'MYR',
						nightlyRateMinor: spec.nightlyRateMinor,
						estimatedTotalMinor: spec.nightlyRateMinor * nightsBetween(checkIn, checkOut),
						guestAccessTokenHash: await hashAccessToken(generateAccessToken()),
						createdAt,
						updatedAt: respondedAt
					}
				};
			})
		);
		const bookingRows = await tx
			.insert(bookingRequest)
			.values(stays.map((s) => s.booking))
			.returning({ id: bookingRequest.id, guestEmail: bookingRequest.guestEmail });
		const paired = zipRows(stays, bookingRows, 'bookings').map(([s, row]) => {
			if (row.guestEmail !== s.booking.guestEmail) {
				throw new Error('Sample property seed: bookings came back out of order');
			}
			return { ...s, bookingId: row.id };
		});

		// Reviews: a guest review per stay (written a couple of days after checkout, moderated the
		// day after), then the imported ones, labelled with their origin and with no booking.
		await tx.insert(review).values([
			...paired.map(({ stay, checkIn, checkOut, bookingId }) => {
				const writtenAt = at(addDays(checkOut, 2), '20:15');
				const moderatedAt = at(addDays(checkOut, 3), '11:00');
				const published = stay.status === 'published';
				return {
					propertyId,
					source: 'guest' as const,
					bookingRequestId: bookingId,
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
				};
			}),
			...IMPORTED_REVIEWS.map((imp) => {
				const publishedAt = at(addDays(today, -imp.publishedAgo), '12:00');
				return {
					propertyId,
					source: 'imported' as const,
					origin: imp.origin,
					rating: imp.rating,
					title: imp.title,
					body: imp.body,
					authorName: imp.authorName,
					stayedOn: addDays(today, -imp.stayedAgo),
					status: 'published' as const,
					moderatedAt: publishedAt,
					publishedAt,
					createdAt: publishedAt,
					updatedAt: publishedAt
				};
			})
		]);

		// Inbox: one future pending booking and one open question, each with a short thread.
		const gardenRoom = must(
			ROOMS.find((r) => r.key === 'garden-room'),
			'garden room'
		);
		await insertInbox(tx, {
			propertyId,
			ownerId: owner.id,
			gardenRoom: {
				id: must(roomIdByKey.get('garden-room'), 'garden room id'),
				nightlyRateMinor: gardenRoom.nightlyRateMinor
			},
			now
		});

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
