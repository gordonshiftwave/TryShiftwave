# Candice handoff — Find Near You on the existing Try page

Reviewed: branch `main`, commit `664f08db80f6d342a2d334fda07710b61a159706` (2026-09-17).  
Live GitHub Pages at that review matched this commit: `locations.json` byte-for-byte (sha256 `a20fb9f852218c4b46d96c4994f348bae0c03f38f10f53cbb21cfd8a44144edf`), `last-modified` Thu, 17 Sep 2026 12:58:02 GMT, 63 locations, `source: live_snapshot_enriched`.  
This branch fixes the launch blockers found on that commit. The live URL stays on `664f08d` until this change is merged to `main`.

## Ownership

**Candice owns the website.** That includes the Shopify page on shiftwave.co, the embed, any Cloudflare or other host, DNS, deploys, and ongoing site maintenance.

**Gordon is not the website operator.** He does not need to click Cloudflare, DNS, GitHub Pages, Workers, or routine redeploys. This repo unblocks her. Remaining site work is hers to execute.

Qualification of who may be listed is a **Review owner** role for Colin / sales. Do not assign that role to Dani by default.

## 1. Readiness

The finder can be embedded on the existing Try Shiftwave page. Storepoint is not required. HubSpot is not connected; consent stays on the staging row until it is.

Code blockers B1–B8 were true on `664f08d` and are fixed in this branch (section 3). They are live only after merge to `main`, because GitHub Actions deploys `main`.

Candice can place the iframe herself. She does not need a hosting migration to launch. Forms that already sit on the Try page stay below the iframe.

## 2. Verified architecture and data flow

Implemented path:

```
Shopify order tag
  sw-business (intake) or sw-finder-exclude (hard no)
        ↓
scripts/stage-from-shopify-api.mjs   (or CSV fallback)
        ↓
ops/staging.json   (gitignored; may hold customer data — do not commit)
        ↓
Review owner sets status, consent, qualified, public_facing, visit_model, coordinates
        ↓
scripts/publish-approved.mjs --write
        ↓
public/locations.json
        ↓
GitHub Actions on main → https://gordonshiftwave.github.io/TryShiftwave/
        ↓
Browser loader (src/data/load.ts) → display gate (src/data/parse.ts)
```

| Step | State | Evidence |
| --- | --- | --- |
| Shopify tag intake | Implemented | `scripts/lib/shopify-staging.mjs` (`sw-business`, `sw-finder-exclude`). API staging: `scripts/stage-from-shopify-api.mjs`. CSV fallback: `scripts/stage-from-shopify-csv.mjs`. |
| Auto-publish from a purchase | Not implemented (by design) | New rows start `pending_review`, `consent: false`, `visit_model: "none"`. |
| Human qualification | Manual edit of `ops/staging.json` | No review UI. Schema: `ops/shopify-staging.schema.json`. |
| Publish gate | Implemented | `isPublishable` / `planPublicFeed` in `scripts/lib/shopify-staging.mjs`. |
| Hosting of the preview | Implemented | `.github/workflows/deploy-pages.yml` builds `dist/` and deploys GitHub Pages. |
| Browser display | Implemented | `src/data/load.ts`, `src/data/parse.ts`, `src/App.tsx`. |
| HubSpot consent sync | Not implemented | `hubspot_id` is an empty string field. No HubSpot client in this repo. |
| Storepoint | Not implemented | Out of scope. |

Authoritative public record today: `public/locations.json` in this repo (63 historical sheet pins). It is not produced by the Shopify gate yet (`source` is `live_snapshot_enriched`). Staging is authoritative for new Shopify-tagged partners once a reviewer qualifies them.

Repeat orders merge by staging id and keep human review fields (`mergeStagingRows`). An exclude tag still forces `status: "excluded"`. Renames that change the slug create a new id; the old public id stays until it is withdrawn by id or `--replace` is used when staging is the full catalog. Partners with no Shopify order are not ingested by the tag scripts; they remain historical pins, or someone adds a staging row with the same `id`.

