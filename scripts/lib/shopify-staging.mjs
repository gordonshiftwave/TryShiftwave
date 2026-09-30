/**
 * Shared Shopify → staging → public-feed helpers.
 *
 * Intake tag `sw-business` never auto-publishes.
 * Exclude tag `sw-finder-exclude` is a hard no.
 * Public copy only: status === "approved" && consent === true && visit_model !== "none".
 * Appointment rows publish with visit_model=appointment (not hidden).
 */

export const INTAKE_TAG = 'sw-business'
export const EXCLUDE_TAG = 'sw-finder-exclude'
export const STAGING_SOURCE = 'shopify_staging'
export const DEFAULT_STAGING_PATH = 'ops/staging.json'
export const DEFAULT_PUBLIC_PATH = 'public/locations.json'
export const LISTABLE_VISIT_MODELS = ['walk_in', 'appointment']

/** Canonical OPS.md tags plus separator variants seen in docs/exports. */
const INTAKE_TAG_ALIASES = new Set(['sw-business', 'sw_business'])
const EXCLUDE_TAG_ALIASES = new Set(['sw-finder-exclude', 'sw_finder_exclude', 'sw-finder_exclude'])

const HUMAN_FIELDS = [
  'status',
  'consent',
  'qualified',
  'public_facing',
  'walk_in_ok',
  'visit_model',
  'lat',
  'lng',
  'hours',
  'website',
  'category',
  'region',
  'notes',
  'reviewed_by',
  'reviewed_at',
  'hubspot_id',
  'street',
  'name',
  'city',
  'state',
  'zip',
  'phone',
  'email',
]

/** Reviewer-owned fields: re-import always keeps a filled previous value. */
const QUALIFICATION_FIELDS = new Set([
  'status',
  'consent',
  'qualified',
  'public_facing',
  'walk_in_ok',
  'visit_model',
  'lat',
  'lng',
  'reviewed_by',
  'reviewed_at',
  'hubspot_id',
])

export function normalizeTag(value) {
  const raw = String(value ?? '').trim().toLowerCase()
  if (!raw) return ''
  const hyphenated = raw.replace(/[\s_]+/g, '-')
  if (INTAKE_TAG_ALIASES.has(raw) || INTAKE_TAG_ALIASES.has(hyphenated) || hyphenated === INTAKE_TAG) {
    return INTAKE_TAG
  }
  if (EXCLUDE_TAG_ALIASES.has(raw) || EXCLUDE_TAG_ALIASES.has(hyphenated) || hyphenated === EXCLUDE_TAG) {
    return EXCLUDE_TAG
  }
  return hyphenated
}

export function parseTags(value) {
  const parts = Array.isArray(value) ? value : String(value ?? '').split(',')
  return parts.map((t) => normalizeTag(t)).filter(Boolean)
}

export function hasTag(tags, needle) {
  const want = normalizeTag(needle)
  return tags.some((t) => normalizeTag(t) === want)
}

export function parseCsv(text) {
  const rows = parseCsvRows(String(text).replace(/^\uFEFF/, ''))
  if (rows.length < 2) return []
  const headers = rows[0].map((h) => h.trim())
  return rows
    .slice(1)
    .filter((row) => row.some((cell) => String(cell).trim()))
    .map((row) => {
      const obj = {}
      headers.forEach((header, i) => {
        obj[header] = row[i] ?? ''
      })
      return obj
    })
}

function parseCsvRows(text) {
  const rows = []
  let row = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(cur)
      cur = ''
    } else if (c === '\n') {
      row.push(cur)
      rows.push(row)
      row = []
      cur = ''
    } else if (c !== '\r') {
      cur += c
    }
  }

  if (cur.length > 0 || row.length > 0) {
    row.push(cur)
    rows.push(row)
  }
  return rows
}

function cell(row, ...keys) {
  const byNorm = new Map()
  for (const [key, value] of Object.entries(row)) {
    const nk = normalizeKey(key)
    const v = String(value ?? '').trim()
    if (v && !byNorm.has(nk)) byNorm.set(nk, v)
  }
  for (const key of keys) {
    const v = byNorm.get(normalizeKey(key))
    if (v) return v
  }
  return ''
}

