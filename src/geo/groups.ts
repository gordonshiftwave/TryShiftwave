export function coordinateKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`
}

/** Places that share a map point (city-level pins) stay one clickable pin. */
export function groupByCoordinate<T extends { lat: number; lng: number }>(places: T[]): T[][] {
  const groups = new Map<string, T[]>()
  for (const place of places) {
    const key = coordinateKey(place.lat, place.lng)
    const list = groups.get(key)
    if (list) list.push(place)
    else groups.set(key, [place])
  }
  return [...groups.values()]
}
