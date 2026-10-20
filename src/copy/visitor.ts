import type { DistanceUnit } from '../geo/distance'
import { unitWord } from '../geo/distance'

/** Visitor-facing sentences. Periods and commas only, no coined punctuation. */

export const visitorCopy = {
  searchMiss: "We couldn't find that place. Try a street address, city, or postal code.",
  geoUnsupported: "This browser can't share a location. Search a city or postal code instead.",
  geoInsecure: 'Location needs a secure connection. Search a city or postal code instead.',
  geoDenied: 'Location permission is off. Search a city or postal code instead.',
  geoTimeout: 'Location timed out. Try again, or search a city or postal code.',
  geoFailed: "We couldn't read your location. Try a city or postal code.",
  searchPlaceholder: 'City, address, or postal code',
  searchPlaceholderCompact: 'Search a city, address, or postal code',
  loadingPlaces: 'Loading places...',
  searching: 'Searching...',
  locating: 'Locating...',
  streetMissing: "Street address isn't listed for this place yet.",
  nothingNearbyTitle: 'Nothing nearby yet',
  noPlacesTitle: 'No places listed',
  listFailedTitle: "The list didn't load",
  listUnreadableTitle: "The list couldn't be read",
  closestHeading: 'Closest places',
  noPlacesBody:
    'There are no public places to try Shiftwave right now. Use the enquiry form below this finder.',
  banner:
    'Public places where you can try Shiftwave. Hours show when we have them. Some places are listed by city and postal code until a street address is added.',
  footer: 'These are public places to try Shiftwave. Not every purchaser is listed.',
  addressLabel: 'Address',
  directions: 'Directions',
  placesHere: (count: number) =>
    count === 1 ? '1 place at this pin' : `${count} places at this pin`,
} as const

export function placesNearLabel(count: number, label: string): string {
  const noun = count === 1 ? 'place' : 'places'
  return `${count} ${noun} near ${label}`
}

export function noneWithinLabel(radius: number, label: string, unit: DistanceUnit): string {
  return `No places within ${radius} ${unitWord(unit, radius)} of ${label}`
}

export function nothingNearbyBody(radius: number, label: string, unit: DistanceUnit): string {
  return `No public place within ${radius} ${unitWord(unit, radius)} of ${label}. Use the enquiry form below this finder. Here are the closest places.`
}