export function normalizeKey(raw) {
  return String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s/|.-]+/g, '_')
}

export function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeZip(value) {
  const s = String(value ?? '').trim()
  if (!/\d/.test(s)) return ''
  const digits = s.replace(/\D/g, '')
  if (digits.length >= 5) return digits.slice(0, 5)
  return s
}

function pickCompany(row) {
  return (
    cell(row, 'Shipping Company', 'shipping_company') ||
    cell(row, 'Billing Company', 'billing_company') ||
    cell(row, 'Company', 'company')
  )
}

function csvRowToNormalized(raw) {
  return {
    orderId: cell(raw, 'Id', 'id', 'Order Id', 'order_id') || cell(raw, 'Name'),
    orderName: cell(raw, 'Name'),
    tags: parseTags(cell(raw, 'Tags', 'tags')),
    email: cell(raw, 'Email', 'email'),
    notes: cell(raw, 'Notes', 'notes'),
    phone:
      cell(raw, 'Shipping Phone', 'shipping_phone') ||
      cell(raw, 'Billing Phone', 'billing_phone') ||
      cell(raw, 'Phone', 'phone'),
    company: pickCompany(raw),
    personName:
      cell(raw, 'Shipping Name', 'shipping_name') ||
      cell(raw, 'Billing Name', 'billing_name') ||
      cell(raw, 'Name'),
    street:
      cell(raw, 'Shipping Address1', 'shipping_address1', 'Shipping Street', 'shipping_street') ||
      cell(raw, 'Billing Address1', 'billing_address1', 'Billing Street', 'billing_street'),
    city: cell(raw, 'Shipping City', 'shipping_city') || cell(raw, 'Billing City', 'billing_city'),
    state:
      cell(raw, 'Shipping Province', 'shipping_province') ||
      cell(raw, 'Billing Province', 'billing_province') ||
      cell(raw, 'Shipping Province Name', 'shipping_province_name') ||
      cell(raw, 'Billing Province Name', 'billing_province_name'),
    zip: cell(raw, 'Shipping Zip', 'shipping_zip') || cell(raw, 'Billing Zip', 'billing_zip'),
  }
}

function mailing(addr) {
  return addr && typeof addr === 'object' ? addr : {}
}

export function gidNumericId(value) {
  const s = String(value ?? '').trim()
  if (!s) return ''
  const tail = s.match(/(\d+)\s*$/)
  return tail ? tail[1] : s
}

function displayName(order) {
  return (
    String(order.company ?? '').trim() ||
    String(order.personName ?? '').trim() ||
    String(order.orderName ?? '').trim()
  )
}

/** GraphQL Admin `Order` node → the same normalized shape the CSV mapper uses. */
export function graphqlOrderToNormalized(node) {
  const shipping = mailing(node?.shippingAddress)
  const billing = mailing(node?.billingAddress)
  return {
    orderId: gidNumericId(node?.id) || String(node?.name ?? '').trim(),
    orderName: String(node?.name ?? '').trim(),
    tags: parseTags(node?.tags),
    email: String(node?.email ?? '').trim(),
    notes: String(node?.note ?? '').trim(),
    phone:
      String(shipping.phone ?? '').trim() ||
      String(billing.phone ?? '').trim() ||
      String(node?.phone ?? '').trim(),
    company: String(shipping.company ?? '').trim() || String(billing.company ?? '').trim(),
    personName: String(shipping.name ?? '').trim() || String(billing.name ?? '').trim(),
    street: String(shipping.address1 ?? '').trim() || String(billing.address1 ?? '').trim(),
    city: String(shipping.city ?? '').trim() || String(billing.city ?? '').trim(),
    state:
      String(shipping.provinceCode ?? '').trim() ||
      String(billing.provinceCode ?? '').trim() ||
      String(shipping.province ?? '').trim() ||
      String(billing.province ?? '').trim(),
    zip: String(shipping.zip ?? '').trim() || String(billing.zip ?? '').trim(),
  }
}

export function csvOrdersToStagingRows(csvRows) {
  return normalizedOrdersToStagingRows((csvRows ?? []).map(csvRowToNormalized))
}

