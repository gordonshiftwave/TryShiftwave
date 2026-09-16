export type UsState = {
  abbr: string
  name: string
  /** west, south, east, north */
  bbox: [number, number, number, number]
  center: [number, number]
}

export const US_STATES: UsState[] = [
  { abbr: 'AL', name: 'Alabama', bbox: [-88.47, 30.22, -84.89, 35.01], center: [-86.9, 32.81] },
  { abbr: 'AK', name: 'Alaska', bbox: [-179.15, 51.21, -129.98, 71.39], center: [-153.37, 64.2] },
  { abbr: 'AZ', name: 'Arizona', bbox: [-114.82, 31.33, -109.04, 37.0], center: [-111.66, 34.27] },
  { abbr: 'AR', name: 'Arkansas', bbox: [-94.62, 33.0, -89.64, 36.5], center: [-92.44, 34.97] },
  { abbr: 'CA', name: 'California', bbox: [-124.48, 32.53, -114.13, 42.01], center: [-119.42, 36.78] },
  { abbr: 'CO', name: 'Colorado', bbox: [-109.06, 36.99, -102.04, 41.0], center: [-105.55, 39.0] },
  { abbr: 'CT', name: 'Connecticut', bbox: [-73.73, 40.98, -71.79, 42.05], center: [-72.73, 41.6] },
  { abbr: 'DE', name: 'Delaware', bbox: [-75.79, 38.45, -75.05, 39.84], center: [-75.51, 38.99] },
  { abbr: 'DC', name: 'District of Columbia', bbox: [-77.12, 38.79, -76.91, 38.99], center: [-77.02, 38.9] },
  { abbr: 'FL', name: 'Florida', bbox: [-87.63, 24.52, -80.03, 31.0], center: [-81.69, 27.76] },
  { abbr: 'GA', name: 'Georgia', bbox: [-85.61, 30.36, -80.84, 35.0], center: [-83.44, 32.64] },
  { abbr: 'HI', name: 'Hawaii', bbox: [-160.25, 18.91, -154.81, 22.24], center: [-157.5, 20.5] },
  { abbr: 'ID', name: 'Idaho', bbox: [-117.24, 41.99, -111.04, 49.0], center: [-114.61, 44.39] },
  { abbr: 'IL', name: 'Illinois', bbox: [-91.51, 36.97, -87.02, 42.51], center: [-89.4, 40.04] },
  { abbr: 'IN', name: 'Indiana', bbox: [-88.1, 37.77, -84.78, 41.76], center: [-86.28, 39.89] },
  { abbr: 'IA', name: 'Iowa', bbox: [-96.64, 40.38, -90.14, 43.5], center: [-93.5, 42.08] },
  { abbr: 'KS', name: 'Kansas', bbox: [-102.05, 36.99, -94.59, 40.0], center: [-98.33, 38.5] },
  { abbr: 'KY', name: 'Kentucky', bbox: [-89.57, 36.5, -81.96, 39.15], center: [-84.27, 37.67] },
  { abbr: 'LA', name: 'Louisiana', bbox: [-94.04, 28.93, -88.82, 33.02], center: [-91.87, 31.0] },
  { abbr: 'ME', name: 'Maine', bbox: [-71.08, 43.06, -66.95, 47.46], center: [-69.24, 45.25] },
  { abbr: 'MD', name: 'Maryland', bbox: [-79.49, 37.91, -75.05, 39.72], center: [-76.64, 39.05] },
  { abbr: 'MA', name: 'Massachusetts', bbox: [-73.51, 41.24, -69.93, 42.89], center: [-71.81, 42.26] },
  { abbr: 'MI', name: 'Michigan', bbox: [-90.42, 41.7, -82.41, 48.31], center: [-84.55, 44.31] },
  { abbr: 'MN', name: 'Minnesota', bbox: [-97.24, 43.5, -89.49, 49.38], center: [-94.64, 46.39] },
  { abbr: 'MS', name: 'Mississippi', bbox: [-91.66, 30.17, -88.1, 35.0], center: [-89.68, 32.74] },
  { abbr: 'MO', name: 'Missouri', bbox: [-95.77, 35.99, -89.1, 40.61], center: [-92.46, 38.46] },
  { abbr: 'MT', name: 'Montana', bbox: [-116.05, 44.36, -104.04, 49.0], center: [-110.45, 46.92] },
  { abbr: 'NE', name: 'Nebraska', bbox: [-104.05, 40.0, -95.31, 43.0], center: [-99.79, 41.5] },
  { abbr: 'NV', name: 'Nevada', bbox: [-120.0, 35.0, -114.04, 42.0], center: [-116.42, 38.8] },
  { abbr: 'NH', name: 'New Hampshire', bbox: [-72.56, 42.7, -70.71, 45.31], center: [-71.57, 43.68] },
  { abbr: 'NJ', name: 'New Jersey', bbox: [-75.56, 38.93, -73.89, 41.36], center: [-74.41, 40.19] },
  { abbr: 'NM', name: 'New Mexico', bbox: [-109.05, 31.33, -103.0, 37.0], center: [-106.11, 34.31] },
  { abbr: 'NY', name: 'New York', bbox: [-79.76, 40.5, -71.86, 45.02], center: [-75.47, 43.0] },
  { abbr: 'NC', name: 'North Carolina', bbox: [-84.32, 33.84, -75.46, 36.59], center: [-79.39, 35.56] },
  { abbr: 'ND', name: 'North Dakota', bbox: [-104.05, 45.94, -96.55, 49.0], center: [-100.47, 47.45] },
  { abbr: 'OH', name: 'Ohio', bbox: [-84.82, 38.4, -80.52, 41.98], center: [-82.79, 40.29] },
  { abbr: 'OK', name: 'Oklahoma', bbox: [-103.0, 33.62, -94.43, 37.0], center: [-97.49, 35.59] },
  { abbr: 'OR', name: 'Oregon', bbox: [-124.57, 41.99, -116.46, 46.29], center: [-120.77, 43.97] },
  { abbr: 'PA', name: 'Pennsylvania', bbox: [-80.52, 39.72, -74.69, 42.27], center: [-77.84, 40.88] },
  { abbr: 'RI', name: 'Rhode Island', bbox: [-71.86, 41.15, -71.12, 42.02], center: [-71.56, 41.68] },
  { abbr: 'SC', name: 'South Carolina', bbox: [-83.35, 32.05, -78.54, 35.22], center: [-80.91, 33.86] },
  { abbr: 'SD', name: 'South Dakota', bbox: [-104.06, 42.48, -96.44, 45.95], center: [-100.23, 44.44] },
  { abbr: 'TN', name: 'Tennessee', bbox: [-90.31, 34.98, -81.65, 36.68], center: [-86.56, 35.86] },
  { abbr: 'TX', name: 'Texas', bbox: [-106.65, 25.84, -93.51, 36.5], center: [-99.33, 31.45] },
  { abbr: 'UT', name: 'Utah', bbox: [-114.05, 36.99, -109.04, 42.0], center: [-111.67, 39.32] },
  { abbr: 'VT', name: 'Vermont', bbox: [-73.44, 42.73, -71.46, 45.02], center: [-72.66, 44.07] },
  { abbr: 'VA', name: 'Virginia', bbox: [-83.68, 36.54, -75.24, 39.47], center: [-78.66, 37.54] },
  { abbr: 'WA', name: 'Washington', bbox: [-124.76, 45.54, -116.92, 49.0], center: [-120.45, 47.4] },
  { abbr: 'WV', name: 'West Virginia', bbox: [-82.64, 37.2, -77.72, 40.64], center: [-80.62, 38.64] },
  { abbr: 'WI', name: 'Wisconsin', bbox: [-92.89, 42.49, -86.81, 47.31], center: [-89.75, 44.62] },
  { abbr: 'WY', name: 'Wyoming', bbox: [-111.06, 40.99, -104.05, 45.01], center: [-107.55, 43.0] },
]

export function findState(query: string): UsState | undefined {
  const q = query.trim().toLowerCase().replace(/\./g, '')
  if (!q) return undefined
  return US_STATES.find(
    (state) =>
      state.abbr.toLowerCase() === q ||
      state.name.toLowerCase() === q ||
      `state of ${state.name.toLowerCase()}` === q,
  )
}

export function stateBounds(
  state: UsState,
): [[number, number], [number, number]] {
  const [west, south, east, north] = state.bbox
  return [
    [west, south],
    [east, north],
  ]
}
