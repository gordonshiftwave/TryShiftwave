import type { LocationRecord } from '../types/location'

export function fullAddress(place: Pick<LocationRecord, 'address' | 'city' | 'state' | 'zip'>): string {
  return [place.address, [place.city, place.state].filter(Boolean).join(', '), place.zip]
    .filter(Boolean)
    .join(', ')
}

export function mapsUrl(place: LocationRecord): string {
  const query = place.lat && place.lng ? `${place.lat},${place.lng}` : fullAddress(place)
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
}

export function telHref(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, '')
  if (digits.replace(/\+/g, '').length < 7) return null
  return `tel:${digits}`
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