export function graphqlOrdersToStagingRows(nodes) {
  return normalizedOrdersToStagingRows((nodes ?? []).map(graphqlOrderToNormalized))
}

/**
 * Shared CSV/API mapper. Intake tag never auto-publishes.
 * visit_model is always none until a human qualifies — Shopify does not invent appointment.
 */
export function normalizedOrdersToStagingRows(orders) {
  const byOrder = new Map()

  for (const order of orders ?? []) {
    const tags = parseTags(order.tags)
    if (!hasTag(tags, INTAKE_TAG) && !hasTag(tags, EXCLUDE_TAG)) continue

    const orderId = String(order.orderId ?? '').trim()
    const key = orderId || `${displayName(order)}-${order.email ?? ''}`
    const existing = byOrder.get(key)
    if (existing) {
      for (const t of tags) {
        if (!existing.shopify_tags.includes(t)) existing.shopify_tags.push(t)
      }
      continue
    }

    const name = displayName(order)
    const city = String(order.city ?? '').trim()
    const state = String(order.state ?? '').trim()
    const zip = normalizeZip(order.zip)
    const excluded = hasTag(tags, EXCLUDE_TAG)
    const id = slug([name, city, state, zip].filter(Boolean).join(' ')) || slug(`shopify-${key}`)

    byOrder.set(key, {
      id,
      name,
      street: String(order.street ?? '').trim(),
      city,
      state,
      zip,
      lat: null,
      lng: null,
      phone: String(order.phone ?? '').trim(),
      email: String(order.email ?? '').trim(),
      hours: '',
      website: '',
      category: '',
      region: '',
      notes: String(order.notes ?? '').trim(),
      status: excluded ? 'excluded' : 'pending_review',
      consent: false,
      exclude: excluded,
      qualified: false,
      public_facing: false,
      walk_in_ok: false,
      visit_model: 'none',
      shopify_order_id: orderId,
      shopify_order_name: String(order.orderName ?? '').trim(),
      shopify_tags: tags,
      reviewed_by: '',
      reviewed_at: '',
      hubspot_id: '',
    })
  }

  const byId = new Map()
  for (const row of byOrder.values()) {
    const prev = byId.get(row.id)
    if (!prev) {
      byId.set(row.id, row)
      continue
    }
    for (const t of row.shopify_tags) {
      if (!prev.shopify_tags.includes(t)) prev.shopify_tags.push(t)
    }
    if (hasTag(prev.shopify_tags, EXCLUDE_TAG)) {
      prev.exclude = true
      prev.status = 'excluded'
    }
    if (!prev.shopify_order_id && row.shopify_order_id) prev.shopify_order_id = row.shopify_order_id
  }

  return [...byId.values()]
}

/** Merge incoming rows onto an existing staging document, preserving human review. */
export function applyIncomingStaging(incoming, existingDoc, { demo = false } = {}) {
  const existingRows = Array.isArray(existingDoc?.rows) ? existingDoc.rows : []
  const rows = mergeStagingRows(incoming, existingRows)
  const staging = buildStagingFile(rows, { demo: demo === true || existingDoc?.demo === true })
  const counts = reviewCounts(rows)
  const existingIds = new Set(existingRows.map((row) => row.id))
  let created = 0
  let updated = 0
  for (const row of incoming) {
    if (existingIds.has(row.id)) updated += 1
    else created += 1
  }
  return {
    rows,
    staging,
    counts,
    existingRows,
    fetched: incoming.length,
    upserted: incoming.length,
    created,
    updated,
  }
}

