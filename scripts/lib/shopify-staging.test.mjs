import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  applyIncomingStaging,
  csvOrdersToStagingRows,
  formatPublishReport,
  graphqlOrdersToStagingRows,
  isPublishable,
  mergeStagingRows,
  normalizeTag,
  parseCsv,
  parseTags,
  planPublicFeed,
  selectApproved,
  toPublicLocation,
  validCoordinatePair,
} from './shopify-staging.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const graphqlFixture = JSON.parse(
  fs.readFileSync(path.join(here, 'fixtures/shopify-graphql-orders.json'), 'utf8'),
)
const sampleCsv = fs.readFileSync(path.join(here, '../../ops/sample-shopify-export.csv'), 'utf8')

const base = {
  id: 'oasis-austin-tx',
  name: 'Oasis Recovery Studio',
  street: '100 Congress Ave',
  city: 'Austin',
  state: 'TX',
  zip: '78701',
  lat: 30.2672,
  lng: -97.7431,
  phone: '5125550101',
  email: 'ops.oasis@example.com',
  hours: 'Mon–Fri 9am–5pm',
  website: '',
  category: 'Wellness',
  region: '',
  notes: '',
  status: 'approved',
  consent: true,
  exclude: false,
  qualified: true,
  public_facing: true,
  walk_in_ok: true,
  visit_model: 'walk_in',
  shopify_order_id: '5678901234567',
  shopify_order_name: '#1042',
  shopify_tags: ['sw-business'],
  reviewed_by: 'review-owner',
  reviewed_at: '2026-09-17',
  hubspot_id: '',
}

describe('visit_model publish gate', () => {
  it('publishes walk_in when approved + consent', () => {
    assert.equal(isPublishable(base), true)
    assert.equal(toPublicLocation(base).visit_model, 'walk_in')
    assert.equal(toPublicLocation(base).walk_in_ok, true)
  })

  it('publishes appointment with the flag (not hidden)', () => {
    const row = { ...base, visit_model: 'appointment', walk_in_ok: false }
    assert.equal(isPublishable(row), true)
    const pub = toPublicLocation(row)
    assert.equal(pub.visit_model, 'appointment')
    assert.equal(pub.walk_in_ok, false)
    assert.equal(selectApproved([row]).length, 1)
  })

  it('never publishes visit_model none', () => {
    assert.equal(isPublishable({ ...base, visit_model: 'none' }), false)
    assert.equal(selectApproved([{ ...base, visit_model: 'none' }]).length, 0)
  })

  it('never publishes missing visit_model', () => {
    const { visit_model: _drop, ...row } = base
    assert.equal(isPublishable(row), false)
  })

  it('still requires approved + consent', () => {
    assert.equal(isPublishable({ ...base, status: 'pending_review' }), false)
    assert.equal(isPublishable({ ...base, consent: false }), false)
  })

  it('new CSV intake defaults visit_model to none until qualify', () => {
    const csv = parseCsv(`Name,Email,Id,Tags,Shipping Company,Shipping City,Shipping Province,Shipping Zip,Shipping Address1
#1042,ops.oasis@example.com,1,sw-business,Oasis Recovery Studio,Austin,TX,78701,100 Congress Ave
`)
    const rows = csvOrdersToStagingRows(csv)
    assert.equal(rows.length, 1)
    assert.equal(rows[0].visit_model, 'none')
    assert.equal(isPublishable(rows[0]), false)
  })

  it('re-import keeps a human-set visit_model', () => {
    const incoming = [{ ...base, visit_model: 'none', status: 'pending_review', consent: false }]
    const existing = [{ ...base, visit_model: 'appointment', status: 'approved', consent: true }]
    const merged = mergeStagingRows(incoming, existing)
    assert.equal(merged[0].visit_model, 'appointment')
    assert.equal(merged[0].status, 'approved')
  })
})

