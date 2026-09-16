# Where Can I Try Shiftwave?

Public map for finding a nearby place to **try Shiftwave** — full-body pulsed pressure and guided breathwork. This is a standalone web app (search + map) meant to ship before it is embedded on shiftwave.co.

[`public/locations.json`](public/locations.json) is a **static snapshot** of qualified partners from Dani’s *Shiftwave Clinic & Commercial List* (rows where “Can we send people there to Demo?” = YES). No Shopify, no Google write access, and no secrets. To refresh, export the sheet and replace that file (or point `VITE_LOCATIONS_URL` at a CORS-enabled JSON/CSV feed).

> Live partner list. Only **qualified** public try-spots appear on the map (public-facing, demo consent, walk-in appropriate). The sheet has no street-address column and no hours column — pins are city/ZIP, and hours are “Call for hours.” Ambassadors, pop-ups, booking, and heat maps are out of scope here.

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

- One job on load: a centered ZIP / city / address search (Google “find a place near me,” not a dashboard)
- Map and results appear **after** search or **Use my location**
- **Use my location**, with a clear fallback if permission is denied or the page is not HTTPS
- Results as a simple list with distance; pins synced to the list; state click-to-zoom at national zoom
- Each place: name, distance (mi), address (Google Maps link), hours, phone and/or email
- Empty / no-nearby state shows the closest qualified try-spots
- Mobile-first layout; `prefers-reduced-motion` disables fly/fit animation and the results reveal

Brand tokens follow Stethoscope Design (paper / cream / sand surfaces, Fraunces + Source Sans 3). Color science and the Google-like search pattern are documented in [`DESIGN.md`](DESIGN.md). Shiftwave marketing chrome (dark UI, orange `#E43A00`, purple `#3911AC`) is intentionally not used.

## Data module

Runtime file: [`public/locations.json`](public/locations.json)

The loader lives in `src/data/`. It accepts **JSON or CSV**. Field names from the sheet (`address` instead of `street`, full state names, free-form categories) are mapped in `parse.ts`. Street lines and hours are **not invented** — empty street stays empty; hours stay “Call for hours” until the sheet has them.

### Refresh from the sheet later

1. Keep the qualification columns (do not publish unqualified buyers).
2. Export JSON or CSV and replace `public/locations.json`, **or** set `VITE_LOCATIONS_URL` at build time to a CORS-enabled feed.

Examples:

```bash
# Default — committed snapshot in this repo
VITE_LOCATIONS_URL=/locations.json

# CSV sitting next to the app (export from Google Sheets → File → Download → CSV)
VITE_LOCATIONS_URL=/locations.csv

# JSON proxy of a public Google Sheet tab (header row = field names below)
# https://opensheet.elk.sh/{spreadsheet_id}/{tab_name}
VITE_LOCATIONS_URL=https://opensheet.elk.sh/SPREADSHEET_ID/Locations
```

Create a `.env` (see `.env.example`) and rebuild. Google’s raw `/export?format=csv` URLs often **fail CORS** in the browser; prefer a committed JSON/CSV snapshot, Opensheet, or a tiny Apps Script web app that returns JSON with `Access-Control-Allow-Origin`.

### Expected field names

Header row of the Google Sheet should use these names (snake_case). Aliases such as `latitude`, `address`, `zip_code`, and `walk_in_appropriate` are also accepted — see `src/data/parse.ts`.

| Field | Required | Notes |
| --- | --- | --- |
| `id` | unique string | Stable slug; generated from name if blank |
| `name` | yes | Public business name |
| `street` | if known | Street line. Leave blank rather than inventing. `address` that is only “City, State ZIP” is not treated as a street. |
| `city` | preferred | May be missing for a few rows |
| `state` | yes | Full name or two-letter USPS code (`California` or `CA`) |
| `zip` | preferred | 5-digit ZIP |
| `lat` | yes | WGS84 latitude |
| `lng` | yes | WGS84 longitude |
| `phone` | if no email | Display + `tel:` link |
| `email` | if no phone | Display + `mailto:` link |
| `hours` | recommended | Single human-readable string. Snapshot uses `Call for hours`. |
| `website` | optional | Reserved for later |
| `category` | optional | Sheet label shown in the list (e.g. `Longevity / Wellness Center`) |
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
- Live Google Sheet write-back (snapshot refresh is a file replace)

## Stack

Vite, React, TypeScript, Tailwind CSS v4, MapLibre GL JS, OpenFreeMap.
