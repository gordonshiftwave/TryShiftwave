#!/usr/bin/env node
/**
 * Fetch tagged Shopify orders via GraphQL Admin API (Dev Dashboard client
 * credentials) and upsert ops/staging.json. Never writes public/locations.json
 * unless --publish-approved.
 *
 * Usage:
 *   node scripts/stage-from-shopify-api.mjs
 *   node scripts/stage-from-shopify-api.mjs --dry-run
 *   node scripts/stage-from-shopify-api.mjs --stdout
 *   node scripts/stage-from-shopify-api.mjs --staging ops/staging.json
 *   node scripts/stage-from-shopify-api.mjs --publish-approved
 *
 * Env: SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET
 * Optional: SHOPIFY_API_VERSION
 */

import fs from 'node:fs'
import path from 'node:path'

import {
  createShopifyAdminClient,
  loadLocalEnv,
  readShopifyCredentials,
} from './lib/shopify-admin.mjs'
import {
  DEFAULT_PUBLIC_PATH,
  DEFAULT_STAGING_PATH,
  applyIncomingStaging,
  formatPublishReport,
  graphqlOrdersToStagingRows,
  parseArgs,
  planPublicFeed,
  printReviewSummary,
  readJsonIfExists,
} from './lib/shopify-staging.mjs'

const { flags } = parseArgs(process.argv.slice(2))

if (flags.help || flags.h) {
  console.log(`Usage: node scripts/stage-from-shopify-api.mjs [options]

  Preferred staging path when Dev Dashboard credentials are set.
  CSV fallback: node scripts/stage-from-shopify-csv.mjs <export.csv>

  --staging <path>       Staging queue (default: ${DEFAULT_STAGING_PATH})
  --dry-run              Print staging JSON; do not write files
  --stdout               Same as --dry-run unless --publish-approved (then print public JSON)
  --publish-approved     Copy rows that pass the full publish gate into the public feed
  --out <path>           Public JSON dest when --publish-approved (default: ${DEFAULT_PUBLIC_PATH})
  --replace              Public file = gated rows only (drops historical pins not in staging)
  --demo                 Mark the staging file as a sample/fixture
  --env-file <path>      Local env file (default: .env). Never commit secrets.

Shopify tags (OPS.md):
  sw-business          intake only — never auto-publish
  sw-finder-exclude    hard no

Auth (env — do not paste secrets into chat):
  SHOPIFY_SHOP           myshopify subdomain (e.g. slow-wave-0f67)
  SHOPIFY_CLIENT_ID      Dev Dashboard client id
  SHOPIFY_CLIENT_SECRET  Dev Dashboard client secret
  SHOPIFY_API_VERSION    optional GraphQL Admin version
`)
  process.exit(0)
}

loadLocalEnv(String(flags['env-file'] || '.env'))

let credentials
try {
  credentials = readShopifyCredentials(process.env)
} catch (err) {
  console.error(err.message || err)
  process.exit(1)
}

const dryRun = flags['dry-run'] === true || (flags.stdout === true && flags['publish-approved'] !== true)
const stagingPath = String(flags.staging || DEFAULT_STAGING_PATH)

const client = createShopifyAdminClient(credentials)
const nodes = await client.fetchTaggedOrders()
const incoming = graphqlOrdersToStagingRows(nodes)
const existingDoc = readJsonIfExists(fs, stagingPath)
const applied = applyIncomingStaging(incoming, existingDoc, { demo: flags.demo === true })
const { rows, staging, counts } = applied

if (dryRun) {
  process.stdout.write(`${JSON.stringify(staging, null, 2)}\n`)
} else {
  fs.mkdirSync(path.dirname(stagingPath) || '.', { recursive: true })
  fs.writeFileSync(stagingPath, `${JSON.stringify(staging, null, 2)}\n`)
}

const extra = [
  `Fetched: ${nodes.length} tagged order(s) from ${credentials.shop}`,
  `Upserted: ${applied.upserted} row(s) (${applied.created} new, ${applied.updated} existing)`,
]
if (dryRun) {
  extra.push('Dry-run: staging JSON printed; no files written.')
} else {
  extra.push(`Wrote ${stagingPath}`)
}
if (!flags['publish-approved']) {
  extra.push('Public locations not written (pass --publish-approved to copy rows that pass the full gate).')
}
printReviewSummary(counts, extra, console.error)

if (!flags['publish-approved']) process.exit(0)
if (dryRun) process.exit(0)

const outPath = flags.stdout ? null : String(flags.out || DEFAULT_PUBLIC_PATH)
const existingPublic = outPath && flags.replace !== true ? readJsonIfExists(fs, outPath) : null
const plan = planPublicFeed(rows, existingPublic, { replace: flags.replace === true })

if (!outPath) {
  process.stdout.write(`${JSON.stringify(plan.doc, null, 2)}\n`)
} else {
  fs.mkdirSync(path.dirname(outPath) || '.', { recursive: true })
  fs.writeFileSync(outPath, `${JSON.stringify(plan.doc, null, 2)}\n`)
  console.error(formatPublishReport(plan, { outPath }))
}
