import type { DemoLocation, GeoOrigin, RankedLocation } from "../types";
import { haversineMiles } from "./geo";

export function rankLocations(
  locations: DemoLocation[],
  origin: GeoOrigin,
): RankedLocation[] {
  return locations
    .map((location) => ({
      ...location,
      distanceMiles: haversineMiles(origin, location),
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
}
