#!/usr/bin/env node
/**
 * Read a Shopify Admin order export CSV (filter: tag sw-business) and write
 * ops/staging.json. Never writes public/locations.json unless --publish-approved.
 *
 * Usage:
 *   node scripts/stage-from-shopify-csv.mjs ops/sample-shopify-export.csv
 *   node scripts/stage-from-shopify-csv.mjs export.csv --staging ops/staging.json
 *   node scripts/stage-from-shopify-csv.mjs export.csv --publish-approved
 *   node scripts/stage-from-shopify-csv.mjs export.csv --publish-approved --out public/locations.json
 *   node scripts/stage-from-shopify-csv.mjs export.csv --publish-approved --replace
 */

import fs from 'node:fs'
import path from 'node:path'

import {
  DEFAULT_PUBLIC_PATH,
  DEFAULT_STAGING_PATH,
  applyIncomingStaging,
  buildPublicFile,
  csvOrdersToStagingRows,
  parseArgs,
  parseCsv,
  printReviewSummary,
  readJsonIfExists,
  selectApproved,
} from './lib/shopify-staging.mjs'

const { positional, flags } = parseArgs(process.argv.slice(2))

if (flags.help || flags.h) {
  console.log(`Usage: node scripts/stage-from-shopify-csv.mjs <shopify-export.csv> [options]

  --staging <path>       Staging queue (default: ${DEFAULT_STAGING_PATH})
  --publish-approved     Copy ONLY status=approved AND consent=true AND visit_model!=none into the public feed
  --out <path>           Public JSON dest when --publish-approved (default: ${DEFAULT_PUBLIC_PATH})
  --replace              Replace the public file instead of upserting by id
  --stdout               With --publish-approved, print public JSON instead of writing
  --demo                 Mark the staging file as a sample/fixture

Shopify tags:
  sw-business          intake only — never auto-publish
  sw-finder-exclude    hard no
`)
  process.exit(0)
}

const csvPath = positional[0]
if (!csvPath) {
  console.error('Missing CSV path. Example: node scripts/stage-from-shopify-csv.mjs ops/sample-shopify-export.csv')
  process.exit(1)
}

const stagingPath = String(flags.staging || DEFAULT_STAGING_PATH)
const csvText = fs.readFileSync(csvPath, 'utf8')
const incoming = csvOrdersToStagingRows(parseCsv(csvText))
const existingDoc = readJsonIfExists(fs, stagingPath)
const { rows, staging, counts } = applyIncomingStaging(incoming, existingDoc, {
  demo: flags.demo === true,
})

fs.mkdirSync(path.dirname(stagingPath) || '.', { recursive: true })
fs.writeFileSync(stagingPath, `${JSON.stringify(staging, null, 2)}\n`)

const extra = [`Wrote ${stagingPath}`]
if (!flags['publish-approved']) {
  extra.push('Public locations not written (pass --publish-approved to copy approved + consent=true + visit_model!=none only).')
}
printReviewSummary(counts, extra, console.error)

if (!flags['publish-approved']) process.exit(0)

const approved = selectApproved(rows)
const outPath = flags.stdout ? null : String(flags.out || DEFAULT_PUBLIC_PATH)
const existingPublic = outPath && flags.replace !== true ? readJsonIfExists(fs, outPath) : null
const publicDoc = buildPublicFile(approved, {
  replace: flags.replace === true || !existingPublic?.locations,
  existing: existingPublic,
})

if (!outPath) {
  process.stdout.write(`${JSON.stringify(publicDoc, null, 2)}\n`)
} else {
  fs.mkdirSync(path.dirname(outPath) || '.', { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(publicDoc, null, 2)}\n`)
  console.log(
    `Published ${approved.length} approved+consent row(s) → ${outPath}` +
      (flags.replace === true ? ' (replace)' : existingPublic?.locations ? ' (upsert)' : ' (new file)'),
  )
}
