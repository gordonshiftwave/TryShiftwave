# Design notes — Try Shiftwave finder

Listening surface (Stethoscope / Wave), not Shiftwave marketing chrome. Mood: a calm performance dashboard — intentional color, generous air, one job at a time.

## Why these colors

Warm neutrals and cool greens are not decoration. They encode arousal and action:

| Token | Hex | Why |
| --- | --- | --- |
| Paper / cream | `#f4efe6` / `#fbf8f2` | Warm, low-arousal grounds. Calmer than pure white (less glare, less visual stress). Fits a nervous-system brand. |
| Sand / line | `#efe7d9` / `#ddd4c6` | Hairline structure without grey chrome. |
| Ink (not black) | `#1f1c18` | Readable hierarchy without the harshness of `#000` on white. Soft/faint inks (`#5a534b`, `#675f57`) recede. |
| Sky → sage | `#b7d3e3` → `#9fbe99` | Cool-to-green restfulness. Approachable “near you” signal (water + vegetation) without neon. Washes behind search and on the map. |
| Rise-deep | `#3d6d62` | **One** primary action (Search). High contrast on cream; “go” without generic blue. |
| Focus | `#3e6574` | Search focus ring and origin mark. Locative, science-adjacent teal — Google-familiar, warmer. |
| Soft coral | `#e4a894` | Sparse human warmth (gym pins, tiny marks). Warm hues raise arousal — never a surface or a competing CTA. |
| Mist / slate / lavender | `#c8d8d2` / `#7a8496` / `#b8a7c8` | Supporting map/category notes only. |
| Fall-deep | `#5c5370` | Status/errors. Muted, not alarm-red, not marketing purple. |

Do **not** use black dashboards, orange `#E43A00`, purple `#3911AC`, Montserrat/Inter-only, dense chrome, harsh shadows, or white-on-black SHIFTWAVE hero.

## UX pattern (Google “find near me”)

1. Landing is one field: huge centered search, minimal chrome, no map until search or geolocation.
2. Familiar controls: single field, primary Search, secondary “Use my location,” distance on the right of rows.
3. After search: compact sticky search header + list + map. Progressive disclosure.
4. One accent for the CTA (rise-deep). Sky/sage for map and proximity. Coral only as marks.
5. Soft 24px cards, hairline borders, restrained motion (`prefers-reduced-motion` honored).

Type: **Fraunces** for display, **Source Sans 3** for body. Tokens live in `src/index.css`.
