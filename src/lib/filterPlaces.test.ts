import { describe, expect, it } from 'vitest'
import { parseLocationCsv, parseLocationsJson, publicLocations } from '../data/loadLocations'
import { milesBetween, formatMiles } from './distance'
import { filterPlaces, withDistances } from './filterPlaces'
import { isQualifiedFlag } from './qualify'
import { parseCsv } from './csv'

describe('milesBetween', () => {
  it('measures Oakland to San Francisco as a short hop', () => {
    const miles = milesBetween(
      { lat: 37.8051, lng: -122.2708 },
      { lat: 37.7983, lng: -122.43 },
    )
    expect(miles).toBeGreaterThan(7)
    expect(miles).toBeLessThan(12)
  })
})

describe('formatMiles', () => {
  it('uses one decimal under 10 miles', () => {
    expect(formatMiles(2.44)).toBe('2.4 mi')
    expect(formatMiles(12.2)).toBe('12 mi')
    expect(formatMiles(0.04)).toBe('< 0.1 mi')
  })
})

describe('qualify and csv', () => {
  it('accepts common sheet truthy values', () => {
    expect(isQualifiedFlag('YES')).toBe(true)
    expect(isQualifiedFlag('qualified')).toBe(true)
    expect(isQualifiedFlag('no')).toBe(false)
  })

  it('parses quoted CSV rows', () => {
    const rows = parseCsv('name,city\n"Rise, Studio",Oakland\n')
    expect(rows[1]).toEqual(['Rise, Studio', 'Oakland'])
  })
})

describe('locations sheet shape', () => {
  it('maps flexible headers and drops unqualified rows for the public map', () => {
    const csv = [
      'Location Name,Street Address,City,State,Zip Code,Phone,Email,Hours,Latitude,Longitude,Qualification Flag',
      'Public Clinic,1 Main,Boulder,CO,80302,(303) 555-0100,a@b.com,9-5,40.01,-105.27,yes',
      'Private Home,2 Main,Boulder,CO,80302,,,n/a,40.02,-105.28,no',
    ].join('\n')
    const parsed = parseLocationCsv(csv)
    expect(parsed).toHaveLength(2)
    expect(publicLocations(parsed)).toHaveLength(1)
    expect(publicLocations(parsed)[0]?.name).toBe('Public Clinic')
  })

  it('keeps JSON demo rows without coords out of the map', () => {
    const parsed = parseLocationsJson({
      locations: [
        { name: 'Good', lat: 40, lng: -105, qualified: true },
        { name: 'Bad', qualified: true },
      ],
    })
    expect(parsed).toHaveLength(1)
  })
})

describe('filterPlaces', () => {
  const places = withDistances(
    [
      {
        id: 'near',
        name: 'Near',
        address: '',
        city: 'Boulder',
        state: 'CO',
        zip: '80302',
        phone: '',
        email: '',
        hours: '',
        lat: 40.02,
        lng: -105.27,
        qualified: true,
      },
      {
        id: 'far',
        name: 'Far',
        address: '',
        city: 'Miami',
        state: 'FL',
        zip: '33139',
        phone: '',
        email: '',
        hours: '',
        lat: 25.79,
        lng: -80.14,
        qualified: true,
      },
    ],
    { lat: 40.019, lng: -105.277, label: 'Boulder', kind: 'place' },
  )

  it('keeps only in-radius results', () => {
    const within = filterPlaces(places, {
      origin: places[0] ? { lat: 40.019, lng: -105.277, label: 'Boulder', kind: 'place' } : null,
      radius: 50,
      stateFilter: null,
    })
    expect(within.map((p) => p.id)).toEqual(['near'])
  })

  it('state filter ignores radius', () => {
    const florida = filterPlaces(places, {
      origin: { lat: 40.019, lng: -105.277, label: 'Boulder', kind: 'place' },
      radius: 50,
      stateFilter: 'FL',
    })
    expect(florida.map((p) => p.id)).toEqual(['far'])
  })
})
