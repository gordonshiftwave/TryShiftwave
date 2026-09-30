#!/usr/bin/env node
/**
 * Copy staging rows that pass the publish gate into public JSON.
 *
 * Gate (all required):
 *   status === "approved"
 *   consent === true
 *   qualified === true
 *   public_facing === true
 *   visit_model === "walk_in" | "appointment"  (none never publishes)
 *   not excluded / no sw-finder-exclude
 *   name + real coordinates (blank/null/0,0 rejected)
 *
 * Default reconciles: staging ids that fail the gate are removed from the
 * public file. Staging notes are not copied. --replace drops historical pins.
 *
 * Usage:
 *   node scripts/publish-approved.mjs
 *   node scripts/publish-approved.mjs --out public/locations.json
 *   node scripts/publish-approved.mjs --stdout
 *   node scripts/publish-approved.mjs --replace --out /tmp/locations.json
 */

import fs from 'node:fs'
import path from 'node:path'

import {
  DEFAULT_PUBLIC_PATH,
  DEFAULT_STAGING_PATH,
  formatPublishReport,
  parseArgs,
  planPublicFeed,
  readJsonIfExists,
  reviewCounts,
} from './lib/shopify-staging.mjs'

const { flags } = parseArgs(process.argv.slice(2))

if (flags.help || flags.h) {
  console.log(`Usage: node scripts/publish-approved.mjs [options]

  --staging <path>   Staging queue (default: ${DEFAULT_STAGING_PATH})
  --out <path>       Write public JSON (default: stdout; use --write for ${DEFAULT_PUBLIC_PATH})
  --write            Write ${DEFAULT_PUBLIC_PATH} (same as --out ${DEFAULT_PUBLIC_PATH})
  --stdout           Print JSON even if --out/--write is set
  --replace          Public file = rows that pass the gate only (drops historical pins not in staging)
`)
  process.exit(0)
}

const stagingPath = String(flags.staging || DEFAULT_STAGING_PATH)
const staging = readJsonIfExists(fs, stagingPath)
if (!staging || !Array.isArray(staging.rows)) {
  console.error(`No staging queue at ${stagingPath}. Run: node scripts/stage-from-shopify-api.mjs`)
  process.exit(1)
}

const counts = reviewCounts(staging.rows)

const writeRequested = flags.write === true || typeof flags.out === 'string'
const outPath = flags.stdout ? null : flags.write === true ? DEFAULT_PUBLIC_PATH : flags.out ? String(flags.out) : null

const existingPublic = outPath && flags.replace !== true ? readJsonIfExists(fs, outPath) : null
const plan = planPublicFeed(staging.rows, existingPublic, { replace: flags.replace === true })
const json = `${JSON.stringify(plan.doc, null, 2)}\n`

if (!outPath || flags.stdout === true) {
  process.stdout.write(json)
}

if (outPath) {
  fs.mkdirSync(path.dirname(outPath) || '.', { recursive: true })
  fs.writeFileSync(outPath, json)
}

console.error(
  formatPublishReport(plan, { stagingPath, outPath }) +
    `\n  need review:  ${counts.needs_review}`,
)

if (writeRequested && plan.approvedCount === 0) {
  console.error('OPS ALERT: no staging rows passed the gate. Public feed was not filled from Shopify tags alone.')
}