export function isFilled(value) {
  if (value == null) return false
  if (typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  return String(value).trim() !== ''
}

/**
 * Re-import must not wipe human qualification.
 * Exclude tag always wins (forces excluded).
 */
export function mergeStagingRows(incoming, existing) {
  const prevById = new Map(existing.map((row) => [row.id, row]))
  const merged = incoming.map((row) => {
    const prev = prevById.get(row.id)
    if (!prev) return row

    const next = { ...row }
    for (const field of HUMAN_FIELDS) {
      if (
        isFilled(prev[field]) &&
        (QUALIFICATION_FIELDS.has(field) || !isFilled(row[field]))
      ) {
        next[field] = prev[field]
      }
    }

    if (row.exclude || hasTag(next.shopify_tags, EXCLUDE_TAG) || hasTag(row.shopify_tags, EXCLUDE_TAG)) {
      next.exclude = true
      next.status = 'excluded'
    }
    return next
  })

  const seen = new Set(merged.map((row) => row.id))
  for (const prev of existing) {
    if (!seen.has(prev.id)) merged.push(prev)
  }
  return merged
}

export function reviewCounts(rows) {
  const counts = {
    total: rows.length,
    pending_review: 0,
    approved: 0,
    rejected: 0,
    excluded: 0,
    publishable: 0,
  }
  for (const row of rows) {
    if (counts[row.status] != null) counts[row.status] += 1
    if (isPublishable(row)) counts.publishable += 1
  }
  counts.needs_review = counts.pending_review
  return counts
}

/**
 * A coordinate that was blank, null, or non-numeric must not become 0.
 * `Number(null)` and `Number('')` are 0 — that coercion is rejected here.
 */
export function parseCoordinate(value) {
  if (value == null || typeof value === 'boolean') return null
  if (typeof value === 'string' && value.trim() === '') return null
  const n = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isFinite(n)) return null
  return n
}

/** Reject blank/null and Null Island (0,0), which is what coerced blanks look like. */
export function validCoordinatePair(latRaw, lngRaw) {
  const lat = parseCoordinate(latRaw)
  const lng = parseCoordinate(lngRaw)
  if (lat == null || lng == null) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  if (lat === 0 && lng === 0) return null
  return { lat, lng }
}

/**
 * Same display rules the browser uses, plus the staging-only checks in
 * `isPublishable`. A public row that fails this is not listable.
 */
export function isPublicRecordListable(loc) {
  if (!loc || typeof loc !== 'object') return false
  if (!String(loc.name ?? '').trim()) return false
  if (loc.qualified !== true || loc.public_facing !== true || loc.demo_consent !== true) return false
  const model = String(loc.visit_model ?? '').trim()
  if (!LISTABLE_VISIT_MODELS.includes(model)) return false
  if (!validCoordinatePair(loc.lat, loc.lng)) return false
  return true
}

export function isPublishable(row) {
  if (!row || row.status !== 'approved') return false
  if (row.consent !== true) return false
  if (row.exclude === true) return false
  if (hasTag(row.shopify_tags ?? [], EXCLUDE_TAG)) return false
  if (!String(row.name ?? '').trim()) return false
  const model = String(row.visit_model ?? '').trim()
  if (!LISTABLE_VISIT_MODELS.includes(model)) return false
  if (row.qualified !== true || row.public_facing !== true) return false
  if (!validCoordinatePair(row.lat, row.lng)) return false
  return true
}

const PUBLIC_LOCATION_KEYS = [
  'id',
  'name',
  'street',
  'city',
  'state',
  'zip',
  'lat',
  'lng',
  'phone',
  'email',
  'hours',
  'website',
  'category',
  'region',
  'qualified',
  'public_facing',
  'demo_consent',
  'walk_in_ok',
  'visit_model',
]

/** Public JSON allowlist. Staging notes, order ids, and review fields are omitted. */
export function sanitizePublicLocation(loc) {
  const out = {}
  for (const key of PUBLIC_LOCATION_KEYS) {
    if (loc && loc[key] !== undefined) out[key] = loc[key]
  }
  return out
}

export function toPublicLocation(row) {
  if (!isPublishable(row)) return null
  const coords = validCoordinatePair(row.lat, row.lng)
  const hours = String(row.hours ?? '').trim()
  const visitModel = String(row.visit_model ?? '').trim()
  return sanitizePublicLocation({
    id: row.id,
    name: String(row.name ?? '').trim(),
    street: String(row.street ?? '').trim(),
    city: String(row.city ?? '').trim(),
    state: String(row.state ?? '').trim(),
    zip: String(row.zip ?? '').trim(),
    lat: coords.lat,
    lng: coords.lng,
    phone: String(row.phone ?? '').trim(),
    email: String(row.email ?? '').trim(),
    hours: hours && !/^call for hours$/i.test(hours) ? hours : 'Hours unavailable',
    website: String(row.website ?? '').trim(),
    category: String(row.category ?? '').trim(),
    region: String(row.region ?? '').trim(),
    qualified: true,
    public_facing: true,
    demo_consent: true,
    walk_in_ok: visitModel === 'walk_in',
    visit_model: visitModel,
  })
}

