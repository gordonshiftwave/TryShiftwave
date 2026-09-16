import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import { formatMiles, haversineMiles, isUsZip } from "./geo";
import { parseLocationsText } from "./locations";
import { rankLocations } from "./rank";
import type { DemoLocation } from "../types";

const sf: DemoLocation = {
  id: "sf",
  name: "Castro Reset Studio",
  type: "studio",
  street: "410 Castro St",
  city: "San Francisco",
  state: "CA",
  zip: "94114",
  lat: 37.7621,
  lng: -122.435,
  hours: "Tue–Sat 9am–6pm",
  qualified: true,
};

const oak: DemoLocation = {
  ...sf,
  id: "oak",
  name: "Temescal Recovery Room",
  city: "Oakland",
  lat: 37.8286,
  lng: -122.2624,
};

const nash: DemoLocation = {
  ...sf,
  id: "nash",
  name: "12 South Breath Studio",
  city: "Nashville",
  state: "TN",
  lat: 36.1265,
  lng: -86.7892,
};

describe("geo", () => {
  it("flags 5-digit ZIP codes", () => {
    expect(isUsZip("94114")).toBe(true);
    expect(isUsZip("94114-1234")).toBe(false);
    expect(isUsZip("San Francisco")).toBe(false);
  });

  it("computes Bay Area distances in miles", () => {
    const miles = haversineMiles(sf, oak);
    expect(miles).toBeGreaterThan(8);
    expect(miles).toBeLessThan(14);
    expect(formatMiles(0.04)).toBe("< 0.1 mi");
    expect(formatMiles(2.4)).toBe("2.4 mi");
    expect(formatMiles(48.2)).toBe("48 mi");
  });
});

describe("rankLocations", () => {
  it("sorts nearest first from a San Francisco origin", () => {
    const ranked = rankLocations([nash, oak, sf], {
      lat: 37.7749,
      lng: -122.4194,
      label: "San Francisco, CA 94102",
      source: "zip",
    });
    expect(ranked.map((row) => row.id)).toEqual(["sf", "oak", "nash"]);
    expect(ranked[0].distanceMiles).toBeLessThan(ranked[1].distanceMiles);
  });
});

describe("csv + location payload", () => {
  it("parses quoted CSV rows and maps sheet aliases", () => {
    const csv = [
      "Name,Address,City,State,Zip,Latitude,Longitude,Hours,Phone,Email,Type,Qualified",
      '"Pearl Street Recovery","1942 Pearl St, Unit B",Boulder,CO,80302,40.019,-105.271,Mon–Thu 9am–6pm,(303) 555-0195,care@pearl.example,clinic,yes',
    ].join("\n");
    const [row] = parseCsv(csv);
    expect(row.name).toBe("Pearl Street Recovery");
    expect(row.address).toBe("1942 Pearl St, Unit B");

    const [location] = parseLocationsText(csv, "partners.csv", "text/csv");
    expect(location.name).toBe("Pearl Street Recovery");
    expect(location.street).toBe("1942 Pearl St, Unit B");
    expect(location.lat).toBeCloseTo(40.019);
    expect(location.type).toBe("clinic");
    expect(location.qualified).toBe(true);
  });

  it("reads the nested JSON file shape", () => {
    const json = JSON.stringify({
      meta: { isLive: false },
      locations: [sf, { ...oak, qualified: false }],
    });
    const parsed = parseLocationsText(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("sf");
  });
});
