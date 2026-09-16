import type { GeoOrigin } from "../types";
import { isUsZip } from "./geo";

type ZippopotamPlace = {
  "place name": string;
  longitude: string;
  latitude: string;
  state: string;
  "state abbreviation": string;
};

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    city?: string;
    state?: string;
    countrycode?: string;
    postcode?: string;
    street?: string;
    housenumber?: string;
  };
};

export async function geocodeQuery(query: string): Promise<GeoOrigin | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;
  if (isUsZip(trimmed)) {
    const zip = await geocodeZip(trimmed);
    if (zip) return zip;
  }
  return geocodePlace(trimmed);
}

async function geocodeZip(zip: string): Promise<GeoOrigin | null> {
  const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    "post code": string;
    places?: ZippopotamPlace[];
  };
  const place = data.places?.[0];
  if (!place) return null;
  const lat = Number(place.latitude);
  const lng = Number(place.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    label: `${place["place name"]}, ${place["state abbreviation"]} ${data["post code"]}`,
    source: "zip",
  };
}

async function geocodePlace(query: string): Promise<GeoOrigin | null> {
  const url = new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");
  url.searchParams.set("lang", "en");
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: PhotonFeature[] };
  const match = (data.features ?? []).find((feature) => {
    const code = feature.properties.countrycode?.toUpperCase();
    return !code || code === "US";
  });
  if (!match) return null;
  const [lng, lat] = match.geometry.coordinates;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return {
    lat,
    lng,
    label: formatPhotonLabel(match, query),
    source: "place",
  };
}

function formatPhotonLabel(feature: PhotonFeature, fallback: string): string {
  const p = feature.properties;
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const city = p.city || p.name;
  const parts = [street || p.name, city, p.state, p.postcode].filter(
    (part, index, all) => Boolean(part) && all.indexOf(part) === index,
  );
  return parts.slice(0, 3).join(", ") || fallback;
}

export function geolocate(): Promise<GeoOrigin> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          label: "Your location",
          source: "geolocation",
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error("denied"));
        } else {
          reject(new Error("unavailable"));
        }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60_000 },
    );
  });
}
