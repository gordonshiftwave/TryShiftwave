import type { Coord } from '../types'

const EARTH_MILES = 3958.8
const KM_PER_MILE = 1.609344

export type DistanceUnit = 'mi' | 'km'

/** Miles when the searched place is in the United States. Kilometers everywhere else. */
export function distanceUnit(countryCode?: string): DistanceUnit {
  return (countryCode ?? '').trim().toUpperCase() === 'US' ? 'mi' : 'km'
}

export function radiusInMiles(radius: number, unit: DistanceUnit): number {
  return unit === 'mi' ? radius : radius / KM_PER_MILE
}

export function milesBetween(a: Coord, b: Coord): number {
  const φ1 = toRad(a.lat)
  const φ2 = toRad(b.lat)
  const Δφ = toRad(b.lat - a.lat)
  const Δλ = toRad(b.lng - a.lng)
  const h =
    Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return 2 * EARTH_MILES * Math.asin(Math.min(1, Math.sqrt(h)))
}

export function formatMiles(miles: number): string {
  return formatDistance(miles, 'mi')
}

export function formatDistance(miles: number, unit: DistanceUnit): string {
  const value = unit === 'km' ? miles * KM_PER_MILE : miles
  const suffix = unit === 'km' ? 'km' : 'mi'
  if (value < 0.1) return `< 0.1 ${suffix}`
  if (value < 10) return `${value.toFixed(1)} ${suffix}`
  return `${Math.round(value)} ${suffix}`
}

export function unitWord(unit: DistanceUnit, count = 2): string {
  if (unit === 'km') return count === 1 ? 'kilometer' : 'kilometers'
  return count === 1 ? 'mile' : 'miles'
}

export function rankByDistance<T extends Coord>(
  origin: Coord,
  places: T[],
): (T & { distanceMiles: number })[] {
  return places
    .map((place) => ({ ...place, distanceMiles: milesBetween(origin, place) }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}