export function selectApproved(rows) {
  return (rows ?? []).map(toPublicLocation).filter(Boolean)
}

/**
 * Why a staging row failed the publish gate. One bucket per row, same order as isPublishable.
 */
export function gateDiagnostics(rows) {
  const counts = {
    total: 0,
    publishable: 0,
    blocked_status: 0,
    blocked_consent: 0,
    blocked_exclude: 0,
    blocked_name: 0,
    blocked_visit_model: 0,
    blocked_qualification: 0,
    blocked_coordinates: 0,
  }
  for (const row of rows ?? []) {
    counts.total += 1
    if (!row || row.status !== 'approved') {
      counts.blocked_status += 1
      continue
    }
    if (row.consent !== true) {
      counts.blocked_consent += 1
      continue
    }
    if (row.exclude === true || hasTag(row.shopify_tags ?? [], EXCLUDE_TAG)) {
      counts.blocked_exclude += 1
      continue
    }
    if (!String(row.name ?? '').trim()) {
      counts.blocked_name += 1
      continue
    }
    if (!LISTABLE_VISIT_MODELS.includes(String(row.visit_model ?? '').trim())) {
      counts.blocked_visit_model += 1
      continue
    }
    if (row.qualified !== true || row.public_facing !== true) {
      counts.blocked_qualification += 1
      continue
    }
    if (!validCoordinatePair(row.lat, row.lng)) {
      counts.blocked_coordinates += 1
      continue
    }
    counts.publishable += 1
  }
  return counts
}

/**
 * Approved rows replace matching ids. Staging ids that are no longer publishable
 * are removed from the public file. Public ids that are not in this staging queue
 * stay only when they still pass the display gate (historical sheet pins).
 */
export function reconcilePublicLocations(approved, existingLocations, stagingIds) {
  const approvedList = (approved ?? []).filter(Boolean)
  const stagingSet = new Set(stagingIds ?? [])
  const approvedIds = new Set(approvedList.map((loc) => loc.id))
  const kept = []
  const removedIds = []
  for (const loc of existingLocations ?? []) {
    if (!loc || typeof loc !== 'object' || !loc.id) continue
    if (approvedIds.has(loc.id)) continue
    if (stagingSet.has(loc.id) || !isPublicRecordListable(loc)) {
      removedIds.push(loc.id)
      continue
    }
    kept.push(sanitizePublicLocation(loc))
  }
  return {
    locations: [...kept, ...approvedList.map((loc) => sanitizePublicLocation(loc))],
    removedIds,
    keptHistorical: kept.length,
  }
}

export function buildStagingFile(rows, { demo = false, updated = today() } = {}) {
  const counts = reviewCounts(rows)
  return {
    source: STAGING_SOURCE,
    demo,
    updated,
    intake_tag: INTAKE_TAG,
    exclude_tag: EXCLUDE_TAG,
    count: counts.total,
    needs_review: counts.needs_review,
    rows,
  }
}

const PUBLIC_FILTER =
  'status=approved AND consent=true AND qualified=true AND public_facing=true AND visit_model in (walk_in, appointment) AND valid coordinates. Blank coordinates are rejected (not coerced to 0,0). Staging notes are not copied.'

/**
 * Build the public feed from staging rows.
 * Default reconciles: withdrawn/excluded/rejected/unqualified ids are removed.
 * `--replace` (replace: true) drops historical pins that are not in the approved set.
 * Pass every staging row id so a row that no longer passes the gate cannot linger.
 */
