#!/usr/bin/env node
/**
 * Copy staging rows that pass the publish gate into public JSON.
 *
 * Gate (all required):
 *   status === "approved"
 *   consent === true
 *   visit_model === "walk_in" | "appointment"  (none never publishes)
 *   not excluded / no sw-finder-exclude
 *   name + coordinates present
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
  buildPublicFile,
  parseArgs,
  readJsonIfExists,
  reviewCounts,
  selectApproved,
} from './lib/shopify-staging.mjs'

const { flags } = parseArgs(process.argv.slice(2))

if (flags.help || flags.h) {
  console.log(`Usage: node scripts/publish-approved.mjs [options]

  --staging <path>   Staging queue (default: ${DEFAULT_STAGING_PATH})
  --out <path>       Write public JSON (default: stdout; use --write for ${DEFAULT_PUBLIC_PATH})
  --write            Write ${DEFAULT_PUBLIC_PATH} (same as --out ${DEFAULT_PUBLIC_PATH})
  --stdout           Print JSON even if --out/--write is set
  --replace          Replace the output file with gated rows only (no upsert)
`)
  process.exit(0)
}

const stagingPath = String(flags.staging || DEFAULT_STAGING_PATH)
const staging = readJsonIfExists(fs, stagingPath)
if (!staging || !Array.isArray(staging.rows)) {
  console.error(`No staging queue at ${stagingPath}. Run: node scripts/stage-from-shopify-api.mjs`)
  process.exit(1)
}

const approved = selectApproved(staging.rows)
const counts = reviewCounts(staging.rows)

const writeRequested = flags.write === true || typeof flags.out === 'string'
const outPath = flags.stdout ? null : flags.write === true ? DEFAULT_PUBLIC_PATH : flags.out ? String(flags.out) : null

const existingPublic = outPath && flags.replace !== true ? readJsonIfExists(fs, outPath) : null
const publicDoc = buildPublicFile(approved, {
  replace: flags.replace === true || !existingPublic?.locations,
  existing: existingPublic,
})
const json = `${JSON.stringify(publicDoc, null, 2)}\n`

if (!outPath || flags.stdout === true) {
  process.stdout.write(json)
}

if (outPath) {
  fs.mkdirSync(path.dirname(outPath) || '.', { recursive: true })
  fs.writeFileSync(outPath, json)
}

console.error(
  [
    `Publish gate: status=approved AND consent=true AND visit_model!=none`,
    `  staging:      ${stagingPath} (${counts.total} rows, ${counts.needs_review} need review)`,
    `  published:    ${approved.length}`,
    `  skipped:      ${counts.total - approved.length} (pending/rejected/excluded/none/no consent/no coordinates)`,
    outPath ? `  wrote:        ${outPath}${flags.replace === true ? ' (replace)' : existingPublic?.locations ? ' (upsert)' : ''}` : '  wrote:        stdout',
  ].join('\n'),
)

if (writeRequested && approved.length === 0) {
  console.error('No rows passed the gate. Public feed not filled from Shopify tags alone.')
}
