/**
 * The section registry (UST-22): maps every section `type` to the component that renders it.
 * The mapped type is exhaustive over `SectionType`, so adding a type to the registry's
 * `SECTION_TYPES` without a component here fails `bun run check`.
 *
 * Every component takes `SectionProps<T>`: `{ data, variant }` for its own type.
 */
import type { Component } from 'svelte';
import type { SectionType } from './registry';
import type { SectionProps } from './types';
import AmenitiesSection from './sections/AmenitiesSection.svelte';
import BookingCtaSection from './sections/BookingCtaSection.svelte';
import GallerySection from './sections/GallerySection.svelte';
import HeroSection from './sections/HeroSection.svelte';
import HostStorySection from './sections/HostStorySection.svelte';
import LocationSection from './sections/LocationSection.svelte';
import OverviewSection from './sections/OverviewSection.svelte';
import RoomsSection from './sections/RoomsSection.svelte';

export const sectionComponents: { [T in SectionType]: Component<SectionProps<T>> } = {
	hero: HeroSection,
	overview: OverviewSection,
	gallery: GallerySection,
	rooms: RoomsSection,
	amenities: AmenitiesSection,
	host_story: HostStorySection,
	location: LocationSection,
	booking_cta: BookingCtaSection
};
