export const NEARBY_MILES = 75;
export const FAR_MILES = 250;

export const LOCATION_TYPES = ["clinic", "gym", "wellness", "studio"] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export type DemoLocation = {
  id: string;
  name: string;
  type: LocationType;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  hours: string;
  phone?: string;
  email?: string;
  qualified: boolean;
};

export type LocationsFile = {
  meta?: {
    source?: string;
    isLive?: boolean;
    generatedAt?: string;
    disclaimer?: string;
  };
  locations: DemoLocation[];
};

export type GeoOrigin = {
  lat: number;
  lng: number;
  label: string;
  source: "zip" | "place" | "geolocation";
};

export type RankedLocation = DemoLocation & {
  distanceMiles: number;
};

export type SearchStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; origin: GeoOrigin }
  | { kind: "empty-place"; query: string }
  | { kind: "geo-denied" }
  | { kind: "geo-unavailable" }
  | { kind: "error"; message: string };
