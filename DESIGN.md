# Design notes — Try Shiftwave finder

Calm locator, not a dashboard. People arrive with one question — *where can I try this near me?* — so the interaction follows Google / Apple Maps: one search field, progressive disclosure, results that feel inevitable.

## Two-system rule

**Find Near You** (this app) matches [shiftwave.co](https://shiftwave.co/) plus Brand Guide 2025 so it can merge into the marketing site. Montserrat, site neutrals, peach washes, black primary buttons; orange / purple used **sparingly** as Energy / Calm accents.

**Stethoscope / Wave listening-surface** is a different system: Fraunces + Source Sans 3, growth-board aqua→violet. That stack is **not** used here and must not be mixed into this finder.

Do not invent a second display serif. Do not use logo orange `#E43A00` or purple `#3911AC` as full-page chrome or dark marketing surfaces unless matching a dark section of shiftwave.co.

## Type (shiftwave.co)

One family everywhere: **`Montserrat, sans-serif`** (Google Fonts 500 / 600 / 700 + italics for the prototype; the live site hosts the same faces on Shopify).

| Role | Weight | Line-height | Letter-spacing |
| --- | --- | --- | --- |
| Headings | **600** | **1.3** | **0** |
| Body / UI / buttons / nav | **500** | inherited | **-0.005em** |

Prefer 500 / 600. Use 700 only for strong emphasis. Fraunces and Source Sans 3 are gone.

CSS: `src/index.css` (`--font-display` and `--font-body` both Montserrat). Loaded from Google Fonts in `index.html`.

## Color (shiftwave.co theme vars + Brand Guide accents)

Tokens live in `src/index.css` (`@theme`) and `src/theme/tokens.ts`. Hex values must match.

**Ink `#3C3B3B`** (`rgb(60, 59, 59)`). Site body text. Soft `#5C5B5B` and faint `#8A8888` are the same hue, stepped for hierarchy. Body and titles meet WCAG AA on paper / white.

**Background white `#FFFFFF`.** Page ground may also use the site’s soft warm gray `rgb(247, 245, 242)` ≈ **`#F7F5F2`** (paper). Deeper paper `#EFECE7` and hairline `#E8E4DE` keep surfaces open without drop-shadow stacks.

**Peach highlight `#FFDDBF`** (`rgb(255, 221, 191)`) and warmer **`#E0A580`** (`rgb(224, 165, 128)`). Site-native washes for the hero and search aura — not full-page fills.

**Primary CTA black / near-black `#111111` on white.** Matches shiftwave.co primary buttons. Finder **Search** and pressed radius chips use this.

**Keyboard focus `#0B61CD`** (`rgb(11, 97, 205)`). Focus rings and search-pill focus halo only.

**Brand Guide 2025 accents (sparingly):** Energy orange `#E43A00` and Calm purple `#3911AC`. Use for highlights and pins — not as full dark chrome or full-page orange/purple surfaces. Growth-board aqua / violet / coral stay subordinate (this finder does not use them as primary chrome; site peach covers washes).

**Positive green `#0F8A3C` / `#E4F5EA`.** Reserved for a true success / “open now” state. Do not invent hours to use it.

## Map pin accent

**Energy orange `#E43A00`** for default pins. It pops on the light paper basemap and is a Brand Guide accent, not a full-page wash. **Selected pin is Calm purple `#3911AC`.** Origin is a black/near-black dot (same language as Search) with a peach pulse. Nearest is an Energy mark. These accents must not fight Montserrat + site neutrals: no aqua→violet hero, no orange/purple page fills.

## Gradients

Website merge wins over the earlier growth-board aqua→violet hero. Hero and search aura are white / warm paper with peach highlight washes only. No rainbow chrome on cards, pins, or the map.

## UX pattern (Google “find near me”)

1. Landing is one field: huge centered search, generous empty space, soft peach wash on paper, no map until search or geolocation.
2. Familiar controls: single pill, black Search CTA, quiet “Use my location,” name left / distance right.
3. After search: compact sticky search header + list + map. Selected row uses a Calm tint; selected pin is purple; default pins are Energy orange.
4. Soft 24px cards, hairline borders, restrained motion (`prefers-reduced-motion` honored).
