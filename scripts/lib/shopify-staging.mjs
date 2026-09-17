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

export function parseTags(value) {
  return String(value ?? '')
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
}

export function hasTag(tags, needle) {
  const want = needle.trim().toLowerCase()
  return tags.some((t) => t === want)
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

function pickName(row) {
  return (
    pickCompany(row) ||
    cell(row, 'Shipping Name', 'shipping_name') ||
    cell(row, 'Billing Name', 'billing_name') ||
    cell(row, 'Name')
  )
}

export function csvOrdersToStagingRows(csvRows) {
  const byOrder = new Map()

  for (const raw of csvRows) {
    const tags = parseTags(cell(raw, 'Tags', 'tags'))
    if (!hasTag(tags, INTAKE_TAG) && !hasTag(tags, EXCLUDE_TAG)) continue

    const orderId = cell(raw, 'Id', 'id', 'Order Id', 'order_id') || cell(raw, 'Name')
    const key = orderId || `${pickName(raw)}-${cell(raw, 'Email')}`
    const existing = byOrder.get(key)
    if (existing) {
      for (const t of tags) {
        if (!existing.shopify_tags.includes(t)) existing.shopify_tags.push(t)
      }
      continue
    }

    const name = pickName(raw)
    const city = cell(raw, 'Shipping City', 'shipping_city') || cell(raw, 'Billing City', 'billing_city')
    const state =
      cell(raw, 'Shipping Province', 'shipping_province') ||
      cell(raw, 'Billing Province', 'billing_province') ||
      cell(raw, 'Shipping Province Name', 'shipping_province_name') ||
      cell(raw, 'Billing Province Name', 'billing_province_name')
    const zipRaw =
      cell(raw, 'Shipping Zip', 'shipping_zip') || cell(raw, 'Billing Zip', 'billing_zip')
    const zip = normalizeZip(zipRaw)
    const excluded = hasTag(tags, EXCLUDE_TAG)
    const id = slug([name, city, state, zip].filter(Boolean).join(' ')) || slug(`shopify-${key}`)

    byOrder.set(key, {
      id,
      name,
      street:
        cell(raw, 'Shipping Address1', 'shipping_address1', 'Shipping Street', 'shipping_street') ||
        cell(raw, 'Billing Address1', 'billing_address1', 'Billing Street', 'billing_street'),
      city,
      state,
      zip,
      lat: null,
      lng: null,
      phone:
        cell(raw, 'Shipping Phone', 'shipping_phone') ||
        cell(raw, 'Billing Phone', 'billing_phone') ||
        cell(raw, 'Phone', 'phone'),
      email: cell(raw, 'Email', 'email'),
      hours: '',
      website: '',
      category: '',
      region: '',
      notes: cell(raw, 'Notes', 'notes'),
      status: excluded ? 'excluded' : 'pending_review',
      consent: false,
      exclude: excluded,
      qualified: false,
      public_facing: false,
      walk_in_ok: false,
      visit_model: 'none',
      shopify_order_id: orderId,
      shopify_order_name: cell(raw, 'Name'),
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

export function isPublishable(row) {
  if (!row || row.status !== 'approved') return false
  if (row.consent !== true) return false
  if (row.exclude === true) return false
  if (hasTag(row.shopify_tags ?? [], EXCLUDE_TAG)) return false
  if (!String(row.name ?? '').trim()) return false
  const model = String(row.visit_model ?? '').trim()
  if (!LISTABLE_VISIT_MODELS.includes(model)) return false
  const lat = Number(row.lat)
  const lng = Number(row.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false
  return true
}

export function toPublicLocation(row) {
  const hours = String(row.hours ?? '').trim()
  const visitModel = String(row.visit_model ?? '').trim() === 'appointment' ? 'appointment' : 'walk_in'
  return {
    id: row.id,
    name: String(row.name ?? '').trim(),
    street: String(row.street ?? '').trim(),
    city: String(row.city ?? '').trim(),
    state: String(row.state ?? '').trim(),
    zip: String(row.zip ?? '').trim(),
    lat: Number(row.lat),
    lng: Number(row.lng),
    phone: String(row.phone ?? '').trim(),
    email: String(row.email ?? '').trim(),
    hours: hours && !/^call for hours$/i.test(hours) ? hours : 'Hours unavailable',
    website: String(row.website ?? '').trim(),
    category: String(row.category ?? '').trim(),
    region: String(row.region ?? '').trim(),
    qualified: row.qualified === true,
    public_facing: row.public_facing === true,
    demo_consent: row.consent === true,
    walk_in_ok: visitModel === 'walk_in',
    visit_model: visitModel,
    notes: String(row.notes ?? '').trim(),
  }
}

export function selectApproved(rows) {
  return rows.filter(isPublishable).map(toPublicLocation)
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

export function buildPublicFile(locations, { replace = true, existing = null, updated = today() } = {}) {
  if (!replace && existing && Array.isArray(existing.locations)) {
    const byId = new Map(existing.locations.map((loc) => [loc.id, loc]))
    for (const loc of locations) byId.set(loc.id, loc)
    const merged = [...byId.values()]
    return {
      ...existing,
      updated,
      count: merged.length,
      locations: merged,
    }
  }

  return {
    source: 'shopify_staging_approved',
    demo: false,
    updated,
    filter: 'status=approved AND consent=true AND visit_model!=none (appointment publishes with flag; sw-finder-exclude never published)',
    count: locations.length,
    locations,
  }
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