What this review could not establish: who currently holds the Dev Dashboard client secret, whether any live `ops/staging.json` exists outside git, the live Shopify page URL, or the DOM ids of the forms on that page.

## 3. Earlier findings (B1–B8)

Confirmed on `664f08d`. Fixed in this branch.

| # | On `664f08d` | Status | Evidence in this branch |
| --- | --- | --- | --- |
| B1 | Default publish upserted approved rows and left withdrawn ids in the public file. | **Fixed** | `reconcilePublicLocations` / `planPublicFeed` remove staging ids that no longer pass. `scripts/publish-approved.mjs` calls `planPublicFeed`. `--replace` drops historical pins not in the approved set. |
| B2 | Missing `qualified` / `public_facing` / `demo_consent` defaulted to true. Missing `visit_model` became `walk_in`. | **Fixed** | `parseVisitModel` returns `none` when the value is missing (`src/data/parse.ts`). `parseRow` uses `explicitBool` (missing → false) and does not list that row. |
| B3 | Publish did not require `qualified` or `public_facing`. The browser did, but missing browser flags defaulted to true, so the gates disagreed. | **Fixed** | `isPublishable` requires `qualified === true` and `public_facing === true` plus the same visit model and coordinate rules the browser uses. `isPublicQualified` requires explicit true flags and `walk_in` or `appointment`. |
| B4 | `Number(null)` and `Number('')` are `0`, so blank coordinates became `0,0` and could pass. | **Fixed** | `parseCoordinate` / `validCoordinatePair` reject null, blank, non-numeric, and `0,0`. Browser `parseRow` returns null for the same cases. |
| B5 | Shopify order notes were copied into public JSON `notes`. | **Fixed** | Public allowlist in `sanitizePublicLocation` omits `notes`, order ids, and review fields. `toPublicLocation` does not copy staging notes. The browser sets `notes` to `''`. |
| B6 | A failed remote feed fell back to the bundled snapshot and could restore a withdrawn listing. | **Fixed** | `loadLocationsFrom` tries one URL. `fallbackAfterFailure` returns null. Failure yields `status: "unavailable"` and an empty list. |
| B7 | Empty or fully invalid feeds produced no operational signal. | **Fixed** | Feed status `empty` / `invalid` / `unavailable` is logged with an `OPS:` line (counts only, no row content) and shown in the UI. Publish prints `OPS ALERT` on stderr for zero public rows or coordinate rejects. |
| B8 | Deploy workflow built the app and did not run ops tests. | **Fixed** | `.github/workflows/deploy-pages.yml` runs `npm test` before build. `.github/workflows/ci.yml` runs tests and build on pull requests and on `main`. |

Acceptance tests: `scripts/lib/shopify-staging.test.mjs` (withdraw, exclude, notes, coordinates, qualification) and `scripts/lib/browser-gate.test.mjs` (parser, remote failure, empty feed, invalid feed).

## 4. Proposed Shopify integration

Put the finder **on the existing Try Shiftwave page**, above the forms that are already there. Do not remove those forms. Do not wait for a new page or for Storepoint.

Recommended launch is an **iframe of the existing app**. Candice pastes it in the theme. Nobody migrates hosting first.

```html
<div id="try-shiftwave-finder">
  <iframe
    id="try-shiftwave"
    src="https://gordonshiftwave.github.io/TryShiftwave/?embed=1"
    title="Find a place to try Shiftwave"
    style="width:100%;height:720px;min-height:640px;border:0;display:block;"
    allow="geolocation"
    loading="eager"
    referrerpolicy="strict-origin-when-cross-origin"
  ></iframe>
</div>
<!-- Keep the current Try page forms in the sections below this block. -->
```

Stable alias (also embed mode): `https://gordonshiftwave.github.io/TryShiftwave/embed.html`.

Height is **720px**, clamped between **640** and **880** (`EMBED_FRAME_HEIGHT` in `src/embed.ts`). Do not use `100vh`. The page must still scroll to the forms. The iframe scrolls its own results.

