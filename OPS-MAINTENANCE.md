# Try-spot list — maintenance

Who does what, with no person assigned by name:

| Role | Work | Needs a developer? |
| --- | --- | --- |
| Ops / Sales | Tag Shopify orders `sw-business` or `sw-finder-exclude`. | No. Shopify Admin is enough. |
| Review owner (Colin / sales qualification; not Dani by default) | Decide approved / rejected / excluded, consent, qualified, public-facing, visit model, and that phone/email are public business contacts. | The decision is nontechnical. Applying it means editing `ops/staging.json` or asking someone who can keep JSON valid. |
| Website owner (Candice) | Shopify page, iframe, forms, DNS, and any host she chooses. | Theme editor is enough for the iframe. Building or publishing this repo needs Node and git write. |
| Repo editor | Run stage/publish scripts and merge to `main`. | Yes, or anyone comfortable with git and Node. After Candice has write access, this is her side, not Gordon’s. |

There is no admin screen for publish. `ops/staging.json` is local and gitignored because it can contain customer data. Never commit it, and never paste order notes or consent text into chat or into `public/locations.json`.

Gate for a public pin: `status` `approved`, `consent` true, `qualified` true, `public_facing` true, `visit_model` `walk_in` or `appointment`, and real coordinates. Blank coordinates are rejected. Staging `notes` are not published.

## Add a location

1. Ops / Sales tags the Shopify order `sw-business`. Do not tag it only to “put it on the map.” The tag queues a review.
2. Stage:
   - API (needs `SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` in a local `.env`): `node scripts/stage-from-shopify-api.mjs`
   - Or CSV: export the tagged orders from Shopify Admin and run `node scripts/stage-from-shopify-csv.mjs path/to/export.csv`
3. Open `ops/staging.json`. The new row is `pending_review`, `consent` false, `visit_model` `"none"`, coordinates null. It will not publish yet.
4. Review owner sets:
   - `status`: `"approved"`
   - `consent`: `true` only when the partner agrees to public demo visitors
   - `qualified`: `true`
   - `public_facing`: `true` (public business, not a home)
   - `visit_model`: `"walk_in"` or `"appointment"`
   - `lat` and `lng`: real WGS84 numbers, not `0` and `0`, not blank
   - `phone` and `email`: public front-desk contacts. Replace the buyer’s order email/phone if that is what Shopify copied in.
   - Leave `notes` for internal use. They are not copied to the public file.
5. Publish (section below) and verify.

Nontechnical reviewer: write the decisions down (approved, appointment, coordinates). Someone with the repo applies them if the reviewer will not edit JSON.

## Edit a listed location

1. Find the row in `ops/staging.json` by `id`. The public pin uses the same `id`.
2. Change the public fields (name, street, hours, phone, email, coordinates).
3. Keep `status`, `consent`, `qualified`, and `public_facing` true if it should remain listed.
4. Publish. Reconcile replaces that `id` in `public/locations.json`.

Historical pins that were never staged are not in `ops/staging.json`. To edit one of those, either add a staging row with **the same `id`** as the public pin and publish, or edit that object in `public/locations.json` (repo editor). A different slug will add a second pin and leave the old one.

## Change visit model

1. In the staging row set `visit_model` to `"walk_in"`, `"appointment"`, or `"none"`.
2. `walk_in` lists with no extra label. `appointment` lists with “By appointment — call to schedule”. `none` removes the pin on the next publish.
3. Set `walk_in_ok` to `true` only for `walk_in`. The publisher derives the public flag from `visit_model`.
4. Publish and verify the label.

Shopify does not set appointment. A missing `visit_model` does not publish and does not display as walk-in.

## Withdraw consent or exclude

1. Withdraw consent: set `consent` to `false`. Optional: set `status` to `"rejected"`.
2. Hard no (home, private, unsafe, do-not-list): add Shopify tag `sw-finder-exclude` and re-stage, or set `status` to `"excluded"` and `exclude` to `true`. The exclude tag wins on the next import.
3. Publish. The staging `id` is removed from the public file. It is not left behind as an upsert.

