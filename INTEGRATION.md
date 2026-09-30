# Integrating the Try Shiftwave finder on shiftwave.co

This app is a **static** search + MapLibre map. Host the built files, or iframe a hosted copy. There is **no Google Maps API key**, **no Storepoint**, and no backend of our own. Partner pins come from JSON (or CSV) that you control.

Only **approved** public try-spots belong in the feed. The UI still filters to rows marked qualified, public-facing, and demo-consenting, with `visit_model` of `walk_in` or `appointment` (`none` is never listed) — but the source of truth is the list you publish.

**Location intake is an ops pipeline, not a sheet edit.** Tag Shopify orders `sw-business` (queue only, never auto-publish) or `sw-finder-exclude` (hard no), stage with `scripts/stage-from-shopify-api.mjs` when Dev Dashboard client credentials are set (CSV `scripts/stage-from-shopify-csv.mjs` is the fallback), have the Review owner (role) qualify the row — including `visit_model` — then publish rows that pass the full gate (`approved`, consent, qualified, public-facing, listable `visit_model`, valid coordinates) to `public/locations.json` / `VITE_LOCATIONS_URL`. Shopify is the purchase signal; HubSpot holds consent/qualification when that object is ready. Team playbook: [`OPS.md`](OPS.md). Schema: [`ops/shopify-staging.schema.json`](ops/shopify-staging.schema.json).

## 1. Choose a host path (`VITE_BASE`)

Vite `base` is the public URL prefix for JS/CSS/`locations.json`. Set it at **build time**. GitHub Pages keeps working if you leave it unset (build defaults to `/TryShiftwave/`).

| Where it will live | `VITE_BASE` |
| --- | --- |
| Site root (`https://shiftwave.co/`) | `/` |
| Dedicated Find page folder | `/pages/find-shiftwave/` |
| GitHub Pages (this repo) | `/TryShiftwave/` (default on `npm run build`) |
| Drop `dist/` into another CDN/theme | `./` (relative asset URLs) |

```bash
# Dedicated page on shiftwave.co
VITE_BASE=/pages/find-shiftwave/ npm run build

# Root of a custom domain / subdomain
VITE_BASE=/ npm run build
```

