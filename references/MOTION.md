# Motion References

Feeds the "**scroll animations set the feel**" goal. Motion is a first-class brand
element for Ustay, not decoration — these define the _character_ of the movement.

---

## 1. Jomor Design — https://www.jomor.design/ (Jonathan Morin, Webflow)

The key motion reference — user: _"I really like the scroll animation for this website."_

**What it does (the feel to reproduce):**

- **Layered parallax** — foreground and background move at different speeds, creating depth
  that feels immersive but calm.
- **Big display type meets / blends with imagery** that changes as you scroll; text reveals
  on scroll rather than just sitting still.
- **Tonal transitions on scroll** — the background shifts light → dark → full-bleed photo as
  you move down. ⭐ _This literally resolves our dark-vs-light fork:_ the page doesn't pick one,
  it **moves between them as a motion device.**
- **Smooth momentum scrolling** — weighted, eased. This "calm heaviness" is the real signature,
  more than any single effect.
- **Subtle and polished** — layered but never overwhelming. Restraint.

**Character:** slow, eased, weighted, immersive, quiet — the motion encodes the _same_ unhurried
luxury as the serif type and cinematic photography. This is exactly the right feel for Ustay.

**Likely tech (for our build):** smooth-scroll (**Lenis**) + **GSAP ScrollTrigger** for
parallax / pinned tonal transitions / reveal-on-enter. Prefer native CSS scroll-driven
animations where they suffice. Always respect `prefers-reduced-motion`.

---

## 2. 21st.dev components (React/shadcn — reimplement the _effect_ in Svelte)

Same motion family as Jomor — parallax + scroll-reveal + scale-on-scroll. Confirm the direction,
don't add a new one. ⚠️ These are React/shadcn (`npx shadcn add`); our stack is SvelteKit, so we
port the behaviour, not the component.

- **animated-scroll** (minhxthanh) — `https://21st.dev/r/minhxthanh/animated-scroll` —
  scroll-triggered reveal/animation on elements as they enter.
- **zoom-parallax** (sshahaider) — `https://21st.dev/r/sshahaider/zoom-parallax` —
  images **scale/zoom as you scroll** (a hero or image grid growing to fill). Pairs perfectly
  with the cinematic photography → use for a hero image that scales, or a gallery that zooms open.

## Motion principles for Ustay (derived from the above)

1. **The easing IS the brand.** Calm, weighted, eased — never snappy or bouncy.
2. **Big orchestrated moments over scattered effects** — hero load sequence, one tonal
   transition — rather than everything animating a little.
3. **Parallax depth** on the cinematic photography.
4. **Tonal light ⟷ dark shifts on scroll** as a signature move (answers the dark/light fork).
5. **Reduced-motion:** everything degrades gracefully to clean fades or none.
