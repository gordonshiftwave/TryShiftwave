import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  csvOrdersToStagingRows,
  isPublishable,
  mergeStagingRows,
  parseCsv,
  selectApproved,
  toPublicLocation,
} from './shopify-staging.mjs'

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