`npm run dev` always serves at `/` so local work stays at [http://localhost:5173](http://localhost:5173).

## 2. Point at locations JSON (`VITE_LOCATIONS_URL`)

The finder loads `VITE_LOCATIONS_URL` when that variable is set at build time. If the remote feed fails, is empty, or has no rows that pass the gate, the map stays empty and shows a notice. It does **not** fall back to the bundled snapshot (that would restore withdrawn listings). When `VITE_LOCATIONS_URL` is unset, the app loads the snapshot shipped in `public/locations.json`.

```bash
VITE_LOCATIONS_URL=https://cdn.shiftwave.co/find/locations.json npm run build
```

Requirements:

- HTTPS URL the **browser** can `fetch` (CORS: `Access-Control-Allow-Origin` must allow the page origin, or `*`).
- JSON matching the schema below (CSV also works).
- Do **not** use Google Sheets `/export?format=csv` in the browser — that origin usually blocks CORS.

Until a managed API exists, publish from the staging queue (`scripts/publish-approved.mjs`) into `public/locations.json` or host that JSON at your URL. Storepoint is intentionally not wired up. See [`OPS.md`](OPS.md).

## 3. Embed on the site

### Option A — iframe (Shopify section / page)

Use embed mode so the finder fills the frame and hides standalone-app chrome (the “Live partner list” banner and extra map meta).

**Live GitHub Pages (works today):**

```html
<iframe
  id="try-shiftwave"
  src="https://gordonshiftwave.github.io/TryShiftwave/?embed=1"
  title="Find a place to try Shiftwave"
  style="width:100%;height:720px;min-height:640px;border:0;display:block;"
  allow="geolocation"
  loading="eager"
></iframe>
```

Do not set the iframe to `100vh`. A fixed height in the 640–880px range leaves the existing forms below it scrollable. Voice search is optional; omit `microphone` until you want it. `geolocation` is what “Use my location” needs.

Stable alias that forces embed: `.../TryShiftwave/embed.html`.

**After you host the build on shiftwave.co:**

```html
<iframe
  id="try-shiftwave"
  src="https://shiftwave.co/pages/find-shiftwave/?embed=1"
  title="Find a place to try Shiftwave"
  style="width:100%;height:720px;min-height:640px;border:0;display:block;"
  allow="geolocation"
  loading="eager"
></iframe>
```

`allow` matters: **Use my location** needs `geolocation`; the search mic needs `microphone`. The parent page should not set a `Permissions-Policy` that blocks those features.

Optional: the iframe posts its document height. Clamp it. Do not let the frame grow to full viewport height or the forms below disappear.

```js
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://gordonshiftwave.github.io') return
  const data = event.data
  if (!data || data.source !== 'try-shiftwave' || data.type !== 'resize') return
  const frame = document.getElementById('try-shiftwave')
  if (!frame || typeof data.height !== 'number') return
  const min = 640
  const max = 880
  frame.style.height = `${Math.min(max, Math.max(min, data.height))}px`
})
```

If you host the build yourself, change `event.origin` to that host. The fixed 720px height is enough if you skip this script.

### Option B — dedicated Find / Try page (no iframe)

Build with the correct `VITE_BASE` and publish `dist/` as that page (or a subdomain). Bake embed layout so you do not need the query string:

```bash
VITE_BASE=/pages/find-shiftwave/ VITE_EMBED=true npm run build
```

Serve the contents of `dist/` at that path. This is a normal static site (`index.html` + `assets/`).

Embed mode is also on when:

- the URL has `?embed=1` (`true` / `yes` / bare `?embed` also work)
- the path ends with `/embed` or `/embed.html`
- the page is inside an iframe

Search-first UX, Reset taglines, wave mark, voice mic, and the MapLibre map stay as they are.

## 4. Environment variables

| Variable | Required | When | What it does |
| --- | --- | --- | --- |
| `VITE_BASE` | no | build | Public asset prefix. Default: `/` in dev, `/TryShiftwave/` in production builds. |
| `VITE_LOCATIONS_URL` | no | build | Remote JSON/CSV feed. If this fetch fails, the list stays empty (no snapshot fallback). Unset = bundled `locations.json`. |
| `VITE_EMBED` | no | build | `true` / `1` bakes full-bleed embed layout. |

Copy `.env.example` to `.env` for local overrides. Rebuild after changing any `VITE_*` value. Shopify Admin staging credentials (`SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`) are ops-only — see [`OPS.md`](OPS.md); do not paste them into chat.

## 5. Locations JSON schema

Publish **only approved try-spots**. The client drops rows that fail the gate. Required explicit values: `qualified`, `public_facing`, and `demo_consent` true, and `visit_model` of `walk_in` or `appointment`. Missing flags are **not** treated as true, and a missing `visit_model` is **not** treated as walk-in. Blank or null coordinates are dropped (they are not coerced to `0,0`). Appointment rows are listed with the flag. `notes` are not public.

JSON may be either:

```json
{ "locations": [ { "...": "row" } ] }
```

or a bare array `[ { "...": "row" } ]`. `{ "rows": [ ... ] }` is also accepted.

### Row fields

| Field | Required | Notes |
| --- | --- | --- |
| `id` | unique string | Stable slug; generated from name if blank |
| `name` | yes | Public business name |
| `street` | if known | Street line. Leave blank rather than inventing. |
| `city` | preferred | May be missing for a few rows |
| `state` | yes | Full name or two-letter USPS code (`California` or `CA`) |
| `zip` | preferred | 5-digit ZIP |
| `lat` | yes | WGS84 latitude |
| `lng` | yes | WGS84 longitude |
| `phone` | if no email | Display + `tel:` link |
| `email` | if no phone | Display + `mailto:` link |
| `hours` | recommended | Single human-readable string. Unknown → `Hours unavailable` (never “Call for hours”). |
| `website` | optional | Reserved |
| `category` | optional | List label (e.g. `Longevity / Wellness Center`) |
| `region` | optional | Grouping label |
| `qualified` | yes | `true` / `TRUE` / `yes` |
| `public_facing` | yes | Public business, not home use |
| `demo_consent` | yes | Partner agrees to receive demo visitors |
| `walk_in_ok` | compat | True when `visit_model` is `walk_in`. Do not use false as a hide. |
| `visit_model` | yes | `walk_in` \| `appointment` \| `none`. `none` is never listed. Appointment publishes with this flag (finder: “By appointment — call to schedule”). Missing or unknown values do not list. |
| `notes` | omit | Staging/internal only. The publisher does not copy this field. |

Aliases such as `latitude`, `address`, `zip_code`, and `walk_in_appropriate` are accepted (see `src/data/parse.ts`). CSV with the same headers works if you would rather export a sheet.

Minimal example:

```json
{
  "locations": [
    {
      "id": "example-wellness-austin",
      "name": "Example Wellness",
      "street": "123 Main St",
      "city": "Austin",
      "state": "TX",
      "zip": "78701",
      "lat": 30.2672,
      "lng": -97.7431,
      "phone": "(512) 555-0100",
      "email": "",
      "hours": "Mon–Fri 9am–5pm",
      "website": "https://example.com",
      "category": "Wellness",
      "region": "Austin",
      "qualified": true,
      "public_facing": true,
      "demo_consent": true,
      "walk_in_ok": true,
      "visit_model": "walk_in"
    }
  ]
}
```

## 6. MapLibre, type, brand

- **Map:** [MapLibre GL](https://maplibre.org/) + [OpenFreeMap](https://openfreemap.org/) Positron tiles, recolored to paper. **No Google/Mapbox key.** Keep OSM attribution visible (MapLibre adds it).
- **Type:** Montserrat 500 / 600 / 700 from Google Fonts in `index.html`. Matches [shiftwave.co](https://shiftwave.co/). Do not introduce Fraunces here.
- **Tokens:** ink `#3C3B3B`, paper `#F7F4EF` / `#F7F5F2` / white, Search CTA `#111111`, Energy `#E43A00` (pins / wave), Calm `#3911AC` (selected). Full notes in `DESIGN.md`.

If the theme already loads Montserrat, a second Google Fonts request from the iframe is harmless.

## 7. Shopify notes

- **Orders / intake:** tag `sw-business` or `sw-finder-exclude`. That is not a listing. Preferred stage: `scripts/stage-from-shopify-api.mjs` (Dev Dashboard client credentials). CSV remains fallback. See [`OPS.md`](OPS.md).
- A custom page or section with the iframe (Option A) is the lowest-friction path to *display* the finder.
- To serve files from the theme instead, build with `VITE_BASE=./` (or the theme asset path) and upload `dist/`. Shopify CDN paths change; iframe or a stable CDN URL is usually easier.
- Preview the Find page on mobile. The map uses cooperative gestures so page scroll is not trapped.

## Out of scope (still)

Shopify Admin API **auto-publish**, live HubSpot sync, booking, ambassadors, Storepoint, and live Google Sheet write-back. API **staging** (tagged orders → `ops/staging.json`) is the preferred ops path when credentials are set; it still requires a human Review owner. Refresh the published JSON (or `VITE_LOCATIONS_URL`) from the staging queue when the partner list changes.
