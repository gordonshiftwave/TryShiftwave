# Where Can I Try Shiftwave?

A standalone, mobile-first location finder for **qualified** Shiftwave demo hosts — studios, clinics, and gyms where someone can try pulsed pressure + guided breathwork in person.

This is the public map MVP (before [shiftwave.co](https://shiftwave.co) integration). It answers the inbound question the team currently routes by texting Dani: *where can I try it?*

> Demo data ships in `public/locations.json`. Live Google Sheet wiring is a one-env-var swap, documented below.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build     # static files in dist/
npm run preview   # serve the production build
npm test          # distance, CSV, and filter tests
```

No map API key is required. The map uses [MapLibre](https://maplibre.org/) with [OpenFreeMap](https://openfreemap.org/) vector tiles (CARTO raster fallback). ZIP lookup uses Zippopotam / US Census / Nominatim.

## What it does

- Search by ZIP, city, or address
- **Use my location** (browser geolocation; HTTPS required in most browsers)
- Interactive US map with pins, synced to the list (hover + select)
- Optional **browse by state** zoom
- Each place: name, distance in miles, address (Google Maps link), hours, phone and/or email
- Helpful empty state with “widen radius” and “show nearest nationwide”
- Clear **Demo data** banner until the live sheet is connected
- Public map shows **qualified** locations only

Out of scope (intentionally): Shopify sync, HubSpot, auth, booking, ambassadors, heat maps, and embedding into shiftwave.co.

## Brand

Stethoscope Design tokens — light, airy, calm-confident. Not the current orange/purple Shopify chrome.

| Token | Hex | Use |
| --- | --- | --- |
| paper | `#f4efe6` | Page |
| cream | `#fbf8f2` | Cards, inputs, map frame |
| sand | `#efe7d9` | Wash / hover |
| line | `#ddd4c6` | Hairlines |
| ink / ink-soft / ink-faint | `#1f1c18` / `#5a534b` / `#675f57` | Type |
| sky, mist, sage | `#b7d3e3` `#c8d8d2` `#9fbe99` | Map water, parks, distance pills |
| rise-deep, focus | `#3d6d62` `#3e6574` | Primary actions, pins, links |
| fall-deep, lavender, coral, slate | `#5c5370` `#b8a7c8` `#e4a894` `#7a8496` | Accents only |

Type: **Fraunces** (display) + **Source Sans 3** (body). Cards are ~24px radius on cream with a hairline and a soft inset. Motion is short and honors `prefers-reduced-motion`.

## Data shape

`public/locations.json` matches the columns the live sheet is expected to use:

| Column | Required | Notes |
| --- | --- | --- |
| `name` | yes | Public host name |
| `address` | yes | Street |
| `city` | yes | |
| `state` | yes | Two-letter US code |
| `zip` | yes | |
| `phone` | no | Shown if present |
| `email` | no | Shown if present |
| `hours` | no | Free text (e.g. `Mon–Fri 7am–7pm`) |
| `lat` | yes | Number |
| `lng` | yes | Number |
| `qualified` | yes for mixed sheets | Public map includes only truthy values: `true`, `yes`, `1`, `qualified`, `public`, `demo`, `approved` |
| `category` | no | Wellness studio, clinic, gym, … |
| `id` | no | Stable slug; generated from name + zip if omitted |
| `notes` | no | Internal; not shown on the map |

Rows missing coordinates are skipped. Unqualified rows stay in the file (so qualification is visible in git) but never render.

Example clusters in the demo file follow known coverage: Bay Area, Southern California, Montecito / Santa Barbara, Las Vegas, Florida, Central New Jersey, Milwaukee, Chicago, Nashville, Boulder / Denver, plus a handful of other major-city hosts. Two unqualified rows (private / event-only) demonstrate the flag.

## Swap in the live Google Sheet

1. Confirm every public row: publicly facing, **consents to demos**, good with walk-ins. Not every Shopify “business” purchase belongs on this map.
2. Use the columns above (header names are flexible — `Latitude` / `Zip Code` / `Qualification Flag` all work).
3. In Google Sheets: **File → Share → Publish to web → Comma-separated values (.csv)**.
4. Copy the published CSV URL into `.env`:

```bash
cp .env.example .env
```

```bash
VITE_LOCATIONS_CSV_URL=https://docs.google.com/spreadsheets/d/e/XXXX/pub?output=csv
```

5. Restart `npm run dev`. The app fetches the sheet first; if the fetch fails it falls back to `locations.json` and keeps the demo banner.

If the sheet **is already the qualified list** and has no `qualified` column, every valid row is shown. If the column exists, only truthy flags are mapped.

To keep using a static snapshot instead of a live fetch, export CSV → JSON (same keys) and replace `public/locations.json`.

## Deploy

`npm run build` emits a static site in `dist/`. Host on GitHub Pages, Netlify, Cloudflare Pages, or any static bucket. Set `VITE_LOCATIONS_CSV_URL` in the host’s environment if the live sheet should load in production.

Geolocation and some browsers’ location prompts need HTTPS.

## Stack

Vite, React, TypeScript, Tailwind CSS v4, MapLibre GL. No paid map key.
