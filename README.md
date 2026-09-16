# Where Can I Try Shiftwave?

Standalone location finder for Shiftwave try-spots. Search a ZIP, city, or address — or use your location — and get the nearest **qualified demo studios** in seconds.

This is a playtest build for the public map. It is not embedded in [shiftwave.co](https://shiftwave.co), and it does not include Shopify, HubSpot, auth, booking, ambassadors, or heat maps.

## Run locally

Requires Node 20+.

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

| Script | What it does |
| --- | --- |
| `npm run dev` | Local dev server with hot reload |
| `npm run build` | Typecheck + static production build into `dist/` |
| `npm run preview` | Serve the `dist/` build locally |
| `npm test` | Unit tests for distance, ranking, and sheet/CSV parsing |

The production output in `dist/` is a static site. Host it on GitHub Pages, Netlify, Cloudflare Pages, S3, or any static file host.

## What you can do in the UI

- Title: **Where Can I Try Shiftwave?**
- ZIP / city / address search (US)
- **Use my location** (falls back to a ZIP search prompt if permission is denied or geolocation is unavailable)
- Interactive US map with pins; click a state to zoom
- Results list synced with the map (tap a card or a pin)
- Each place: name, distance in miles, address (Google Maps link), hours, phone and/or email
- Mobile-first layout
- Empty / no-nearby copy when a place cannot be geocoded or nothing sits within 75 miles

A banner reads **Demo data — not the live partner list** until you point the app at real qualified rows.

## Data

Live Google Sheet wiring comes later. Today the app loads [`public/locations.json`](public/locations.json) — 18 **example** studios covering the Bay Area, SoCal, Florida, Las Vegas, Central NJ, Milwaukee, Chicago, Montecito, Nashville, Los Angeles, and Boulder.

Do not treat those names, phones, or hours as real partners.

### Swap in the real list

The fetch layer lives in [`src/lib/locations.ts`](src/lib/locations.ts). It already accepts JSON or CSV and normalizes common sheet column names.

**Option A — replace the JSON file**

1. Keep the same shape as `public/locations.json` (`{ "meta": { "isLive": true }, "locations": [ ... ] }`).
2. Set `"isLive": true` so the demo banner hides.
3. Redeploy.

**Option B — published Google Sheet CSV (preferred for Dani’s sheet)**

1. Publish the sheet to the web as CSV.
2. Copy [`.env.example`](.env.example) to `.env`.
3. Set:

```bash
VITE_LOCATIONS_URL=https://docs.google.com/spreadsheets/d/e/SHEET_ID/pub?output=csv
```

4. Restart `npm run dev` / rebuild.

A column template is in [`public/locations.example.csv`](public/locations.example.csv).

### Column mapping

| Sheet column (any of these) | Used as |
| --- | --- |
| `id` | Stable id (optional; generated from name + city if missing) |
| `name`, `location`, `location_name` | Studio name |
| `type`, `category` | `clinic` \| `gym` \| `wellness` \| `studio` |
| `street`, `address` | Street line |
| `city` | City |
| `state`, `region` | Two-letter state preferred |
| `zip`, `zipcode`, `postal_code` | ZIP |
| `lat` / `latitude`, `lng` / `lon` / `longitude` | Coordinates |
| `hours` | Hours text |
| `phone`, `email` | Contact (either or both) |
| `qualified`, `public` | `false` / `no` / `0` rows are omitted from the public map |

Only qualified, public, demo-friendly locations should go in this file. Buying a unit is not enough — the studio has to want walk-in or appointment demos.

## Geocoding

No paid map or geocode key is required.

- 5-digit ZIP → [Zippopotam.us](https://zippopotam.us/)
- City / address → [Photon](https://photon.komoot.io/) (OpenStreetMap), US results preferred
- Map tiles → MapLibre GL + CARTO light raster tiles (OSM attribution shown on the map)

## Brand

Stethoscope Design tokens: paper/cream surfaces, Fraunces + Source Sans 3, sky–sage–coral map accents, small line-wave isotype only. Not the Shiftwave marketing dark chrome.

## Out of scope

Shopify sync, HubSpot, auth, booking, ambassador network, prospect heat maps, and embedding into shiftwave.co.
