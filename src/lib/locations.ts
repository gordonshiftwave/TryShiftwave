import type { DemoLocation, LocationType, LocationsFile } from "../types";
import { LOCATION_TYPES } from "../types";
import { parseCsv } from "./csv";

const HEADER_ALIASES: Record<string, string> = {
  id: "id",
  name: "name",
  location: "name",
  location_name: "name",
  studio: "name",
  type: "type",
  category: "type",
  street: "street",
  address: "street",
  street_address: "street",
  city: "city",
  state: "state",
  region: "state",
  zip: "zip",
  zipcode: "zip",
  postal: "zip",
  postal_code: "zip",
  lat: "lat",
  latitude: "lat",
  lng: "lng",
  lon: "lng",
  long: "lng",
  longitude: "lng",
  hours: "hours",
  hours_of_operation: "hours",
  phone: "phone",
  telephone: "phone",
  email: "email",
  qualified: "qualified",
  public: "qualified",
};

export async function loadLocations(): Promise<{
  locations: DemoLocation[];
  isLive: boolean;
  sourceLabel: string;
}> {
  const url = import.meta.env.VITE_LOCATIONS_URL || "/locations.json";
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not load locations (${res.status}).`);
  }
  const text = await res.text();
  const contentType = res.headers.get("content-type") ?? "";
  const locations = parseLocationsText(text, url, contentType);
  return {
    locations,
    isLive: import.meta.env.VITE_LOCATIONS_URL
      ? true
      : jsonIsLive(text) && locations.length > 0,
    sourceLabel: import.meta.env.VITE_LOCATIONS_URL
      ? "Live partner list"
      : "Demo data",
  };
}

function jsonIsLive(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as LocationsFile;
    return parsed.meta?.isLive === true;
  } catch {
    return false;
  }
}

export function parseLocationsText(
  text: string,
  sourceUrl = "",
  contentType = "",
): DemoLocation[] {
  const records = looksLikeCsv(sourceUrl, contentType, text)
    ? parseCsv(text).map(normalizeRecord)
    : parseJsonPayload(text);
  return records.filter(isCompleteLocation);
}

function looksLikeCsv(url: string, contentType: string, text: string): boolean {
  if (url.includes("output=csv") || url.endsWith(".csv")) return true;
  if (contentType.includes("csv") || contentType.includes("spreadsheet")) {
    return true;
  }
  const first = text.trimStart().slice(0, 80).toLowerCase();
  return first.startsWith("id,") || first.startsWith("name,");
}

function parseJsonPayload(text: string): DemoLocation[] {
  const parsed = JSON.parse(text) as LocationsFile | DemoLocation[] | Record<string, unknown>[];
  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.locations)
      ? parsed.locations
      : [];
  return rows.map((row) =>
    isDemoLocation(row) ? row : normalizeRecord(row as Record<string, unknown>),
  );
}

function isDemoLocation(value: unknown): value is DemoLocation {
  if (!value || typeof value !== "object") return false;
  const row = value as DemoLocation;
  return (
    typeof row.id === "string" &&
    typeof row.name === "string" &&
    typeof row.lat === "number" &&
    typeof row.lng === "number"
  );
}

function normalizeRecord(row: Record<string, unknown>): DemoLocation {
  const get = (key: string) => {
    const aliases = Object.entries(HEADER_ALIASES)
      .filter(([, canonical]) => canonical === key)
      .map(([alias]) => alias);
    for (const alias of aliases) {
      const value = row[alias] ?? row[key];
      if (value != null && String(value).trim() !== "") return String(value).trim();
    }
    return "";
  };

  const name = get("name");
  const city = get("city");
  const state = get("state");
  const id =
    get("id") ||
    slug(`${name}-${city}-${state}-${get("zip")}`) ||
    cryptoRandomId();

  return {
    id,
    name,
    type: parseType(get("type")),
    street: get("street"),
    city,
    state: get("state").toUpperCase(),
    zip: get("zip"),
    lat: Number(get("lat")),
    lng: Number(get("lng")),
    hours: get("hours") || "Hours on request",
    phone: get("phone") || undefined,
    email: get("email") || undefined,
    qualified: parseQualified(get("qualified")),
  };
}

function parseType(value: string): LocationType {
  const lower = value.toLowerCase();
  return LOCATION_TYPES.find((type) => type === lower) ?? "wellness";
}

function parseQualified(value: string): boolean {
  if (!value) return true;
  return !["false", "0", "no", "n"].includes(value.toLowerCase());
}

function isCompleteLocation(location: DemoLocation): boolean {
  return (
    Boolean(location.name) &&
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lng) &&
    location.qualified !== false
  );
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `loc-${Math.random().toString(36).slice(2, 10)}`;
}
