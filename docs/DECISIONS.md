# Product decisions

Decisions the product owner has made. Briefs build on these; change one only by recording a new
decision here.

| #   | Topic               | Decision                                                                                                                                                                                                                                    | Date       | Linear |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| 1   | Slug renames        | Old slugs keep working. Renaming writes the old slug to a redirect table (`property_slug_redirect`, later one per public entity). The route layer answers it with a 301 to the current slug. Slug lookups themselves stay a plain equality. | 2026-11-10 | UST-43 |
| 2   | Currency            | One currency per property (ISO-4217, stored on the property). Every price on that property is integer minor units in that currency. Travellers see the property's currency, with no FX conversion for now.                                  | 2026-11-10 | UST-44 |
| 3   | Booking             | Booking **requests only**: the guest sends a request, the owner accepts or declines. No online payment yet.                                                                                                                                 | 2026-11-10 | —      |
| 4   | Guest accounts      | Guests can request with just an email. Optional guest accounts are allowed (e.g. to see request history), but never required to book.                                                                                                       | 2026-11-10 | —      |
| 5   | Microsite addresses | Start with paths (`/s/<slug>`). Subdomains later; custom domains only on owner demand.                                                                                                                                                      | 2026-11-10 | —      |
| 6   | Theme customisation | Owners pick a template, plus an accent colour and font pairing from a curated set. No free-form colours.                                                                                                                                    | 2026-11-10 | —      |
| 7   | Search              | Postgres-native search (filters + full-text) first. Add a dedicated search service only if it gets too slow.                                                                                                                                | 2026-11-10 | —      |
| 8   | Location privacy    | Many homestays are the host's own home. Public pages show the locality and an approximate area only; the exact address and pin show only when the owner opts in (`property_location.show_exact_location`, default off). No revisit planned. | 2026-11-12 | UST-16 |

## Money rules (from decision 2)

- Arithmetic happens in integer minor units only. A stay total is `nightly_rate_minor × nights`,
  which is exact, so it needs no rounding.
- Any future percentage (discounts, fees) rounds **half-up to the nearest minor unit, once, at
  the line-item level**, and the total is the sum of the rounded lines.
- Display formatting uses `Intl.NumberFormat` with the property's currency. The minor-unit
  exponent comes from `Intl`, never a hard-coded `/ 100`.