Say the public `id` in the request. A withdrawal only removes a matching id.

## Urgent removal

Use this when a pin must disappear before the next normal review.

1. If the partner has a staging row: set `status` to `"excluded"` (or `consent` false / `visit_model` `"none"`) and run publish immediately.
2. If the pin exists only in `public/locations.json` (historical sheet, id not in staging): a repo editor adds a staging row with that **exact** `id`, `status` `"excluded"`, and publishes. Reconcile drops the id. Alternatively delete that one object from `public/locations.json` and merge.
3. Merge to `main` so GitHub Pages updates the preview URL. Candice’s iframe points at that URL until she hosts the files herself.
4. Confirm the id is gone from `https://gordonshiftwave.github.io/TryShiftwave/locations.json` after the deploy (allow for Pages cache, about 10 minutes).

`--replace` deletes every public pin that is not in the approved set. Use it only when staging is the full catalog. It is the wrong tool for removing one historical pin while the other sheet pins should stay.

## Publish

```bash
node scripts/publish-approved.mjs --stdout
node scripts/publish-approved.mjs --write
```

`--stdout` prints the public JSON and does not write. `--write` updates `public/locations.json`.

Default mode reconciles:

- Ids that pass the gate are written.
- Staging ids that fail the gate are removed.
- Historical ids that are not in staging stay only if they still have explicit qualification, consent, a listable visit model, and real coordinates.
- `notes` are omitted.

`--replace` makes the public file exactly the rows that pass the gate.

Stderr prints counts. `OPS ALERT` means either no locations would be public, or a row was blocked because coordinates were blank, invalid, or `0,0`. Fix coordinates before expecting that partner to appear. An empty file is written on purpose when nothing passes; the website shows an empty-list notice instead of an old snapshot.

Commit `public/locations.json` only. Do not commit `ops/staging.json` or `.env`.

Merging that commit to `main` is the preview deploy (`.github/workflows/deploy-pages.yml` runs tests, then builds, then GitHub Pages). Candice, or another person with write access, merges. That is not a Cloudflare or DNS step.

## Verify

1. `npm test` locally, or look at the Test workflow on the pull request.
2. After `main` deploys, open `https://gordonshiftwave.github.io/TryShiftwave/locations.json` and check `count` and the `id` you changed. Do not look for `notes`, order ids, or review names; those must be absent.
3. Open `https://gordonshiftwave.github.io/TryShiftwave/?embed=1`. Search a ZIP near the pin.
4. Appointment partners show the appointment line. Withdrawn ids do not appear.
5. On the Shopify Try page, confirm the iframe is about 720px tall and the existing forms still submit underneath it.

## Recover

1. A bad public file: `git log -- public/locations.json`, then restore the last good version of that file and merge again. Do not “fix” a withdrawal by pointing the browser at an old snapshot. The app will not silently reload a bundled file when a remote feed fails.
2. A failed remote feed (only if `VITE_LOCATIONS_URL` is set): visitors see an empty list and a notice to use the form below the finder. Repair the URL or stop setting `VITE_LOCATIONS_URL` and ship `locations.json` with the build. Do not turn the snapshot fallback back on.
3. A publish that dropped historical pins because `--replace` was used too early: restore `public/locations.json` from git. Run the next publish without `--replace`.
4. Secrets in a commit: remove the file from git history using the repo owner’s normal secret-rotation process, and rotate the Shopify client secret in the Dev Dashboard. Do not paste the secret into the pull request.

## What still needs a person

- Review owner judgment (consent, qualification, visit model). The scripts will not invent it.
- Candice’s paste of the iframe and her reading of the live form ids (see `CANDICE-HANDOFF.md`). This repo does not know those ids.
- Write access to this repo, or a fork she deploys, so feed updates are not waiting on someone else.
