# Design notes — Try Shiftwave finder

Calm locator, not a dashboard. People arrive with one question — *where can I try this near me?* — so the interaction follows Google / Apple Maps: one search field, progressive disclosure, results that feel inevitable.

## Two-system rule

**Find Near You = [shiftwave.co](https://shiftwave.co/) / Brand Guide 2025.**  
**Fraunces stack is Stethoscope / Wave only.**

| System | Where it lives | Type | Color |
| --- | --- | --- | --- |
| **Find Near You** (this app) | merge into shiftwave.co | **Montserrat only** (500 body / UI / buttons, 600 headings) | Site neutrals + Brand Guide Energy/Calm **accents** |
| **Stethoscope / Wave listening-surface** | not this app | Fraunces + Source Sans 3 | Paper/cream, sky→sage, rise-deep Search |

Do **not** mix the stacks. Do not restore Fraunces or Source Sans 3 here. Do not invent a second display serif.

## Type (shiftwave.co)

One family everywhere: **`Montserrat, sans-serif`**. Google Fonts 500 / 600 / 700 + italics (the live site also loads Google Fonts Montserrat and Shopify-hosted woff2 of the same weights). Press kit: [shiftwave.co/pages/press](https://shiftwave.co/pages/press).

| Role | Weight | Line-height | Letter-spacing |
| --- | --- | --- | --- |
| Headings | **600** | **1.3** | **0** |
| Body / UI / buttons / nav | **500** | ~24–25px at 15–17px (~1.5) | **-0.005em** |

Prefer 500 / 600. Use 700 only for strong emphasis. Body is **16px / line-height 1.5** (24px), matching the site’s ~15–17px / ~24–25px body. Headings **600 / 1.3 / tracking 0**. Buttons and nav **500**.

## Color

Tokens live in `src/index.css` (`@theme`) and `src/theme/tokens.ts`. Hex values must match.

### Site neutrals (surfaces and type)

- **Ink `#3C3B3B`** — site body text. Soft `#5C5B5B`, faint `#8A8888`.
- **White `#FFFFFF`**, paper `#F7F5F2` / `#F7F4EF`, fog `#FAFAFA`, charcoal `#282828`, hairline `#E8E4DE`.
- **Peach washes `#FFDDBF` / `#E0A580`** — site-native hero / search aura, not full-page fills.
- **Primary Search CTA black `#111111` on white** — matches shiftwave.co primary buttons (merge), not a growth-board fill.
- **Keyboard focus `#0B61CD`**.

### Brand Guide 2025 accents (sparingly)

Allowed as **accents only**: Energy orange **`#E43A00`** and Calm purple **`#3911AC`**. Use for CTAs/highlights/pins **sparingly** — not as full dark chrome or full-page purple/orange surfaces unless matching a dark section of shiftwave.co.

| Use | Token | Notes |
| --- | --- | --- |
| Default map pins, wave mark, link hover | Energy `#E43A00` | One loud mark on a light map |
| Selected pin / selected list row | Calm `#3911AC` | Tint wash + inset, not a purple page |
| Search button | Black `#111111` | Site primary; do not turn this into a full orange slab |
| Tiny category dots | Energy / Calm / indigo `#4A4AF4` | Supporting UI only |

Supporting site indigo `#4A4AF4` / `#A8A9FC` / `#2F2FC1` is OK on tiny UI (category dots), not chrome.

### Subordinate only

Growth-board **aqua `#0FA3A8` / violet `#6F5FE8` / coral `#E5563D`** are OK **only** as subordinate map/search accents **under** Brand Guide orange/purple + site neutrals. They are not product chrome and must not return as hero washes or the Search fill. This finder uses site peach for washes instead.

**Positive green `#0F8A3C`** is reserved for a true success / “open now” state. Do not invent hours to use it.

## Map pins

Default pins are Energy `#E43A00` so they pop on the light paper basemap without fighting Montserrat or site neutrals. Selected pin is Calm `#3911AC`. Origin is a black/near-black dot (same language as Search) with a peach pulse.

## Chrome (live shiftwave.co scrape)

Cinematic, minimal. Generous air. Do not densify.

| Measure | Site | This finder |
| --- | --- | --- |
| Max content | ~1100px | `max-w-[1100px]` |
| Content panels | ~18px radius | `--radius-card: 18px` |
| Marketing buttons | ~6px radius, ~15×20 padding, weight 500 | `--radius-button: 6px` on secondary actions (New search). **Search stays a Google-like pill** — site 6px is not cloned onto the locator field. |
| Surfaces | `#FFFFFF` / `#FAFAFA` / `#F7F4EF` | paper, fog, paper-deep |
| Near-black | `#282828` charcoal | Search hover + secondary button type |

Press kit: [shiftwave.co/pages/press](https://shiftwave.co/pages/press) — no separate public type PDF. `prefers-reduced-motion` honored.

## UX pattern (Google “find near me”)

1. Landing is one field: huge centered search, peach wash on paper, no map until search or geolocation.
2. Familiar controls: single pill, black Search CTA, quiet “Use my location,” name left / distance right.
3. After search: compact sticky search header + list + map.
4. Live qualified partner list only — search logic and location JSON are not a design surface.
