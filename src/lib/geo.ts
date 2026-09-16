/** Great-circle distance in miles. */
export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 3958.7613;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatMiles(miles: number): string {
  if (miles < 0.1) return "< 0.1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export function isUsZip(query: string): boolean {
  return /^\d{5}$/.test(query.trim());
}

export function mapsUrl(location: {
  street: string;
  city: string;
  state: string;
  zip: string;
}): string {
  const q = `${location.street}, ${location.city}, ${location.state} ${location.zip}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function formatAddress(location: {
  street: string;
  city: string;
  state: string;
  zip: string;
}): string {
  return `${location.street}, ${location.city}, ${location.state} ${location.zip}`;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export const CONTIGUOUS_US_BOUNDS: [[number, number], [number, number]] = [
  [-124.8, 24.5],
  [-66.9, 49.4],
];
