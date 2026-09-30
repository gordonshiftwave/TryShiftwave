import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createServer } from 'vite'

let server
let parse
let load
let app

before(async () => {
  server = await createServer({
    server: { middlewareMode: true, hmr: false },
    appType: 'custom',
    logLevel: 'error',
    optimizeDeps: { noDiscovery: true },
  })
  parse = await server.ssrLoadModule('/src/data/parse.ts')
  load = await server.ssrLoadModule('/src/data/load.ts')
  app = await server.ssrLoadModule('/src/data/feedCopy.ts')
})

after(async () => {
  await server?.close()
})

const listed = {
  id: 'example-wellness',
  name: 'Example Wellness',
  city: 'Austin',
  state: 'TX',
  zip: '78701',
  lat: 30.2672,
  lng: -97.7431,
  qualified: true,
  public_facing: true,
  demo_consent: true,
  visit_model: 'walk_in',
}

describe('browser parser fails closed', () => {
  it('does not default missing qualification, consent, or public-facing to true', () => {
    const row = parse.parseRow(listed, 0)
    assert.equal(row.qualified, true)
    const missing = parse.parseRow(
      {
        name: 'Missing Flags',
        lat: 30.27,
        lng: -97.74,
        visit_model: 'walk_in',
      },
      1,
    )
    assert.ok(missing)
    assert.equal(missing.qualified, false)
    assert.equal(missing.publicFacing, false)
    assert.equal(missing.demoConsent, false)
    assert.equal(parse.isPublicQualified(missing), false)
  })

  it('does not turn a missing visit_model into walk-in', () => {
    assert.equal(parse.parseVisitModel(undefined, true), 'none')
    assert.equal(parse.parseVisitModel('', true), 'none')
    assert.equal(parse.parseVisitModel(undefined, undefined), 'none')
    const row = parse.parseRow(
      {
        name: 'No Visit Model',
        lat: 30.27,
        lng: -97.74,
        qualified: true,
        public_facing: true,
        demo_consent: true,
        walk_in_ok: true,
      },
      2,
    )
    assert.equal(row.visitModel, 'none')
    assert.equal(parse.isPublicQualified(row), false)
  })

  it('rejects blank, null, and 0,0 coordinates', () => {
    assert.equal(parse.parseCoordinate(null), null)
    assert.equal(parse.parseCoordinate(''), null)
    assert.equal(parse.parseCoordinate('  '), null)
    assert.equal(parse.parseRow({ name: 'Blank', lat: '', lng: '' }, 3), null)
    assert.equal(parse.parseRow({ name: 'Null island', lat: 0, lng: 0 }, 4), null)
    assert.equal(parse.parseRow({ name: 'Missing coords', qualified: true }, 5), null)
  })

  it('does not keep feed notes on the parsed record', () => {
    const row = parse.parseRow({ ...listed, notes: 'internal staging note' }, 6)
    assert.equal(row.notes, '')
  })

  it('lists an explicit appointment row', () => {
    const row = parse.parseRow({ ...listed, visit_model: 'appointment', walk_in_ok: false }, 7)
    assert.equal(row.visitModel, 'appointment')
    assert.equal(parse.isPublicQualified(row), true)
  })
})

describe('remote feed does not restore the bundled snapshot', () => {
  it('fallbackAfterFailure never returns the snapshot url', () => {
    assert.equal(
      load.fallbackAfterFailure('https://feed.example/locations.json', '/TryShiftwave/locations.json'),
      null,
    )
  })

  it('a failed remote fetch yields an empty unavailable feed', async () => {
    const calls = []
    const fetchImpl = async (url) => {
      calls.push(String(url))
      return new Response('nope', { status: 503 })
    }
    const feed = await load.loadLocationsFrom(
      'https://feed.example/locations.json',
      '/TryShiftwave/locations.json',
      fetchImpl,
    )
    assert.deepEqual(calls, ['https://feed.example/locations.json'])
    assert.equal(feed.status, 'unavailable')
    assert.deepEqual(feed.places, [])
    assert.equal(feed.source, 'remote')
  })

  it('an empty remote feed stays empty', async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ locations: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    const feed = await load.loadLocationsFrom(
      'https://feed.example/locations.json',
      '/TryShiftwave/locations.json',
      fetchImpl,
    )
    assert.equal(feed.status, 'empty')
    assert.equal(feed.places.length, 0)
  })

  it('drops invalid rows and reports an invalid feed when none remain', async () => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({
          locations: [{ name: 'No flags', lat: 1, lng: 2, notes: 'secret' }],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )
    const feed = await load.loadLocationsFrom(
      'https://feed.example/locations.json',
      '/TryShiftwave/locations.json',
      fetchImpl,
    )
    assert.equal(feed.status, 'invalid')
    assert.equal(feed.dropped, 1)
    assert.equal(feed.places.length, 0)
  })
})

describe('visitor copy for a bad feed', () => {
  it('points people at the form below the finder without inventing a form id', () => {
    for (const status of ['unavailable', 'empty', 'invalid']) {
      const message = app.feedVisitorMessage(status)
      assert.match(message, /form below/i)
      assert.equal(message.includes('#'), false)
    }
    assert.equal(app.feedVisitorMessage('ok'), null)
  })
})
