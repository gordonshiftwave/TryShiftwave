# Try-spot operations (email this)

**Public map = approved rows only.** That is Colin’s rule. A Shopify purchase is a *signal*, not a listing.

Intake and review are a **system + named roles**, not a person: Shopify tags → `ops/staging.json` → Review owner (role) → published JSON. Do **not** assign review to Dani (or any one individual) by default. Do not hand-edit `public/locations.json` as the standing process.

## Tags (Shopify Admin → order)

| Tag | Meaning |
| --- | --- |
| `sw-business` | **Intake only.** Queue for review. Never auto-publish. |
| `sw-finder-exclude` | **Hard no.** Home use, private, unsafe, or “do not list.” Never maps. |

Ops/Sales apply these tags. If both are present, exclude wins. Scripts also accept separator variants (`sw_business`, `sw_finder_exclude`) and normalize them to these names.

## Flow

```
Shopify tag  →  Staging queue  →  Human qualify  →  Public feed
sw-business     ops/staging.json   Review owner (role)  public/locations.json
                                                   or VITE_LOCATIONS_URL
```

1. Tag the order in Shopify (`sw-business` or `sw-finder-exclude`).
2. **Stage (preferred when credentials are set):** `node scripts/stage-from-shopify-api.mjs`  
   Uses Dev Dashboard **client credentials** (`SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`) — not a legacy `shpat_` custom-app token. Token is requested at runtime, cached in-process, and refreshed before it expires (~24h). Scope needed today: `read_orders`.  
   Set the vars in your environment or a local `.env` (gitignored). **Do not paste secrets or tokens into chat.**  
   `--dry-run` / `--stdout` prints staging JSON without writing. The script does **not** touch `public/locations.json` unless you pass `--publish-approved`.
3. **CSV fallback** (no API creds, history beyond what `read_orders` returns, or air-gapped): Admin → Orders → filter by tag `sw-business` → Export (see `ops/sample-shopify-export.csv` for headers) → `node scripts/stage-from-shopify-csv.mjs path/to/export.csv`
4. Open `ops/staging.json`. The **Review owner** (named role on the rota — Ops, Sales, or whoever owns review that week; never a default named person) sets:
   - `status`: `approved` | `rejected` | `excluded` | `pending_review`
   - `consent`: `true` only if the partner agrees to public demo visitors
   - Colin flags: `qualified`, `public_facing`
   - `visit_model`: `walk_in` | `appointment` | `none`  
     `walk_in` = listed. `appointment` = listed **with** the flag (finder shows “By appointment — call to schedule”). `none` = do not list / excluded. Appointment is **not** a hide. Shopify does not invent `appointment`.
   - `lat` / `lng` (required to pin; Shopify does not ship coordinates)
5. Publish: `node scripts/publish-approved.mjs --write`  
   Copies **only** rows with `status=approved` **and** `consent=true` **and** `visit_model` ≠ `none` into `public/locations.json` (upsert by `id`). Appointment rows publish with `visit_model=appointment`. Use `--replace` only when staging is the full approved set. Use `--stdout` to print JSON without writing. Pending, rejected, excluded, `visit_model=none`, and “business tag but no consent” never go out.
6. Website reads the published JSON. Finder UI does not talk to Shopify.

Re-running API or CSV import **keeps** human review fields. The exclude tag still forces `status=excluded`. Purchase ≠ publish.

`--publish-approved` on a stage script is the same gate. Without that flag, stage scripts will not touch the public list.

## Auth env (API staging)

| Variable | Required | What it is |
| --- | --- | --- |
| `SHOPIFY_SHOP` | yes | Store subdomain only (`slow-wave-0f67`), not the full admin URL |
| `SHOPIFY_CLIENT_ID` | yes | Dev Dashboard app client id |
| `SHOPIFY_CLIENT_SECRET` | yes | Dev Dashboard app client secret |
| `SHOPIFY_API_VERSION` | no | GraphQL Admin version (default `2026-07`) |

Copy `.env.example` → `.env` for local values. Never commit `.env`, tokens, or live `ops/staging.json` with customer PII.

## Systems

| System | Job |
| --- | --- |
| **Shopify** | Purchase signal. Tags only. Admin API stages tagged orders when creds are set. |
| **HubSpot** | Consent + qualification properties when that object is ready. Until then, set them on the staging row. |
| **`ops/staging.json`** | Review queue. Field contract: `ops/shopify-staging.schema.json`. |
| **`public/locations.json`** / `VITE_LOCATIONS_URL` | What the map shows. |
| **Finder app** | Display. No intake. |

## Who does what

Roles, not a default named individual:

- **Ops / Sales (role):** tag orders in Shopify. Do not paste buyers onto the public list.
- **Review owner (role, rotating):** clear staging. Set `visit_model`. Approve only when the place is a public try-spot with consent. `none` never publishes; appointment publishes with the flag.
- **Website / this repo (role):** publish gated JSON; deploy. Do not scrape Shopify in the client.

## Do not

- Auto-publish from `sw-business`.
- Treat a purchase as a listing. Review is a **role**, never Dani-by-default.
- Run `--write` / `--publish-approved` against the sample CSV or API `--demo` fixtures (that would upsert a fake pin).
- Publish a row with `consent` false, `visit_model=none`, or missing coordinates.
- Treat appointment-only partners as “hide from the map.” Set `visit_model=appointment` and publish the flag.
- Assign intake or review to Dani (or any one person) by default.
- Leave review as “ask Dani to edit the sheet.”
- Commit real customer CSVs, secrets, tokens, or a live `ops/staging.json` with PII.
- Paste client secrets or access tokens into chat.
