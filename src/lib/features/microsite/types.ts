/**
 * The public microsite view model (UST-21): the one shape `loadMicrosite` produces and every
 * section component consumes. Client-safe and types only.
 *
 * It is shaped for rendering, not copied from rows: no owner ids, no emails, no token hashes, no
 * inbox, no address lines unless the owner chose to show the exact location (decision 8).
 */
import type { GalleryFrame } from '$lib/features/gallery/types';
import type { SectionType } from './registry';

export type { GalleryFrame };

/** Integer minor units plus ISO-4217 currency. Format with `formatMoney`. */
export type Money = { amountMinor: number; currency: string };

/** Markdown rendered to HTML on the server (`html: false`, safe links). Render with `{@html}`. */
export type RichText = { html: string };

export type PropertyView = {
	slug: string;
	name: string;
	type: 'homestay' | 'resort' | 'boutique' | 'rental';
	tagline: string | null;
	shortDescription: string | null;
	currency: string;
};

export type ThemeView = {
	templateKey: string;
	accentKey: string;
	fontKey: string;
	/** Accent hex on the light and inverse tones. Not applied yet (UST-31). */
	accent: { light: string; dark: string };
	font: { display: string; body: string };
};

export type SeoView = {
	title: string;
	/** From `short_description`; null when the property has none. */
	description: string | null;
	/** Site-relative: `/s/<current-slug>`. The page makes it absolute with the request origin. */
	canonicalPath: string;
	/** The hero image. `src` may be site-relative; the page makes it absolute. */
	image: { src: string; alt: string } | null;
	/** Display range of nightly rates, e.g. `RM280 - RM640`; null without rooms. */
	priceRange: string | null;
	/** Locality, region and country only (never an address). */
	address: { locality: string; region: string | null; countryCode: string } | null;
};

// --- Section data ---------------------------------------------------------------------------

export type HeroData = {
	name: string;
	tagline: string | null;
	/** "Tanah Rata, Pahang" style label from the public location; null without a location. */
	locationLabel: string | null;
	/** The hero placement, else the first gallery photograph; null when the property has no photo. */
	image: GalleryFrame | null;
	/** `#booking` when the booking section is enabled and rendered, else null (the hero hides its CTA). */
	bookingAnchor: string | null;
};

export type ReviewView = {
	rating: number;
	title: string | null;
	body: string;
	authorName: string;
	/** `YYYY-MM-DD`, the stay date, when known. */
	stayedOn: string | null;
	/** Imported reviews must be labelled with where they came from. */
	source: 'guest' | 'imported';
	/** For an imported review, the origin ("Google"); null for a verified guest review. */
	origin: string | null;
	hostReply: string | null;
};

export type ReviewsView = {
	/** Published reviews only, newest first. */
	items: ReviewView[];
	summary: {
		count: number;
		average: number | null;
		guestCount: number;
		importedCount: number;
	};
};

export type OverviewData = {
	type: PropertyView['type'];
	shortDescription: string | null;
	/** The long description split into paragraphs (plain text). */
	paragraphs: string[];
	/** "Tanah Rata, Pahang" style label from the public location; null without a location. */
	placeLabel: string | null;
	roomCount: number;
	/** The largest `maxGuests` across rooms; null without rooms. */
	maxGuests: number | null;
	/** The cheapest nightly rate; null without rooms. */
	fromPrice: Money | null;
	/** Published reviews and their summary; null when there are none. */
	reviews: ReviewsView | null;
};

export type GalleryData = { frames: GalleryFrame[] };

export type RoomView = {
	name: string;
	description: string | null;
	maxGuests: number;
	beds: { type: string; count: number }[];
	nightly: Money;
	image: GalleryFrame | null;
	amenities: { name: string; icon: string }[];
};

export type RoomsData = { rooms: RoomView[] };

export type AmenityGroupView = {
	category: string;
	/** Human label for the category. */
	label: string;
	items: { key: string; name: string; icon: string; note: string | null }[];
};

export type AmenitiesData = { groups: AmenityGroupView[] };

export type HostStoryData = {
	/** The property's story; null when there is none. */
	story: { heading: string | null; body: RichText } | null;
	/** The host; null when there is no profile. */
	host: {
		displayName: string;
		bio: RichText | null;
		avatar: GalleryFrame | null;
		hostingSince: number | null;
		languages: string[];
	} | null;
};

export type AttractionView = {
	name: string;
	category: string;
	/** The host's voice. */
	hostNote: string | null;
	travel: { minutes: number; mode: string } | null;
	distanceMeters: number | null;
	url: string | null;
	/** A public place, so exact. Both or neither (the schema enforces the pair). */
	latitude: number | null;
	longitude: number | null;
	image: GalleryFrame | null;
};

export type LocationData = {
	/** The public projection. Address lines are present only when the owner shows the exact place. */
	place: {
		/** "Locality, region": computed once, shown by the hero and the location section. */
		label: string;
		locality: string;
		region: string | null;
		countryCode: string;
		/** About 1 km unless `exact`. */
		latitude: number | null;
		longitude: number | null;
		exact: boolean;
		addressLines: string[];
	} | null;
	destination: { name: string; summary: string | null } | null;
	attractions: AttractionView[];
};

export type BookingCtaData = {
	name: string;
	/** Rooms for the optional room select. `key` is opaque. */
	rooms: { key: string; name: string }[];
	fromPrice: Money | null;
	maxGuests: number | null;
};

/** What each section type needs. A new section type is a new key here. */
export type SectionDataMap = {
	hero: HeroData;
	overview: OverviewData;
	gallery: GalleryData;
	rooms: RoomsData;
	amenities: AmenitiesData;
	host_story: HostStoryData;
	location: LocationData;
	booking_cta: BookingCtaData;
};

/** The props contract every section component receives. */
export type SectionProps<T extends SectionType> = {
	data: SectionDataMap[T];
	variant: string;
	/**
	 * The editorial spine number ("01", "02"...) the renderer assigns by position, in render order,
	 * skipping `hero` and `booking_cta`. Optional: a section without a spine label ignores it, and
	 * null means "show no number".
	 */
	number?: string | null;
};

/** An ordered discriminated union keyed by `type`. */
export type SectionView = {
	[T in SectionType]: { type: T; variant: string; data: SectionDataMap[T] };
}[SectionType];

export type MicrositeView = {
	property: PropertyView;
	theme: ThemeView;
	sections: SectionView[];
	seo: SeoView;
};
