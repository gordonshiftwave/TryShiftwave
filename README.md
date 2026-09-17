# Where Can I Try Shiftwave?

Public map for finding a nearby place to **try Shiftwave** — full-body pulsed pressure and guided breathwork. Search + MapLibre map; embeddable on [shiftwave.co](https://shiftwave.co/).

**Website team:** see [`INTEGRATION.md`](INTEGRATION.md) for iframe / Shopify / `VITE_BASE` / locations JSON.  
**Ops / Sales:** see [`OPS.md`](OPS.md) — tag `sw-business` / `sw-finder-exclude`, stage, human qualify, then publish. Do not hand-edit the public list.

## Live site

**https://gordonshiftwave.github.io/TryShiftwave/**

Embed preview: [https://gordonshiftwave.github.io/TryShiftwave/?embed=1](https://gordonshiftwave.github.io/TryShiftwave/?embed=1) (or [`/embed.html`](https://gordonshiftwave.github.io/TryShiftwave/embed.html)).

Pushes to `main` run `.github/workflows/deploy-pages.yml` (`npm ci`, `npm run build`, deploy `dist/` via GitHub Pages). Vite `base` defaults to `/TryShiftwave/` for this project site. Override with `VITE_BASE` (`/` or `/pages/find-shiftwave/`) when hosting on shiftwave.co — do not hard-code github.io.

If that URL 404s, Gordon needs one click: **Settings → Pages → Build and deployment → Source: GitHub Actions**. Then open **Actions → Deploy GitHub Pages** and **Re-run failed jobs**. The first run’s `build` job already succeeded; `deploy` returns 404 until Pages is enabled (this token cannot flip that setting via the API).

[`public/locations.json`](public/locations.json) is the **published** snapshot of qualified try-spots (today: Dani’s *Shiftwave Clinic & Commercial List*, “Can we send people there to Demo?” = YES). The standing intake path is Shopify tagging → staging queue → human qualify → this file (or `VITE_LOCATIONS_URL`) — see [`OPS.md`](OPS.md) and [`INTEGRATION.md`](INTEGRATION.md). No Shopify in the client, no Google write access, no secrets.

> Live partner list. Only **qualified** public try-spots appear on the map (public-facing, demo consent, walk-in appropriate). Pins are still city/ZIP (the sheet has no street-address column). Hours are public listing hours where found, otherwise **Hours unavailable**. Ambassadors, pop-ups, booking, and heat maps are out of scope here.

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

`npm run build` writes a static site to `dist/` (Vite + React + TypeScript). Asset URLs follow Vite `base`: `/TryShiftwave/` unless `VITE_BASE` is set. `npm run preview` serves that build at [http://localhost:4173/TryShiftwave/](http://localhost:4173/TryShiftwave/) with the default Pages base. No Mapbox/Google Maps API key is required: the map uses [MapLibre GL](https://maplibre.org/) with [OpenFreeMap](https://openfreemap.org/) vector tiles. MapLibre’s worker and `public/` files (`locations.json`, `us-states.json`, favicon) are resolved under that base path.

Geocoding uses Zippopotam.us (US ZIP codes) with OpenStreetMap Nominatim / Photon as fallback. Please keep OSM attribution visible (MapLibre adds it).

## Product behavior

- One job on load: a centered ZIP / city / address search (Google “find a place near me,” not a dashboard)
- Map and results appear **after** search or **Use my location**
- **Use my location**, with a clear fallback if permission is denied or the page is not HTTPS
- Results as a simple list with distance; pins synced to the list; state click-to-zoom at national zoom
- Each place: name, distance (mi), address (Google Maps link), hours, phone and/or email
- Empty / no-nearby state shows the closest qualified try-spots
- Mobile-first layout; `prefers-reduced-motion` disables fly/fit animation and the results reveal

Brand tokens match [shiftwave.co](https://shiftwave.co/) for merge — Montserrat 500/600, ink `#3C3B3B`, paper `#F7F4EF` / white, black Search CTA. Brand Guide orange `#E43A00` and purple `#3911AC` are pin/highlight accents only. The Fraunces listening-surface stack is Stethoscope/Wave only. See [`DESIGN.md`](DESIGN.md).

## Data module

Runtime file: [`public/locations.json`](public/locations.json) (fallback snapshot).

The loader lives in `src/data/`. It **prefers** `VITE_LOCATIONS_URL` when set, then falls back to the committed JSON if the remote feed fails. It accepts **JSON or CSV**. Field names from the sheet (`address` instead of `street`, full state names, free-form categories) are mapped in `parse.ts`. Street lines and hours are **not invented** — empty street stays empty; missing hours display as **Hours unavailable** (never “Call for hours”). Schema for the website team: [`INTEGRATION.md`](INTEGRATION.md).

Public hours/phones were enriched from official sites and directories (42/63 hours, 57/63 phones). Names still unresolved for hours (and some phones): Intentional Wellness Institute, Jill Sumiyasu, Keller Street Co-Work, Lit From Within, The Portal, Transformations, Maureen Whatley, Lovetree Alchemy, Kansas City Neuroplasticity Institute, Chris Collins, The Menopause Method, Disney Family Therapy, Dr. Karen Wright, Dr. Tim Patel, Halo Mental Health, Dr. Frank Lipman, Libertas Cryo, Dr. Anette Scott, Lucia Gadney, Sonder Psychotherapy, Heike Tabatabai.

### Refresh later

Standing process: Shopify tag `sw-business` → `ops/staging.json` → human qualify → publish approved + consenting rows. Playbook: [`OPS.md`](OPS.md). Do not treat Dani hand-editing this JSON as the long-term path.

Until the staging queue holds the full approved set, you can still export the partner sheet and replace `public/locations.json`, or set `VITE_LOCATIONS_URL` at build time to a CORS-enabled feed. Keep the qualification columns either way (do not publish unqualified buyers).

```bash
# Shopify Admin → Orders → tag sw-business → Export CSV
node scripts/stage-from-shopify-csv.mjs path/to/orders.csv
# prints how many rows need review; writes ops/staging.json; does not touch the public list

node scripts/publish-approved.mjs --write
# copies ONLY status=approved AND consent=true into public/locations.json
```

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
| `hours` | recommended | Single human-readable string. Use `Hours unavailable` when unknown. |
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

**Public map filter:** a row is shown only when `qualified`, `public_facing`, `demo_consent`, and `walk_in_ok` are all true. That is Colin’s rule — Shopify `sw-business` is intake only, never auto-publish. `sw-finder-exclude` is a hard no. Team playbook: [`OPS.md`](OPS.md).

### Example CSV header

```csv
id,name,street,city,state,zip,lat,lng,phone,email,hours,website,category,region,qualified,public_facing,demo_consent,walk_in_ok,notes
```

## Out of scope (this app)

- Shopify Admin API / auto-adding purchasers (CSV tag → staging → human gate is in [`OPS.md`](OPS.md))
- Live HubSpot sync (HubSpot holds consent/qualification when ready; reviewers set those fields on the staging row until then)
- Auth, booking
- Ambassador network
- Prospect heat maps
- Storepoint (point `VITE_LOCATIONS_URL` at any CORS JSON later)
- Live Google Sheet write-back (snapshot refresh is a file replace)

## Stack

Vite, React, TypeScript, Tailwind CSS v4, MapLibre GL JS, OpenFreeMap.
