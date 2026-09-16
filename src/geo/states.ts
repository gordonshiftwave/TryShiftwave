/** USPS two-letter codes → English names. */
export const US_STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
}

const NAME_TO_ABBR: Record<string, string> = Object.fromEntries(
  Object.entries(US_STATE_NAMES).map(([abbr, name]) => [name.toLowerCase(), abbr]),
)

/** Two-letter USPS code when the value is a known name or abbreviation. */
export function normalizeState(value: string): string {
  const s = value.trim()
  if (!s) return ''
  if (/^[A-Za-z]{2}$/.test(s)) return s.toUpperCase()
  return NAME_TO_ABBR[s.toLowerCase()] ?? s
}

export function stateName(abbrOrName: string): string {
  const abbr = normalizeState(abbrOrName)
  return US_STATE_NAMES[abbr] ?? abbrOrName
}

export function statesMatch(placeState: string, needle?: string): boolean {
  if (!needle) return false
  const left = normalizeState(placeState)
  const right = normalizeState(needle)
  if (left && right && left.toUpperCase() === right.toUpperCase()) return true
  const n = needle.trim().toLowerCase()
  return (
    placeState.trim().toLowerCase() === n ||
    stateName(placeState).toLowerCase() === n
  )
}
