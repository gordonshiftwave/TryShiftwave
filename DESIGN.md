# Design notes — Try Shiftwave finder

Calm locator, not a dashboard. People arrive with one question — *where can I try this near me?* — so the interaction follows Google / Apple Maps: one search field, progressive disclosure, results that feel inevitable. Surfaces stay high-luminance. Fraunces (display) + Source Sans 3 (body) are the product faces; do not switch to Manrope. Shiftwave marketing orange `#E43A00` and purple `#3911AC` are not product chrome.

## Color science

Tokens live in `src/index.css` (`@theme`) and `src/theme/tokens.ts`. Hex values must match.

**Aqua `#0fa3a8` → violet `#6f5fe8`.** Cool spectrum associated with calm and focused attention (shorter wavelengths, lower arousal than warm reds). This is the *primary* accent: hero wash, focus rings, active radius chips, selected list row, selected map pin. Soft tints `#e3f5f5` / `#ebe8fb` are the same hues at high luminance — washes, not fills. Deep aqua `#0b7f8d` is the focus / search-button value (AA on white).

**Coral `#e5563d` → orange `#f39a5b`.** Warm hues capture attention first (preattentive pop against a cool field). Use for *one* highlight at a time: the nearest-result mark, the search-origin pin, and a hover glow on the primary CTA. Never as body text or large surfaces.

**Paper `#f6f5f2` / `#f3f2ee` / white.** High-luminance ground raises contrast for ink and keeps the board “open” (same warmth as Gordon’s growth board, without cloning its layout or Manrope). Hairline `#e4e2dc` instead of drop-shadow stacks.

**Ink `#171a21` / `#4a5060` / `#7a8090`.** Three-step type hierarchy. Body and titles meet WCAG AA on paper.

**Positive green `#0f8a3c` / `#e4f5ea`.** Reserved for a true success / “open now” state. Do not invent hours to use it.

## Gradients

Hero wash and selected/active accents only — aqua into violet, low opacity. No rainbow chrome on cards, pins, or the map.

## UX pattern (Google “find near me”)

1. Landing is one field: huge centered search, generous empty space, subtle aqua→violet wash, no map until search or geolocation.
2. Familiar controls: single pill, primary Search, quiet “Use my location,” name left / distance right.
3. After search: compact sticky search header + list + map. Selected row and pin share the aqua/violet accent.
4. Soft 24px cards, hairline borders, restrained motion (`prefers-reduced-motion` honored).