describe('publish removes rows that no longer pass', () => {
  const historical = {
    id: 'historical-sheet-pin',
    name: 'Historical Sheet Pin',
    street: '',
    city: 'Denver',
    state: 'CO',
    zip: '80202',
    lat: 39.7392,
    lng: -104.9903,
    phone: '',
    email: '',
    hours: 'Hours unavailable',
    website: '',
    category: 'Wellness',
    region: '',
    qualified: true,
    public_facing: true,
    demo_consent: true,
    walk_in_ok: true,
    visit_model: 'walk_in',
    notes: 'sheet gap note',
  }

  it('drops a previously published id when consent is withdrawn', () => {
    const withdrawn = { ...base, consent: false, notes: 'buyer asked to be removed — do not publish' }
    const existing = {
      locations: [toPublicLocation(base), historical],
    }
    const plan = planPublicFeed([withdrawn], existing, { replace: false })
    const ids = plan.doc.locations.map((loc) => loc.id)
    assert.equal(ids.includes(base.id), false)
    assert.equal(ids.includes(historical.id), true)
    assert.deepEqual(plan.removedIds, [base.id])
    assert.equal(JSON.stringify(plan.doc).includes('buyer asked'), false)
    assert.equal(JSON.stringify(plan.doc).includes('sheet gap note'), false)
  })

  it('drops excluded, rejected, and visit_model none on the next publish', () => {
    const excluded = { ...base, id: 'excluded-pin', status: 'excluded', exclude: true }
    const rejected = { ...base, id: 'rejected-pin', status: 'rejected' }
    const hidden = { ...base, id: 'hidden-pin', visit_model: 'none' }
    const existing = {
      locations: [
        { ...toPublicLocation(base), id: 'excluded-pin' },
        { ...toPublicLocation(base), id: 'rejected-pin' },
        { ...toPublicLocation(base), id: 'hidden-pin' },
        historical,
      ],
    }
    const plan = planPublicFeed([excluded, rejected, hidden], existing)
    const ids = plan.doc.locations.map((loc) => loc.id)
    assert.deepEqual(ids, [historical.id])
  })

  it('replace mode keeps only rows that pass the gate', () => {
    const plan = planPublicFeed([base], { locations: [historical] }, { replace: true })
    assert.deepEqual(
      plan.doc.locations.map((loc) => loc.id),
      [base.id],
    )
    assert.equal(plan.keptHistorical, 0)
  })

  it('does not copy staging notes into public JSON', () => {
    const pub = toPublicLocation({ ...base, notes: 'Shopify order note with a private detail' })
    assert.equal(pub.notes, undefined)
    assert.equal(JSON.stringify(pub).includes('private detail'), false)
  })

  it('rejects blank, null, and 0,0 coordinates', () => {
    assert.equal(validCoordinatePair(null, null), null)
    assert.equal(validCoordinatePair('', ''), null)
    assert.equal(validCoordinatePair('  ', '  '), null)
    assert.equal(validCoordinatePair(0, 0), null)
    assert.equal(isPublishable({ ...base, lat: null, lng: null }), false)
    assert.equal(isPublishable({ ...base, lat: '', lng: '' }), false)
    assert.equal(isPublishable({ ...base, lat: 0, lng: 0 }), false)
    assert.equal(Number(null), 0)
    const plan = planPublicFeed([{ ...base, lat: null, lng: null }], { locations: [] })
    assert.equal(plan.approvedCount, 0)
    assert.equal(plan.diagnostics.blocked_coordinates, 1)
    assert.match(formatPublishReport(plan), /OPS ALERT: 1 staging row/)
  })

  it('requires qualified and public_facing, matching the display gate', () => {
    assert.equal(isPublishable({ ...base, qualified: false }), false)
    assert.equal(isPublishable({ ...base, public_facing: false }), false)
    assert.equal(isPublishable({ ...base, qualified: undefined }), false)
    const plan = planPublicFeed([{ ...base, qualified: false }], null)
    assert.equal(plan.doc.locations.length, 0)
    assert.match(formatPublishReport(plan), /OPS ALERT: public feed has 0 locations/)
  })
})

