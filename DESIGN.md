# Ustay — Art Direction

> The visual + motion brief every Ustay screen inherits. Distilled from the reference picks in
> `references/SHORTLIST.md` + `references/MOTION.md` and validated by the prototype at
> `src/routes/prototype/`. **Living document** — revise it whenever the direction sharpens; it is a
> documented default to build from and improve, not a freeze.

## In one line

**Editorial serif luxury for independent stays** — cinematic full-bleed photography, an oversized
serif that behaves like magazine cover type, and a **dark cinematic hero that tonally opens into
light editorial sections as you scroll**, all carried by slow, weighted motion. The opposite of a
bland OTA listing.

## Feels like

Unhurried · literary · cinematic · crafted · serene · quietly premium.

**Anti-references (never this):** a busy OTA listing grid · corporate/SaaS flatness · startup hero
gradients · snappy/bouncy motion · the cream + generic-serif + terracotta "boutique travel" default ·
clutter competing with the photograph.

## Palette

| Token | Hex | Role |
| --- | --- | --- |
| `ink` | `#0B0F0E` | near-black canvas (dark hero, footer), primary text on light |
| `paper` | `#F4EFE6` | warm cream canvas for editorial sections |
| `accent` | `#5C6B52` | muted forest/olive — labels, small accents, one word at a time |
| `muted` | `#686C65` | secondary text on light |
| `prose` | `#4A4D46` | body copy on light |
| `on-dark` | `#FFFFFF` | text/UI over photography |
| `hairline` | `rgba(11,15,14,.12)` | thin rules, dividers |
| `accent-on-dark` | `#77876D` | `accent` lifted for the dark tone (5.0:1 on ink) |
| `muted-on-dark` | `#9A9D97` | `muted` lifted for the dark tone (7.0:1 on ink) |
| `prose-on-dark` | `#CFD2CB` | body copy on the dark tone |

Colour is used sparingly. The **photography is the colour**; UI stays neutral so stays feel distinct.

Contrast is part of the palette, not a later fix. The light-tone neutrals clear WCAG AA on `paper`
— `muted` was nudged from `#6B6F68` (4.47:1, a hair short) to `#686C65` (4.68:1) in UST-7. Those
same values fail badly on `ink` (`accent` is only 3.4:1 there), so the dark tone gets its own
lifted set rather than reusing them. `<Section tone="inverse">` scopes which set is live, so no
component ever picks a colour per tone.

## Type

- **Display — Fraunces** (variable; optical sizing on). High-contrast, warm, editorial; its italic
  gives the calligraphic swash feel from The Asteren for the `Ustay` wordmark and accent words.
  Weight 320–380 at large sizes; tight tracking (`-0.02em`); line-height ~0.92–1.05.
- **Body — Inter.** Neutral, highly readable. 400/500.
- **Utility/labels — Inter**, uppercase, letter-spaced (`0.16–0.22em`), small. Used for eyebrows and
  the numbered section labels. (A monospace for section numbers/coordinates is an option to explore.)

Max 2–3 families. Let the type treatment itself be memorable (scale + edge-bleed), not neutral.

## Layout principles

1. **The photograph leads.** Full-bleed, cinematic, lands before anything else; fills the viewport.
2. **Oversized serif over/across imagery** — big enough to bleed off the edges (à la The Asteren).
3. **A numbered, named editorial spine** — `01 — The idea`, `02 — Stays` … structure as signature.
4. **Minimal fixed nav + a single pill `Reserve`.** Nav flips light→ink as the background shifts.
5. **Editorial mood and the booking product coexist** on one screen — the thing OTAs get wrong.
6. **Generous margins**; restraint everywhere except the one signature moment.

## Signature elements (spend boldness here, keep the rest quiet)

- **The dark→light tonal dissolve on scroll** — the page moves between moods rather than picking one.
- **Oversized, edge-bleeding serif** display type.
- **The numbered editorial section spine.**
- **Calligraphic `Ustay` wordmark** (Fraunces italic swash).

## Motion — "the easing is the brand"

See `references/MOTION.md`. Motion is a first-class brand element, not decoration.

- **Character:** slow, eased, weighted, unhurried. Never snappy or bouncy.
- **Smooth momentum scrolling** (Lenis) sets the overall feel more than any single effect.
- **Layered parallax** on photography; **scale-on-scroll / zoom-parallax** for image moments.
- **Big orchestrated moments** (hero load, the tonal transition) over scattered micro-animations.
- **Reduced-motion:** everything degrades gracefully — clean fades or static gallery, no broken states.
- Stack: `lenis` + `gsap` / `ScrollTrigger` (native CSS scroll-driven animations where they suffice).

## Platform vs. property

Ustay is a **quiet, refined frame**; each property's photography and story are the picture. Properties
personalise through content, imagery, and a small set of curated **theme presets** (accent + mood) —
never free-form design. Every microsite stays unmistakably Ustay.

## Reference shortlist — steal *this specific thing*

- **The Asteren** — numbered editorial sections; calligraphic serif; type that bleeds off the edges.
- **Lunara** — `[bracketed labels]`, the single green accent word, corner-bracket framing.
- **Villa Embrace** — dark editorial restraint; carousels with minimal circular controls.
- **Woodvelly** — the booking card living gracefully over the hero photo.
- **Jomor Design** (motion) — tonal light↔dark shift on scroll; weighted, buttery momentum.

## Never do

Cluttered listing grids · hero gradients · rounded corporate cards everywhere · snappy/bouncy easing ·
motion with no reduced-motion fallback · more than ~3 typefaces · stock-y corporate imagery ·
the cream/serif/terracotta template look.
