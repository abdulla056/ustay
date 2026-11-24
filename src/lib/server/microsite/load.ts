/**
 * `loadMicrosite(slug)` (UST-21): composes the Phase 1 repositories into the public view model a
 * microsite renders (`$lib/features/microsite/types`). Holds no SvelteKit `error()` or
 * `redirect()`: the route maps the result.
 *
 * Lookup order: a published property with the slug renders; a retired slug whose current property
 * is published redirects; anything else (unknown, draft, archived) is `not_found`. Draft content
 * never leaves this function.
 *
 * Empty-section rules (a section whose data is empty is dropped, never rendered as an empty shell):
 * - `hero`, `booking_cta`: always kept when enabled (the hero image may be null).
 * - `overview`: dropped without a short description and without a long description.
 * - `gallery`: dropped without any gallery photograph.
 * - `rooms`: dropped without rooms.
 * - `amenities`: dropped without property amenities.
 * - `host_story`: dropped without both a story body and a host profile.
 * - `location`: dropped without both a location and attractions.
 */
import { db, type Executor } from '$lib/server/db';
import { findPropertyBySlug, findRedirectTarget } from '$lib/server/property/property.repo';
import { getRenderableMicrosite } from '$lib/server/microsite/microsite.repo';
import { getPublicPropertyLocation } from '$lib/server/property/location.repo';
import {
	listMediaAssets,
	listPropertyMedia,
	listMediaForRooms,
	type MediaAsset
} from '$lib/server/property/media.repo';
import { getHostProfile } from '$lib/server/property/host.repo';
import { listRoomsForProperty } from '$lib/server/property/room.repo';
import { listAmenitiesForRooms, listPropertyAmenities } from '$lib/server/property/amenity.repo';
import { listAttractions } from '$lib/server/property/attraction.repo';
import { findDestinationById } from '$lib/server/destination/destination.repo';
import { getRatingSummary, listReviews } from '$lib/server/review/review.repo';
import { formatMoney } from '$lib/features/microsite/format';
import type {
	AmenitiesData,
	AttractionView,
	BookingCtaData,
	GalleryFrame,
	HeroData,
	HostStoryData,
	LocationData,
	MicrositeView,
	Money,
	OverviewData,
	PropertyView,
	ReviewsView,
	RoomView,
	SectionView,
	SeoView
} from '$lib/features/microsite/types';
import { renderMarkdown } from './markdown';

export type LoadMicrositeResult =
	{ kind: 'ok'; view: MicrositeView } | { kind: 'redirect'; slug: string } | { kind: 'not_found' };

const REVIEW_LIMIT = 10;

const AMENITY_CATEGORY_LABELS: Record<string, string> = {
	essentials: 'Essentials',
	bathroom: 'Bathroom',
	kitchen: 'Kitchen',
	outdoor: 'Outdoors',
	wellness: 'Wellness',
	family: 'Family',
	accessibility: 'Accessibility',
	services: 'Services'
};

/** A media row as a gallery frame. Only images become frames (a video is not a photograph). */
function frame(
	asset: Pick<
		MediaAsset,
		'kind' | 'url' | 'altText' | 'width' | 'height' | 'focalX' | 'focalY' | 'caption'
	>
): GalleryFrame | null {
	if (asset.kind !== 'image') return null;
	return {
		src: asset.url,
		alt: asset.altText,
		width: asset.width,
		height: asset.height,
		...(asset.focalX !== null && asset.focalY !== null
			? { focalX: asset.focalX, focalY: asset.focalY }
			: {}),
		...(asset.caption ? { caption: asset.caption } : {})
	};
}

const frames = (assets: Parameters<typeof frame>[0][]): GalleryFrame[] =>
	assets.map(frame).filter((f): f is GalleryFrame => f !== null);

const paragraphs = (text: string | null) =>
	(text ?? '')
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter((p) => p !== '');

/**
 * Every read happens inside one read-only `repeatable read` transaction, so the property's status,
 * its sections and all its relations come from the same snapshot: what is rendered is exactly what
 * was checked to be published, and a concurrent unpublish cannot leak half a page.
 */
export async function loadMicrosite(slug: string, tx: Executor = db): Promise<LoadMicrositeResult> {
	return tx.transaction((inner) => loadInSnapshot(slug, inner), {
		isolationLevel: 'repeatable read',
		accessMode: 'read only'
	});
}

