# Where Can I Try Shiftwave?

Public map for finding a nearby place to **try Shiftwave** — full-body pulsed pressure and guided breathwork. This is a standalone web app (search + map) meant to ship before it is embedded on shiftwave.co.

The live partner list is still in a Google Sheet. This repo ships with **example** locations so the product can be designed, shared, and wired to the sheet without blocking on Shopify, HubSpot, or auth.

> Demo data — not the live partner list. Only **qualified** public demo locations should ever appear on the map (public-facing, demo consent, walk-in appropriate). Ambassadors, pop-ups, booking, and heat maps are out of scope here.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build (static)

```bash
npm run build
npm run preview
```

`npm run build` writes a static site to `dist/` (Vite + React + TypeScript). Host the folder on any static host. No Mapbox/Google Maps API key is required: the map uses [MapLibre GL](https://maplibre.org/) with [OpenFreeMap](https://openfreemap.org/) vector tiles.

Geocoding uses Zippopotam.us (US ZIP codes) with OpenStreetMap Nominatim / Photon as fallback. Please keep OSM attribution visible (MapLibre adds it).

## Product behavior

- Search by US **ZIP**, **city**, or **address**
- **Use my location**, with a clear fallback if permission is denied or the page is not HTTPS
- Interactive US map, pins synced to the list, state click-to-zoom at low zoom
- Each place: name, distance (mi), address (Google Maps link), hours, phone and/or email
- Empty / no-nearby state shows the closest qualified examples
- Mobile-first layout; `prefers-reduced-motion` disables fly/fit animation

Brand tokens follow Stethoscope Design (paper / cream / sand surfaces, Fraunces + Source Sans 3). Shiftwave marketing chrome (dark UI, orange `#E43A00`, purple `#3911AC`) is intentionally not used.

## Data module

Runtime file: [`public/locations.json`](public/locations.json)

The loader lives in `src/data/`. It already accepts **JSON or CSV** with the same field names, so a sheet export can replace the example file with one environment variable.

### Point the app at the live sheet

1. Keep the qualification columns on the sheet (do not publish unqualified buyers).
2. Set `VITE_LOCATIONS_URL` at build time to a CORS-enabled feed.

Examples:

```bash
# Default — example JSON in this repo
VITE_LOCATIONS_URL=/locations.json

# CSV sitting next to the app (export from Google Sheets → File → Download → CSV)
VITE_LOCATIONS_URL=/locations.csv

# JSON proxy of a public Google Sheet tab (header row = field names below)
# https://opensheet.elk.sh/{spreadsheet_id}/{tab_name}
VITE_LOCATIONS_URL=https://opensheet.elk.sh/SPREADSHEET_ID/Locations
```

Create a `.env` (see `.env.example`) and rebuild. Google’s raw `/export?format=csv` URLs often **fail CORS** in the browser; prefer a committed CSV, Opensheet, or a tiny Apps Script web app that returns JSON with `Access-Control-Allow-Origin`.

### Expected field names

Header row of the Google Sheet should use these names (snake_case). Aliases such as `latitude`, `address`, `zip_code`, and `walk_in_appropriate` are also accepted — see `src/data/parse.ts`.

| Field | Required | Notes |
| --- | --- | --- |
| `id` | unique string | Stable slug; generated from name if blank |
| `name` | yes | Public business name |
| `street` | yes | Street line |
| `city` | yes | |
| `state` | yes | Two-letter USPS code preferred (`CA`) |
| `zip` | yes | 5-digit ZIP |
| `lat` | yes | WGS84 latitude |
| `lng` | yes | WGS84 longitude |
| `phone` | if no email | Display + `tel:` link |
| `email` | if no phone | Display + `mailto:` link |
| `hours` | recommended | Single human-readable string, e.g. `Mon–Fri 8am–6pm · Sat 9am–2pm` |
| `website` | optional | Reserved for later |
| `category` | optional | `clinic` · `gym` · `wellness` · `studio` |
| `region` | optional | Grouping label (`Bay Area`, `Central New Jersey`) |
| `qualified` | yes | `TRUE` / `FALSE` |
| `public_facing` | yes | Public business, not home use |
| `demo_consent` | yes | Partner agrees to receive demo visitors |
| `walk_in_ok` | yes | Appropriate for walk-ins (not events-only) |
| `notes` | optional | Internal; not shown in the UI |

Boolean cells accept `TRUE`, `yes`, `1`, `x`.

JSON may be either an array of row objects or `{ "locations": [ ... ] }`.

**Public map filter:** a row is shown only when `qualified`, `public_facing`, `demo_consent`, and `walk_in_ok` are all true. That is the Colin qualification gate from the growth-reports discussion — Shopify “business” tags are not enough.

### Example CSV header

```csv
id,name,street,city,state,zip,lat,lng,phone,email,hours,website,category,region,qualified,public_facing,demo_consent,walk_in_ok,notes
```

## Out of scope (this app)

- Shopify sync / auto-adding purchasers
- HubSpot, auth, booking
- Ambassador network
- Prospect heat maps
- shiftwave.co embed

## Stack

Vite, React, TypeScript, Tailwind CSS v4, MapLibre GL JS, OpenFreeMap.