Optional resize listener. Skip it if the fixed height is enough. Clamp. Check origin.

```html
<script>
  window.addEventListener('message', (event) => {
    if (event.origin !== 'https://gordonshiftwave.github.io') return
    var data = event.data
    if (!data || data.source !== 'try-shiftwave' || data.type !== 'resize') return
    var frame = document.getElementById('try-shiftwave')
    if (!frame || typeof data.height !== 'number') return
    var min = 640
    var max = 880
    frame.style.height = Math.min(max, Math.max(min, data.height)) + 'px'
  })
</script>
```

**Geolocation.** “Use my location” needs `allow="geolocation"` and HTTPS. If the theme sets a Permissions-Policy, it must allow geolocation for `https://gordonshiftwave.github.io`. The app already explains what to do when permission is denied (`src/App.tsx`).

**Microphone.** Voice search is optional and off for launch. Leave `microphone` out of `allow`. The mic control fails closed to typed search (`src/speech/usePushToTalk.ts`). Add `microphone` later only if Candice wants voice on.

**Loading / failure / empty.** The iframe shows its own notice and tells the visitor to use the request form below the finder. It does not know the form’s id. Do not hide the forms when the list is empty.

**Analytics.** Parent-page pixels keep working for the Shopify page. Searches inside the iframe are cross-origin and are not automatically Shopify events. No tracking IDs were added here.

**Build variables** (only if Candice hosts the files herself; the iframe path needs no rebuild):

| Variable | iframe of GitHub Pages | Self-hosted `dist/` |
| --- | --- | --- |
| `VITE_BASE` | already `/TryShiftwave/` | `./` when the files sit in a theme folder, or `/` at a host root |
| `VITE_EMBED` | not required (`?embed=1`) | `true` to bake embed layout |
| `VITE_LOCATIONS_URL` | unset (bundled `locations.json`) | leave unset and ship `public/locations.json` inside `dist/`, unless she hosts the JSON at her own HTTPS URL |

Feed URL on the current preview: `https://gordonshiftwave.github.io/TryShiftwave/locations.json`.  
On 2026-09-30 that response sent `Access-Control-Allow-Origin: *`. A browser on shiftwave.co can fetch it. A failed remote URL does **not** fall back to a snapshot baked into a different build.

### Keys / access Candice needs

She can launch the embed without Gordon in the middle. Collect these herself:

1. **Shopify admin** on the shiftwave.co theme, enough to edit the existing Try page and leave the forms in place.
2. **GitHub write** on `gordonshiftwave/TryShiftwave`, or a **fork she controls**. Write access is how the preview URL updates after `main` changes. Ask the repo owner once for access, or fork the public repo and point the iframe at a host she deploys. After that, Gordon is not in the deploy path.
3. **Node.js 22+** and this repo, only if she builds or publishes the feed (`npm ci`, `npm test`, `npm run build`).
4. **Shopify Dev Dashboard client credentials**, only for API staging (not for the embed). Names: `SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, optional `SHOPIFY_API_VERSION`. Whoever holds the secret shares it once into her local `.env` (gitignored). Do not send it in chat or commit it. CSV export works without these secrets.
5. **No Cloudflare account, DNS change, or Workers project** for the recommended iframe.
6. **No Google Maps or Mapbox key.** The map is MapLibre + OpenFreeMap.

### If she later hosts it herself (she executes this)

Prefer the iframe until she wants the files off GitHub Pages. Migration is optional and is hers:

1. Fork or clone this repo on a machine she controls.
2. `npm ci`
3. `npm test`
4. `VITE_BASE=./ VITE_EMBED=true npm run build` (use `VITE_BASE=/` if the site is served at the host root).
5. Upload `dist/` to a host **she** controls (Shopify files, or her Cloudflare static site). Output directory is `dist`.
6. If she uses a new hostname, she creates the DNS record in the zone she controls.
7. Change the iframe `src` to her URL with `?embed=1`, and change the `event.origin` check to that origin.
8. Confirm the forms below the iframe still submit. Then stop using the github.io URL.

Do not ask Gordon to create the Cloudflare project or the DNS record.

### Evidence Candice must copy from the live Try page

This repo does not contain shiftwave.co. Do not invent form ids. She (or her AI, looking at the live theme) supplies:

- The exact public URL of the existing Try Shiftwave page.
- The theme template and section where the iframe should go, and confirmation the current forms render **under** that section.
- For each form that must stay: tag name, `id`, `name`, `action`, `method`, and whether it is a Shopify contact form, an app block, or custom HTML. Quote them from the live DOM.
- Any success behavior (inline message vs redirect) so a tall iframe cannot cover it.
- Analytics snippets already on that page (do not remove them).
- Whether the storefront sends `Content-Security-Policy` or `Permissions-Policy`, and the geolocation allowance for `https://gordonshiftwave.github.io`.