async function loadInSnapshot(slug: string, tx: Executor): Promise<LoadMicrositeResult> {
	const found = await findPropertyBySlug(slug, tx);
	if (!found) {
		const target = await findRedirectTarget(slug, tx);
		return target?.status === 'published'
			? { kind: 'redirect', slug: target.slug }
			: { kind: 'not_found' };
	}
	if (found.status !== 'published') return { kind: 'not_found' };

	const id = found.id;
	const [
		microsite,
		location,
		library,
		placed,
		host,
		rooms,
		propertyAmenities,
		attractions,
		reviewPage,
		ratingSummary
	] = await Promise.all([
		getRenderableMicrosite(id, tx),
		getPublicPropertyLocation(id, tx),
		listMediaAssets(id, tx),
		listPropertyMedia(id, undefined, tx),
		getHostProfile(id, tx),
		listRoomsForProperty(id, tx),
		listPropertyAmenities(id, tx),
		listAttractions(id, tx),
		listReviews(id, { limit: REVIEW_LIMIT }, tx),
		getRatingSummary(id, tx)
	]);
	// Same snapshot as the status check above, so this only misses for a malformed id.
	if (!microsite) return { kind: 'not_found' };

	const roomIds = rooms.map((r) => r.id);
	const [roomMedia, roomAmenities, destination] = await Promise.all([
		listMediaForRooms(roomIds, tx),
		listAmenitiesForRooms(roomIds, tx),
		location?.destinationId ? findDestinationById(location.destinationId, tx) : undefined
	]);

	const currency = found.currency;
	const money = (amountMinor: number): Money => ({ amountMinor, currency });
	const libraryById = new Map(library.map((a) => [a.id, a]));

	const property: PropertyView = {
		slug: found.slug,
		name: found.name,
		type: found.type,
		tagline: found.tagline,
		shortDescription: found.shortDescription,
		currency
	};

	// --- Media ---
	const heroFrame = frames(placed.filter((a) => a.role === 'hero'))[0] ?? null;
	const galleryFrames = frames(placed.filter((a) => a.role === 'gallery'));
	const heroImage = heroFrame ?? galleryFrames[0] ?? null;

	// --- Rooms and prices ---
	const roomViews: RoomView[] = rooms.map((r) => ({
		name: r.name,
		description: r.description,
		maxGuests: r.maxGuests,
		beds: r.beds.map((b) => ({ type: b.type, count: b.count })),
		nightly: money(r.nightlyRateMinor),
		image: frames(roomMedia.filter((m) => m.roomId === r.id))[0] ?? null,
		amenities: roomAmenities
			.filter((a) => a.roomId === r.id)
			.map((a) => ({ name: a.name, icon: a.icon }))
	}));
	const rates = rooms.map((r) => r.nightlyRateMinor);
	const lowest = rates.length ? Math.min(...rates) : null;
	const highest = rates.length ? Math.max(...rates) : null;
	const fromPrice = lowest === null ? null : money(lowest);
	const maxGuests = rooms.length ? Math.max(...rooms.map((r) => r.maxGuests)) : null;
	const priceRange =
		lowest === null || highest === null
			? null
			: lowest === highest
				? formatMoney(money(lowest))
				: `${formatMoney(money(lowest))} - ${formatMoney(money(highest))}`;

	// --- Reviews (published only; imported ones keep their label) ---
	const reviews: ReviewsView | null =
		ratingSummary.count === 0
			? null
			: {
					items: reviewPage.items.map((r) => ({
						rating: r.rating,
						title: r.title,
						body: r.body,
						authorName: r.authorName,
						stayedOn: r.stayedOn,
						source: r.source,
						origin: r.origin,
						hostReply: r.hostReply
					})),
					summary: {
						count: ratingSummary.count,
						average: ratingSummary.average,
						guestCount: ratingSummary.guestCount,
						importedCount: ratingSummary.importedCount
					}
				};

	// --- Location (public projection only) ---
	const place: LocationData['place'] = location
		? {
				// The one "locality, region" label, reused by the hero and the location section.
				label: [location.locality, location.region].filter(Boolean).join(', '),
				locality: location.locality,
				region: location.region,
				countryCode: location.countryCode,
				latitude: location.latitude,
				longitude: location.longitude,
				exact: location.showExactLocation,
				addressLines: location.showExactLocation
					? [location.addressLine1, location.addressLine2, location.postalCode].filter(
							(l): l is string => Boolean(l)
						)
					: []
			}
		: null;
	// Decision 8: exact attraction pins plus precise distances would triangulate a hidden house, so
	// for a non-exact property distances are rounded to 500 m with a 1 km floor.
	const exactPlace = location?.showExactLocation ?? false;
	const publicDistance = (m: number | null) =>
		m === null || exactPlace ? m : Math.max(1000, Math.round(m / 500) * 500);
	const attractionViews: AttractionView[] = attractions.map((a) => {
		const image = a.mediaAssetId ? libraryById.get(a.mediaAssetId) : undefined;
		return {
			name: a.name,
			category: a.category,
			hostNote: a.hostNote,
			travel:
				a.travelMinutes !== null && a.travelMode !== null
					? { minutes: a.travelMinutes, mode: a.travelMode }
					: null,
			distanceMeters: publicDistance(a.distanceMeters),
			url: a.url,
			latitude: a.latitude,
			longitude: a.longitude,
			image: image ? frame(image) : null
		};
	});

	// --- Host and story ---
	const storyHtml = renderMarkdown(found.storyBody);
	const hostAvatar = host?.avatarAssetId ? libraryById.get(host.avatarAssetId) : undefined;
	const bioHtml = renderMarkdown(host?.bio);
	const hostStory: HostStoryData = {
		story: storyHtml ? { heading: found.storyHeading, body: { html: storyHtml } } : null,
		host: host
			? {
					displayName: host.displayName,
					bio: bioHtml ? { html: bioHtml } : null,
					avatar: hostAvatar ? frame(hostAvatar) : null,
					hostingSince: host.hostingSince,
					languages: host.languages
				}
			: null
	};

	// --- Section data, or null when the section is empty and should be dropped ---
	const longDescription = paragraphs(found.description);
	const builders: {
		[K in SectionView['type']]: () => Extract<SectionView, { type: K }>['data'] | null;
	} = {
		hero: (): HeroData => ({
			name: found.name,
			tagline: found.tagline,
			locationLabel: place?.label ?? null,
			image: heroImage,
			bookingAnchor: microsite.sections.some((s) => s.type === 'booking_cta') ? '#booking' : null
		}),
		overview: (): OverviewData | null =>
			!found.shortDescription && longDescription.length === 0
				? null
				: {
						type: found.type,
						shortDescription: found.shortDescription,
						paragraphs: longDescription,
						roomCount: rooms.length,
						maxGuests,
						fromPrice,
						reviews
					},
		gallery: () => (galleryFrames.length === 0 ? null : { frames: galleryFrames }),
		rooms: () => (roomViews.length === 0 ? null : { rooms: roomViews }),
		amenities: (): AmenitiesData | null => {
			if (propertyAmenities.length === 0) return null;
			const groups = new Map<string, AmenitiesData['groups'][number]>();
			for (const a of propertyAmenities) {
				const group = groups.get(a.category) ?? {
					category: a.category,
					label: AMENITY_CATEGORY_LABELS[a.category] ?? a.category,
					items: []
				};
				group.items.push({ key: a.key, name: a.name, icon: a.icon, note: a.note });
				groups.set(a.category, group);
			}
			return { groups: [...groups.values()] };
		},
		host_story: () => (!hostStory.story && !hostStory.host ? null : hostStory),
		location: (): LocationData | null =>
			!place && attractionViews.length === 0
				? null
				: {
						place,
						destination: destination
							? { name: destination.name, summary: destination.summary }
							: null,
						attractions: attractionViews
					},
		booking_cta: (): BookingCtaData => ({ name: found.name, fromPrice, maxGuests })
	};

	const sections: SectionView[] = [];
	for (const s of microsite.sections) {
		// `builders[s.type]` is correlated with `s.type`; TypeScript cannot see that through the union.
		const data = (builders[s.type] as () => unknown)();
		if (data !== null) sections.push({ type: s.type, variant: s.variant, data } as SectionView);
	}

	const seo: SeoView = {
		title: found.tagline ? `${found.name} · ${found.tagline}` : found.name,
		description: found.shortDescription,
		canonicalPath: `/s/${found.slug}`,
		image: heroImage ? { src: heroImage.src, alt: heroImage.alt } : null,
		priceRange,
		address: place
			? { locality: place.locality, region: place.region, countryCode: place.countryCode }
			: null
	};

	return {
		kind: 'ok',
		view: {
			property,
			theme: {
				templateKey: microsite.template.key,
				accentKey: microsite.accent.key,
				fontKey: microsite.font.key,
				accent: { light: microsite.accent.light, dark: microsite.accent.dark },
				font: { display: microsite.font.display, body: microsite.font.body }
			},
			sections,
			seo
		}
	};
}
