import type { Component } from 'svelte';
import Accessibility from '@lucide/svelte/icons/accessibility';
import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
import Armchair from '@lucide/svelte/icons/armchair';
import Baby from '@lucide/svelte/icons/baby';
import Bath from '@lucide/svelte/icons/bath';
import Car from '@lucide/svelte/icons/car';
import Check from '@lucide/svelte/icons/check';
import Coffee from '@lucide/svelte/icons/coffee';
import ConciergeBell from '@lucide/svelte/icons/concierge-bell';
import CookingPot from '@lucide/svelte/icons/cooking-pot';
import Croissant from '@lucide/svelte/icons/croissant';
import Droplets from '@lucide/svelte/icons/droplets';
import Dumbbell from '@lucide/svelte/icons/dumbbell';
import Fence from '@lucide/svelte/icons/fence';
import Flame from '@lucide/svelte/icons/flame';
import Flower from '@lucide/svelte/icons/flower';
import HeartPulse from '@lucide/svelte/icons/heart-pulse';
import LampDesk from '@lucide/svelte/icons/lamp-desk';
import Leaf from '@lucide/svelte/icons/leaf';
import PlaneLanding from '@lucide/svelte/icons/plane-landing';
import SprayCan from '@lucide/svelte/icons/spray-can';
import Snowflake from '@lucide/svelte/icons/snowflake';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Waves from '@lucide/svelte/icons/waves';
import Wifi from '@lucide/svelte/icons/wifi';

type IconComponent = Component<{
	class?: string;
	strokeWidth?: number;
	'aria-hidden'?: boolean | 'true' | 'false';
}>;

/** Amenity `icon` key (equal to the catalogue key for the standard set) to a Lucide icon. */
export const AMENITY_ICONS: Record<string, IconComponent> = {
	wifi: Wifi,
	'air-conditioning': Snowflake,
	workspace: LampDesk,
	parking: Car,
	'hot-water': Droplets,
	toiletries: Sparkles,
	bathtub: Bath,
	kitchen: CookingPot,
	'coffee-maker': Coffee,
	breakfast: Croissant,
	pool: Waves,
	garden: Leaf,
	bbq: Flame,
	balcony: Fence,
	spa: Flower,
	gym: Dumbbell,
	'yoga-deck': HeartPulse,
	crib: Baby,
	'high-chair': Armchair,
	'step-free-access': Accessibility,
	lift: ArrowUpDown,
	'airport-transfer': PlaneLanding,
	'daily-housekeeping': SprayCan,
	concierge: ConciergeBell
};

/** Neutral icon for a key with no mapping (host-added catalogue entries). */
export const FALLBACK_ICON: IconComponent = Check;

export function amenityIcon(key: string): IconComponent {
	return Object.hasOwn(AMENITY_ICONS, key) ? AMENITY_ICONS[key] : FALLBACK_ICON;
}
