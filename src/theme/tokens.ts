/**
 * Canonical product colors. Keep in sync with `src/index.css` `@theme` and DESIGN.md.
 * Values match live shiftwave.co theme vars so this finder can merge into that site.
 * MapLibre paint and SVG pin fills cannot read CSS variables, so they import from here.
 */
export const tokens = {
  paper: '#F7F5F2',
  paperDeep: '#EFECE7',
  white: '#FFFFFF',
  line: '#E8E4DE',
  ink: '#3C3B3B',
  inkSoft: '#5C5B5B',
  inkFaint: '#8A8888',
  cta: '#111111',
  peach: '#FFDDBF',
  peachWarm: '#E0A580',
  peachDeep: '#C4845E',
  peachTint: '#FFF6EE',
  energy: '#E43A00',
  energyTint: '#FDECE6',
  calm: '#3911AC',
  calmTint: '#EDE8F8',
  positive: '#0F8A3C',
  positiveTint: '#E4F5EA',
  focus: '#0B61CD',
} as const

export type TokenName = keyof typeof tokens