describe('tag aliases', () => {
  it('normalizes separator variants to OPS.md tags', () => {
    assert.equal(normalizeTag('sw-business'), 'sw-business')
    assert.equal(normalizeTag('sw_business'), 'sw-business')
    assert.equal(normalizeTag('SW Business'), 'sw-business')
    assert.equal(normalizeTag('sw-finder-exclude'), 'sw-finder-exclude')
    assert.equal(normalizeTag('sw_finder_exclude'), 'sw-finder-exclude')
    assert.deepEqual(parseTags('sw_business, sw_finder_exclude'), ['sw-business', 'sw-finder-exclude'])
  })
})

describe('GraphQL Admin orders → staging rows', () => {
  const apiRows = graphqlOrdersToStagingRows(graphqlFixture.orders)
  const csvRows = csvOrdersToStagingRows(parseCsv(sampleCsv))

  it('maps tagged orders into the CSV staging shape and skips untagged', () => {
    assert.equal(apiRows.length, 4)
    assert.equal(csvRows.length, 4)
    const byOrder = new Map(apiRows.map((row) => [row.shopify_order_id, row]))
    for (const csv of csvRows) {
      const api = byOrder.get(csv.shopify_order_id)
      assert.ok(api, `missing API row for ${csv.shopify_order_id}`)
      assert.equal(api.id, csv.id)
      assert.equal(api.name, csv.name)
      assert.equal(api.street, csv.street)
      assert.equal(api.city, csv.city)
      assert.equal(api.state, csv.state)
      assert.equal(api.zip, csv.zip)
      assert.equal(api.email, csv.email)
      assert.equal(api.status, csv.status)
      assert.equal(api.exclude, csv.exclude)
      assert.equal(api.visit_model, 'none')
      assert.equal(api.consent, false)
      assert.deepEqual(api.shopify_tags, csv.shopify_tags)
    }
    assert.equal(
      apiRows.some((row) => row.shopify_order_id === '9990001112223'),
      false,
    )
  })

  it('forces exclude tag to status=excluded', () => {
    const excluded = apiRows.find((row) => row.shopify_order_id === '5678901234568')
    assert.equal(excluded.status, 'excluded')
    assert.equal(excluded.exclude, true)
    assert.ok(excluded.shopify_tags.includes('sw-finder-exclude'))
  })

  it('does not invent appointment from Shopify', () => {
    assert.ok(apiRows.every((row) => row.visit_model === 'none'))
    assert.ok(apiRows.every((row) => row.qualified === false))
    assert.ok(apiRows.every((row) => row.public_facing === false))
  })

  it('re-run preserves human review and still honors exclude', () => {
    const incoming = graphqlOrdersToStagingRows(graphqlFixture.orders)
    const oasis = incoming.find((row) => row.id.includes('oasis'))
    const home = incoming.find((row) => row.shopify_order_id === '5678901234568')
    const existing = [
      {
        ...oasis,
        status: 'approved',
        consent: true,
        qualified: true,
        public_facing: true,
        visit_model: 'walk_in',
        lat: 30.2672,
        lng: -97.7431,
        reviewed_by: 'review-owner',
        reviewed_at: '2026-09-17',
      },
      {
        ...home,
        status: 'approved',
        consent: true,
        visit_model: 'appointment',
        reviewed_by: 'review-owner',
      },
    ]
    const applied = applyIncomingStaging(incoming, { rows: existing, demo: true })
    const mergedOasis = applied.rows.find((row) => row.id === oasis.id)
    const mergedHome = applied.rows.find((row) => row.id === home.id)
    assert.equal(mergedOasis.status, 'approved')
    assert.equal(mergedOasis.consent, true)
    assert.equal(mergedOasis.visit_model, 'walk_in')
    assert.equal(mergedOasis.reviewed_by, 'review-owner')
    assert.equal(mergedOasis.lat, 30.2672)
    assert.equal(mergedHome.status, 'excluded')
    assert.equal(mergedHome.exclude, true)
    assert.equal(applied.counts.pending_review, 2)
    assert.equal(applied.counts.excluded, 1)
    assert.equal(applied.upserted, 4)
    assert.equal(applied.updated, 2)
    assert.equal(applied.created, 2)
    assert.equal(applied.staging.demo, true)
  })
})
