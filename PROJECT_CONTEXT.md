# Ustay — Product Context

> This document is the source of truth for **why Ustay exists** and **how it should feel** — the
> product vision, business goals, constraints, and design philosophy. It is written for both the
> team and for AI coding assistants working in this repo. Keep the `README.md` focused on developer
> setup (installation, scripts, environment); keep product intent here.

## Vision

Ustay is a modern property discovery, branding, and booking platform built specifically for
independent homestays, resorts, boutique hotels, and vacation rental owners. Its primary mission is
to help small accommodation businesses establish a strong digital presence without requiring them to
build and maintain their own websites.

Traditional booking platforms such as Airbnb, Booking.com, and Agoda focus on helping travelers
compare thousands of listings. While effective for discovery, they standardize every property into
nearly identical listing pages, making it difficult for smaller businesses to communicate their
unique identity, story, and experience.

Ustay approaches the problem differently.

Instead of simply listing properties, Ustay transforms every property into its own **branded
microsite**, allowing homeowners to present their accommodation as if it had its own professionally
designed website — while still benefiting from the reach and convenience of a centralized booking
platform.

The platform aims to bridge the gap between a generic OTA and a custom-built property website.

---

## Problem Statement

Independent property owners face several challenges:

- Building a professional website is expensive and time-consuming.
- Most rely heavily on OTAs for bookings.
- OTAs provide very little branding or customization.
- Properties often become just another listing among hundreds of competitors.
- Hosts struggle to communicate their personality, local knowledge, and unique experiences.

Travelers face a different problem. Although there are countless accommodation options online,
finding authentic stays often requires browsing through many similar-looking listings with limited
personality. Many travelers want **experiences** rather than simply rooms.

Ustay exists to solve both problems simultaneously.

---

## Solution

Ustay provides a centralized platform where travelers can discover properties while allowing every
homeowner to own a personalized digital space.

Each property receives its own microsite that showcases:

- Beautiful imagery
- Property information
- Room details
- Amenities
- Local attractions
- Host story
- Personalized recommendations
- Booking functionality

Unlike traditional booking websites where every property page looks nearly identical, Ustay allows
homeowners to express the identity of their property while maintaining a consistent design language
across the platform. This creates a platform that feels cohesive while still allowing every property
to have its own personality.

---

## Core Philosophy

### 1. Authenticity

Travelers should feel like they are discovering real places operated by real people. The platform
encourages hosts to tell stories rather than simply advertise rooms. Instead of selling
accommodation, hosts are selling **experiences**:

- history of the property
- family traditions
- nearby attractions
- local recommendations
- cultural experiences
- hidden gems

### 2. Simplicity

The platform should be extremely easy for homeowners to use. Property owners should never feel like
they are designing a website — they simply provide content, and the platform automatically
transforms it into beautiful pages. Every design decision should prioritize simplicity over
unlimited customization.

### 3. Consistency

Although every property should feel unique, every microsite should still feel like it belongs within
the Ustay ecosystem. Therefore:

- typography is standardized
- spacing is standardized
- UI components are standardized
- animations are standardized
- navigation remains consistent

Customization is achieved through **content, layout templates, imagery, and storytelling** rather
than unrestricted design changes.

---

## Target Users

### Travelers

Travelers visit Ustay to:

- discover destinations
- browse authentic stays
- compare properties
- read host stories
- learn about local experiences
- submit booking requests
- communicate with homeowners

The traveler experience should feel **inspirational rather than transactional**.

### Homeowners

Homeowners use Ustay to:

- manage property information
- upload photos and videos
- update rooms
- manage amenities
- respond to booking inquiries
- manage availability
- customize their property's presentation
- monitor analytics

The owner dashboard should prioritize **productivity and ease of use**.

---

## Product Differentiation

The biggest differentiator is not booking — it is **branding**.

Ustay helps homeowners build an online identity. Instead of becoming another listing on an OTA, each
property becomes a destination with its own personality. This branding extends beyond visuals to
include:

- storytelling
- local recommendations
- custom layouts
- featured experiences
- promotions
- personalized content

---

## Microsite System

The microsite is the heart of the platform. Each property has a dedicated page composed of reusable
sections. Possible sections include:

- Hero Banner
- Property Overview
- About the Host
- Property Story
- Rooms
- Amenities
- Photo Gallery
- Experiences
- Local Attractions
- Restaurant Recommendations
- Map
- Reviews
- FAQ
- Contact
- Booking

Homeowners do **not** freely design pages. Instead they select from professionally designed
templates. The platform guarantees quality while allowing meaningful personalization.

---

## Owner Dashboard

The dashboard acts as a lightweight CMS specifically designed for accommodation businesses. Instead
of overwhelming owners with technical options, it focuses on business tasks:

- Property Management
- Booking Management
- Availability Calendar
- Inquiry Management
- Media Library
- Content Editor
- Microsite Template Selection
- Theme Selection
- Promotions
- Analytics
- Reviews
- Messages
- Settings

The dashboard should feel approachable for non-technical users.

---

## Long-Term Vision

Over time, Ustay should evolve from a booking platform into a complete **operating system for
independent accommodation businesses**. Potential future capabilities include:

- AI-assisted content generation
- AI-generated property descriptions
- Smart traveler recommendations
- Calendar synchronization with OTAs
- Channel management
- Dynamic pricing
- Review management
- Marketing campaigns
- Email automation
- Loyalty programs
- Business analytics
- Revenue insights
- Occupancy forecasting

---

## Technical Philosophy

The project is also intended to serve as a **portfolio-quality full-stack software engineering
project**. Development should prioritize:

- Clean architecture
- Type-safe development using TypeScript
- Modular, reusable component design
- Scalable backend design
- Reusable UI systems
- Secure authentication
- Well-structured API design
- Efficient, well-modeled database schemas
- Maintainable codebase
- Modern development practices

Every feature should be designed with scalability in mind, even if the initial implementation is
simplified for the MVP.

### Current Stack

The vision above is stack-agnostic, but the repository is currently scaffolded with:

- **Framework:** SvelteKit (Svelte 5, runes mode) — full-stack, server + client
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Database:** PostgreSQL via Drizzle ORM
- **Auth:** better-auth
- **Component workshop:** Storybook
- **Testing:** Vitest (+ Playwright browser tests)
- **Deployment target:** Cloudflare Pages (`@sveltejs/adapter-cloudflare`)
- **Package manager:** bun

> **Note on the original PRD:** the source document listed "modular React components" and "efficient
> MongoDB schemas." The scaffold intentionally uses **SvelteKit** and **PostgreSQL/Drizzle** instead.
> The product principles (modular components, type safety, efficient schemas, clean architecture)
> carry over unchanged — only the specific technologies differ. Update this section if the stack
> direction changes.
