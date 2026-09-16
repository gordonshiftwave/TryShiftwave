/**
 * Canonical product colors. Keep in sync with `src/index.css` `@theme` and DESIGN.md.
 * MapLibre paint and SVG pin fills cannot read CSS variables, so they import from here.
 */
export const tokens = {
  paper: '#f6f5f2',
  paperDeep: '#f3f2ee',
  white: '#ffffff',
  line: '#e4e2dc',
  ink: '#171a21',
  inkSoft: '#4a5060',
  inkFaint: '#7a8090',
  aqua: '#0fa3a8',
  aquaDeep: '#0b7f8d',
  violet: '#6f5fe8',
  aquaTint: '#e3f5f5',
  violetTint: '#ebe8fb',
  coral: '#e5563d',
  orange: '#f39a5b',
  positive: '#0f8a3c',
  positiveTint: '#e4f5ea',
  focus: '#0b7f8d',
} as const

export type TokenName = keyof typeof tokens