Until those are copied from the live page, embed the iframe and do not rewrite the forms.

## 5. Prioritized changes

**Done in this branch (launch blockers):** B1–B8 above.

**Polish, not blocking launch:** historical pins that are not in the staging queue stay on the map until their id is withdrawn or someone runs `--replace` with a complete staging catalog. The committed snapshot still has a non-sensitive per-row `notes` string from the old sheet import; new publishes omit `notes`. The browser does not keep feed notes in memory.

**Later:** Storepoint, live HubSpot sync, booking, voice search, in-iframe analytics events.

## 6. Tests

Ran on this branch:

- `npm test` — 33 passing (`node --test scripts/lib/*.test.mjs`), including publish reconcile, notes, coordinates, qualification, browser fail-closed parser, and remote-feed failure.
- `npx tsc -b` — pass.

CI: pull requests run `.github/workflows/ci.yml` (`npm test`, `npm run build`). Push to `main` also runs tests inside `.github/workflows/deploy-pages.yml` before deploy.

Still for Candice on the live theme, after she pastes the iframe:

- Search by ZIP, city, and “Use my location”.
- Appointment pin shows “By appointment — call to schedule”.
- Empty area shows the closest pins, and the forms below the iframe still submit.
- Mobile width: the page scrolls to the forms; the iframe does not cover them.

## 7. Human decisions only

1. **Candice (website).** Launch by iframing the existing app (recommended), or host `dist/` on infrastructure she controls. Gordon does not choose and does not click the host.
2. **Colin / sales qualification owner.** Name the Review owner for this cycle. Not Dani by default. Until HubSpot is connected, that role sets `consent`, `qualified`, `public_facing`, and `visit_model` on the staging row.
3. **Candice (website).** Leave microphone permission off at launch (recommended). Turn voice search on later only if she wants it. She also pastes the live form identifiers from the Try page; this repo does not have them.

## 8. AI-to-AI handoff

Source of truth for behavior: this file, `OPS-MAINTENANCE.md`, `OPS.md`, `INTEGRATION.md`.

Preview (updates when `main` deploys):

- App: `https://gordonshiftwave.github.io/TryShiftwave/?embed=1`
- Feed: `https://gordonshiftwave.github.io/TryShiftwave/locations.json`

Embed: the iframe in section 4. Resize clamp 640–880, preferred 720. `allow="geolocation"` only.

Publish gate (staging → public JSON): `status === "approved"` and `consent === true` and `qualified === true` and `public_facing === true` and `visit_model` in `walk_in` | `appointment` and `validCoordinatePair`. Reconcile removes failing staging ids. Do not copy `notes`.

Display gate: explicit booleans true, visit model `walk_in` or `appointment`, finite coordinates that are not the pair `0,0`. Missing values do not list.

Commands:

```bash
npm ci
npm test
npm run build
node scripts/stage-from-shopify-api.mjs
node scripts/publish-approved.mjs --write
```

Outstanding inputs only Candice can read off the live Shopify page: page URL, section order, and the real form `id` / `name` / `action` values. Do not guess them.

Gordon unblocked this repo. Remaining site work is Candice’s to execute.
