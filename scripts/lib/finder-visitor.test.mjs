import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { createServer } from 'vite'

let server
let parse
let distance
let directions
let groups
let geocode
let feed
let visitor
let types
let speech
let popupFit

const bannedPunctuation = /[\u2014\u2013\u2026\u2018\u2019\u201C\u201D]/

before(async () => {
    server = await createServer({
    server: { middlewareMode: true, hmr: { port: 24690 } },
    appType: 'custom',
    logLevel: 'error',
    optimizeDeps: { noDiscovery: true },
  })
  parse = await server.ssrLoadModule('/src/data/parse.ts')
  distance = await server.ssrLoadModule('/src/geo/distance.ts')
  directions = await server.ssrLoadModule('/src/geo/directions.ts')
  groups = await server.ssrLoadModule('/src/geo/groups.ts')
  geocode = await server.ssrLoadModule('/src/geo/geocode.ts')
  feed = await server.ssrLoadModule('/src/data/feedCopy.ts')
  visitor = await server.ssrLoadModule('/src/copy/visitor.ts')
  types = await server.ssrLoadModule('/src/types.ts')
  speech = await server.ssrLoadModule('/src/speech/usePushToTalk.ts')
  popupFit = await server.ssrLoadModule('/src/geo/popupFit.ts')
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

function assertPlain(value) {
  assert.equal(bannedPunctuation.test(String(value)), false, String(value))
}

describe('address, directions, and distance', () => {
  it('shows a street when the feed has one, and does not invent one', () => {
    const withStreet = parse.parseRow(
      {
        ...listed,
        street: '100 Congress Ave',
        phone: '5125551212',
        hours: 'Mon-Fri 9am-5pm',
        notes: 'private buyer note',
      },
      0,
    )
    assert.equal(withStreet.notes, '')
    assert.equal(withStreet.street, '100 Congress Ave')
    assert.equal(withStreet.phone, '(512) 555-1212')
    assert.equal(parse.formatAddress(withStreet), '100 Congress Ave, Austin, TX 78701')
    assert.equal(parse.addressLines(withStreet).street, '100 Congress Ave')
    assert.equal(parse.hasListedHours(withStreet.hours), true)

    const cityOnly = parse.parseRow(
      { ...listed, street: 'Austin, TX 78701', hours: 'Hours unavailable', notes: 'secret' },
      1,
    )
    assert.equal(cityOnly.street, '')
    assert.equal(cityOnly.notes, '')
    assert.equal(parse.formatAddress(cityOnly), 'Austin, TX 78701')
    assert.equal(parse.hasListedHours(cityOnly.hours), false)
    assert.equal(parse.hasListedHours(''), false)
  })

  it('builds a one-tap directions link for Google Maps or Apple Maps', () => {
    const place = parse.parseRow({ ...listed, street: '100 Congress Ave', notes: 'do not publish' }, 2)
    const google = directions.directionsHref(place, {
      origin: { lat: 30.27, lng: -97.74 },
      apple: false,
    })
    assert.match(google, /^https:\/\/www\.google\.com\/maps\/dir\/\?/)
    assert.match(google, /destination=/)
    assert.match(google, /origin=30\.27%2C-97\.74|origin=30\.27,-97\.74/)
    assert.equal(google.includes('do not publish'), false)
    assert.match(google, /100\+Congress\+Ave/)

    const apple = directions.directionsHref(place, { apple: true })
    assert.match(apple, /^https:\/\/maps\.apple\.com\/\?/)
    assert.match(apple, /daddr=/)
    assert.match(apple, /dirflg=d/)
    assert.equal(apple.includes('origin='), false)

    assert.equal(
      directions.prefersAppleMaps({
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        platform: 'iPhone',
        maxTouchPoints: 5,
      }),
      true,
    )
    assert.equal(
      directions.prefersAppleMaps({
        userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      }),
      true,
    )
    assert.equal(
      directions.prefersAppleMaps({
        userAgent: 'Mozilla/5.0 (Linux; Android 14)',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      }),
      false,
    )
    assert.equal(
      directions.prefersAppleMaps({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      }),
      false,
    )
  })

  it('sorts places nearest first and groups pins that share a point', () => {
    const origin = { lat: 33.45, lng: -112.07 }
    const ranked = distance.rankByDistance(origin, [
      { id: 'far', lat: 40.71, lng: -74.0 },
      { id: 'near', lat: 33.46, lng: -112.07 },
      { id: 'mid', lat: 34.05, lng: -118.24 },
    ])
    assert.deepEqual(
      ranked.map((place) => place.id),
      ['near', 'mid', 'far'],
    )
    assert.ok(ranked[0].distanceMiles < ranked[1].distanceMiles)
    assert.match(distance.formatMiles(ranked[0].distanceMiles), /mi$/)

    const grouped = groups.groupByCoordinate([
      { id: 'a', lat: 33.4484367, lng: -112.074141 },
      { id: 'b', lat: 33.4484367, lng: -112.074141 },
      { id: 'c', lat: 33.4942189, lng: -111.926018 },
    ])
    assert.equal(grouped.length, 2)
    assert.deepEqual(
      grouped[0].map((place) => place.id),
      ['a', 'b'],
    )
  })

  it('treats only a bare ZIP as a ZIP search and fails closed when geocoders fail', async () => {
    assert.equal(geocode.isZipQuery('85004'), true)
    assert.equal(geocode.isZipQuery('85004-1234'), true)
    assert.equal(geocode.isZipQuery('1 N Central Ave, Phoenix, AZ'), false)
    assert.equal(geocode.isZipQuery('Phoenix, AZ 85004'), false)

    const sleeps = []
    const state = { last: 1000 }
    await geocode.pace(1100, state, () => 1500, async (ms) => {
      sleeps.push(ms)
    })
    assert.deepEqual(sleeps, [600])
    await geocode.pace(1100, state, () => 4000, async (ms) => {
      sleeps.push(ms)
    })
    assert.deepEqual(sleeps, [600])

    const original = globalThis.fetch
    try {
      const urls = []
      globalThis.fetch = async (url) => {
        const href = String(url)
        urls.push(href)
        if (href.includes('zippopotam')) {
          return new Response(
            JSON.stringify({
              places: [
                {
                  'place name': 'Phoenix',
                  state: 'Arizona',
                  'state abbreviation': 'AZ',
                  latitude: '33.4557',
                  longitude: '-112.0686',
                },
              ],
            }),
            { status: 200 },
          )
        }
        if (href.includes('photon')) {
          return new Response(
            JSON.stringify({
              features: [
                {
                  geometry: { coordinates: [8.5, 47.3] },
                  properties: { name: 'Zurich', countrycode: 'CH', osm_key: 'place', osm_value: 'city' },
                },
                {
                  geometry: { coordinates: [-97.7431, 30.2672] },
                  properties: {
                    name: 'Austin',
                    state: 'Texas',
                    countrycode: 'US',
                    osm_key: 'place',
                    osm_value: 'city',
                  },
                },
              ],
            }),
            { status: 200 },
          )
        }
        return new Response('no', { status: 429 })
      }

      const zip = await geocode.geocodeQuery('85004')
      assert.equal(zip.kind, 'zip')
      assert.match(zip.label, /Phoenix, AZ 85004/)
      assert.equal(urls.some((href) => href.includes('nominatim')), false)

      urls.length = 0
      const street = await geocode.geocodeQuery('1 N Central Ave, Phoenix, AZ')
      assert.equal(urls.some((href) => href.includes('zippopotam')), false)
      assert.equal(urls.some((href) => href.includes('nominatim')), true)
      assert.equal(urls.some((href) => href.includes('photon')), true)
      assert.equal(street.kind, 'city')
      assert.match(street.label, /Austin/)

      urls.length = 0
      globalThis.fetch = async () => {
        throw new Error('offline')
      }
      assert.equal(await geocode.geocodeQuery('Austin, TX'), null)
    } finally {
      globalThis.fetch = original
    }
  })
})

describe('visitor copy stays plain', () => {
  it('avoids em dashes and curly punctuation in on-screen sentences', () => {
    assert.equal(types.visitModelLabel('appointment'), 'By appointment. Call to schedule.')
    assertPlain(types.visitModelLabel('appointment'))
    for (const value of Object.values(visitor.visitorCopy)) {
      if (typeof value === 'function') {
        assertPlain(value(2))
      } else {
        assertPlain(value)
      }
    }
    for (const status of ['unavailable', 'empty', 'invalid']) {
      const message = feed.feedVisitorMessage(status)
      assertPlain(message)
      assert.match(message, /form below/i)
    }
    for (const note of Object.values(speech.speechVisitorNotes)) assertPlain(note)
    assertPlain(visitor.placesNearLabel(1, 'Phoenix, AZ'))
    assertPlain(visitor.noneWithinLabel(50, 'Austin, TX'))
    assertPlain(visitor.nothingNearbyBody(50, 'Austin, TX'))
  })
})

describe('map popup stays inside the map', () => {
  it('pans a popup that hangs below the map back upward', () => {
    const frame = { left: 0, top: 0, right: 390, bottom: 280 }
    const hanging = { left: 40, top: 160, right: 300, bottom: 400 }
    const shift = popupFit.panToKeepBoxInside(hanging, frame)
    assert.equal(shift.x, 0)
    assert.equal(shift.y, 128)
  })

  it('leaves a popup that already fits', () => {
    const frame = { left: 0, top: 0, right: 390, bottom: 280 }
    const inside = { left: 40, top: 24, right: 280, bottom: 200 }
    const shift = popupFit.panToKeepBoxInside(inside, frame)
    assert.deepEqual(shift, { x: 0, y: 0 })
  })

  it('caps the card so a tall popup can scroll inside a short map', () => {
    assert.equal(popupFit.popupCardMaxHeight(220), 172)
    assert.equal(popupFit.popupCardMaxHeight(80), 96)
  })
})