export function planPublicFeed(stagingRows, existingPublic, { replace = false, updated = today() } = {}) {
  const rows = Array.isArray(stagingRows) ? stagingRows : []
  const approved = selectApproved(rows)
  const stagingIds = rows.map((row) => row?.id).filter((id) => typeof id === 'string' && id)
  const replacing = replace === true || !Array.isArray(existingPublic?.locations)
  const reconciled = replacing
    ? { locations: approved.map((loc) => sanitizePublicLocation(loc)), removedIds: [], keptHistorical: 0 }
    : reconcilePublicLocations(approved, existingPublic.locations, stagingIds)
  const doc = {
    source: 'shopify_staging_approved',
    demo: false,
    updated,
    filter: PUBLIC_FILTER,
    count: reconciled.locations.length,
    locations: reconciled.locations,
  }
  return {
    doc,
    replacing,
    removedIds: reconciled.removedIds,
    keptHistorical: reconciled.keptHistorical,
    approvedCount: approved.length,
    diagnostics: gateDiagnostics(rows),
  }
}

export function buildPublicFile(locations, { replace = true, existing = null, stagingIds = null, updated = today() } = {}) {
  const approved = (locations ?? []).filter(Boolean)
  const canReconcile =
    replace !== true && existing && Array.isArray(existing.locations) && Array.isArray(stagingIds)
  if (canReconcile) {
    const reconciled = reconcilePublicLocations(approved, existing.locations, stagingIds)
    return {
      source: 'shopify_staging_approved',
      demo: false,
      updated,
      filter: PUBLIC_FILTER,
      count: reconciled.locations.length,
      locations: reconciled.locations,
    }
  }
  return {
    source: 'shopify_staging_approved',
    demo: false,
    updated,
    filter: PUBLIC_FILTER,
    count: approved.length,
    locations: approved.map((loc) => sanitizePublicLocation(loc)),
  }
}

export function formatPublishReport(plan, { stagingPath, outPath } = {}) {
  const counts = plan.diagnostics
  const lines = [
    'Publish gate: status=approved AND consent=true AND qualified=true AND public_facing=true AND visit_model in (walk_in, appointment) AND valid coordinates',
    stagingPath ? `  staging:      ${stagingPath} (${counts.total} rows)` : `  staging rows: ${counts.total}`,
    `  published:    ${plan.approvedCount} passed the gate`,
    `  public file:  ${plan.doc.count} location(s)`,
    `  unpublished:  ${plan.removedIds.length} (staging id no longer passes, or public row fails the display gate)`,
    `  kept prior:   ${plan.keptHistorical} (historical ids not in this staging queue that still pass the display gate)`,
    `  mode:         ${plan.replacing ? 'replace (public file = rows that pass the gate)' : 'reconcile (withdrawn staging ids removed)'}`,
    outPath ? `  wrote:        ${outPath}` : '  wrote:        stdout',
  ]
  if (counts.blocked_coordinates > 0) {
    lines.push(
      `OPS ALERT: ${counts.blocked_coordinates} staging row(s) blocked on blank, invalid, or 0,0 coordinates. They were not coerced onto the map.`,
    )
  }
  if (plan.doc.count === 0) {
    lines.push(
      'OPS ALERT: public feed has 0 locations. Visitors should see an empty-list notice. Do not restore an older snapshot.',
    )
  }
  return lines.join('\n')
}

export function readJsonIfExists(fs, path) {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'))
  } catch (err) {
    if (err && err.code === 'ENOENT') return null
    throw err
  }
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function parseArgs(argv) {
  const args = { positional: [], flags: {} }
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]
    if (token === '--') {
      args.positional.push(...argv.slice(i + 1))
      break
    }
    if (token.startsWith('--')) {
      const eq = token.indexOf('=')
      if (eq !== -1) {
        args.flags[token.slice(2, eq)] = token.slice(eq + 1)
        continue
      }
      const key = token.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        args.flags[key] = next
        i++
      } else {
        args.flags[key] = true
      }
    } else {
      args.positional.push(token)
    }
  }
  return args
}

export function printReviewSummary(counts, extraLines = [], log = console.error) {
  const lines = [
    `Staging: ${counts.total} rows`,
    `  need review:  ${counts.needs_review}`,
    `  approved:     ${counts.approved}`,
    `  rejected:     ${counts.rejected}`,
    `  excluded:     ${counts.excluded}`,
    `  publishable:  ${counts.publishable} (approved + consent=true + visit_model!=none + coordinates)`,
    ...extraLines,
  ]
  log(lines.join('\n'))
  return counts.needs_review
}
