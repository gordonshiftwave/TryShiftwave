# Design notes — Try Shiftwave finder

Calm locator, not a dashboard. People arrive with one question — *where can I try this near me?* — so the interaction follows Google / Apple Maps: one search field, progressive disclosure, results that feel inevitable.

## Two-system rule

**Find Near You** (this app) **= [shiftwave.co](https://shiftwave.co/) + Brand Guide 2025.** It must type-match the live marketing site so it can merge there. Montserrat only. Site neutrals. Black primary buttons. Brand orange / purple used **sparingly** as Energy / Calm accents.

**Stethoscope / Wave listening-surface** is a different system: Fraunces + Source Sans 3, paper/cream, sky→sage, rise-deep Search. That stack is **not** used here and must not be mixed into this finder.

Do not invent a second display serif. Do not restore Fraunces or Source Sans 3. Do not use `#E43A00` or `#3911AC` as full-page chrome or dark marketing surfaces unless matching a dark section of shiftwave.co.

## Type (shiftwave.co)

One family everywhere: **`Montserrat, sans-serif`**. Google Fonts 500 / 600 / 700 + italics (the live site also loads Google Fonts Montserrat and Shopify-hosted woff2 of the same weights).

| Role | Weight | Line-height | Letter-spacing |
| --- | --- | --- | --- |
| Headings | **600** | **1.3** | **0** |
| Body / UI / buttons / nav | **500** | ~24–25px at 15–17px (~1.5) | **-0.005em** |

Prefer 500 / 600. Use 700 only for strong emphasis. Body is **16px / line-height 1.5**. Press kit: [shiftwave.co/pages/press](https://shiftwave.co/pages/press).

## Color

Tokens live in `src/index.css` (`@theme`) and `src/theme/tokens.ts`. Hex values must match.

**Ink `#3C3B3B`.** Site body text. Soft `#5C5B5B` and faint `#8A8888` for hierarchy.

**Paper / white.** White `#FFFFFF`, warm gray `#F7F5F2`, `#F7F4EF`, fog `#FAFAFA`, charcoal `#282828`, hairline `#E8E4DE`.

**Peach washes `#FFDDBF` / `#E0A580`.** Site-native hero / search aura — not full-page fills.

**Primary CTA black `#111111` on white.** Matches shiftwave.co buttons. Finder **Search** and pressed radius chips use this.

**Keyboard focus `#0B61CD`.**

**Brand Guide accents (sparingly):** Energy orange `#E43A00` (pins, nearest, wave mark) and Calm purple `#3911AC` (selected pin / row). Supporting indigo `#4A4AF4` / `#A8A9FC` / `#2F2FC1` OK for tiny UI (category dots). Not full-page orange/purple chrome. Growth-board aqua / violet / coral stay subordinate.

## Map pins

Default pins are Energy `#E43A00` so they pop on a light paper map without fighting Montserrat or site neutrals. Selected pin is Calm `#3911AC`. Origin is a black/near-black dot (same language as Search) with a peach pulse.

## Chrome

Content max ~1100px. Panels ~18px radius. Search stays a Google-like pill (site marketing buttons are ~6px and are not cloned onto the locator). Spacious section padding. `prefers-reduced-motion` honored.

## UX pattern (Google “find near me”)

1. Landing is one field: huge centered search, peach wash on paper, no map until search or geolocation.
2. Familiar controls: single pill, black Search CTA, quiet “Use my location,” name left / distance right.
3. After search: compact sticky search header + list + map.
4. Live qualified partner list only — search logic and location JSON are not a design surface.
