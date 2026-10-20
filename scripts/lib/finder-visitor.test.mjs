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
let nearby
let locate

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
  nearby = await server.ssrLoadModule('/src/geo/nearby.ts')
  locate = await server.ssrLoadModule('/src/geo/locate.ts')
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

function placeRow(id, state, city, distanceMiles) {
  return {
    id,
    name: city,
    street: '',
    city,
    state,
    zip: '',
    country: '',
    lat: 0,
    lng: 0,
    distanceMiles,
  }
}

function hit(lat, lon, postcode, city, country, countryCode, cityKey = 'city') {
  return {
    lat,
    lon,
    display_name: `${postcode}, ${city}, ${country}`,
    addresstype: 'postcode',
    type: 'postcode',
    address: {
      postcode,
      [cityKey]: city,
      country,
      country_code: countryCode,
    },
  }
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
      assert.match(street.label, /Zurich/)
      assert.equal(street.countryCode, 'CH')
      assert.equal(urls.some((href) => href.includes('countrycodes=us')), false)

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
    assertPlain(visitor.noneWithinLabel(50, 'London', 'km'))
    assertPlain(visitor.nothingNearbyBody(50, 'London', 'km'))
    assert.match(visitor.nothingNearbyBody(50, 'London', 'km'), /enquiry form below this finder/)
    assert.match(visitor.nothingNearbyBody(50, 'London', 'km'), /kilometers/)
    assert.match(visitor.noneWithinLabel(25, 'Phoenix, AZ', 'mi'), /miles/)
  })
})

describe('worldwide search and units', () => {
  it('uses miles only for a US place and kilometers everywhere else', () => {
    assert.equal(distance.distanceUnit('US'), 'mi')
    assert.equal(distance.distanceUnit('us'), 'mi')
    assert.equal(distance.distanceUnit('GB'), 'km')
    assert.equal(distance.distanceUnit(undefined), 'km')
    assert.ok(Math.abs(distance.radiusInMiles(50, 'km') - 50 / 1.609344) < 1e-9)
    assert.equal(distance.radiusInMiles(50, 'mi'), 50)
    assert.match(distance.formatDistance(31, 'km'), /km$/)
    assert.match(distance.formatDistance(31, 'mi'), /mi$/)
  })

  it('geocodes postal codes outside the United States', async () => {
    assert.equal(geocode.isZipQuery('SW1A 1AA'), false)
    assert.equal(geocode.isZipQuery('M5V'), false)
    assert.equal(geocode.isZipQuery('2000'), false)
    assert.equal(geocode.isZipQuery('10115'), true)

    const original = globalThis.fetch
    try {
      const urls = []
      globalThis.fetch = async (url) => {
        const href = String(url)
        urls.push(href)
        if (href.includes('zippopotam')) return new Response('no', { status: 404 })
        if (href.includes('nominatim') && href.includes('SW1A')) {
          return new Response(
            JSON.stringify([
              {
                lat: '51.501',
                lon: '-0.141',
                display_name: 'Westminster, London, SW1A 1AA, United Kingdom',
                addresstype: 'postcode',
                type: 'postcode',
                address: {
                  city: 'London',
                  postcode: 'SW1A 1AA',
                  country: 'United Kingdom',
                  country_code: 'gb',
                },
              },
            ]),
            { status: 200 },
          )
        }
        if (href.includes('nominatim') && href.includes('10115')) {
          return new Response(
            JSON.stringify([
              {
                lat: '52.532',
                lon: '13.384',
                display_name: 'Berlin, 10115, Germany',
                addresstype: 'postcode',
                type: 'postcode',
                address: {
                  city: 'Berlin',
                  postcode: '10115',
                  country: 'Germany',
                  country_code: 'de',
                },
              },
            ]),
            { status: 200 },
          )
        }
        return new Response('no', { status: 404 })
      }

      const london = await geocode.geocodeQuery('SW1A 1AA')
      assert.equal(urls.some((href) => href.includes('zippopotam')), false)
      assert.equal(urls.some((href) => href.includes('countrycodes=us')), false)
      assert.equal(london.countryCode, 'GB')
      assert.match(london.label, /London/)
      assert.match(london.label, /SW1A 1AA/)
      assert.match(london.label, /United Kingdom/)
      assert.match(distance.formatDistance(12, distance.distanceUnit(london.countryCode)), /km$/)

      urls.length = 0
      const berlin = await geocode.geocodeQuery('10115')
      assert.equal(urls.some((href) => href.includes('zippopotam')), true)
      assert.equal(urls.filter((href) => href.includes('nominatim')).length, 1)
      assert.equal(berlin.countryCode, 'DE')
      assert.match(berlin.label, /Berlin/)
      assert.equal(distance.distanceUnit(berlin.countryCode), 'km')
    } finally {
      globalThis.fetch = original
    }
  })

  it('asks which country a shared numeric code belongs to, and keeps a real US ZIP', async () => {
    const original = globalThis.fetch
    try {
      const urls = []
      globalThis.fetch = async (url) => {
        const href = String(url)
        urls.push(href)
        const asked = (() => {
          try {
            return new URL(href).searchParams.get('q') ?? ''
          } catch {
            return ''
          }
        })()
        if (href.includes('zippopotam') && href.endsWith('/10115')) {
          return new Response(
            JSON.stringify({
              places: [
                {
                  'place name': 'New York City',
                  state: 'New York',
                  'state abbreviation': 'NY',
                  latitude: '40.77',
                  longitude: '-73.96',
                },
              ],
            }),
            { status: 200 },
          )
        }
        if (href.includes('zippopotam')) return new Response('no', { status: 404 })
        if (href.includes('nominatim') && asked === '2000') {
          return new Response(
            JSON.stringify([
              hit('41.3', '19.4', '2000', 'Durrës', 'Albania', 'al'),
              hit('-33.87', '151.21', '2000', 'Sydney', 'Australia', 'au'),
              hit('-33.88', '151.22', '2000', 'Sydney', 'Australia', 'au'),
            ]),
            { status: 200 },
          )
        }
        if (href.includes('nominatim') && asked === '01000') {
          return new Response(
            JSON.stringify([
              hit('27.9', '-0.3', '01000', 'Ouled Ahmed Tammi', 'Algeria', 'dz', 'village'),
              hit('19.43', '-99.13', '01000', 'Mexico City', 'Mexico', 'mx'),
            ]),
            { status: 200 },
          )
        }
        if (href.includes('nominatim') && asked === '3000') {
          return new Response(
            JSON.stringify([hit('-37.81', '144.96', '3000', 'Melbourne', 'Australia', 'au')]),
            { status: 200 },
          )
        }
        return new Response('no', { status: 404 })
      }

      urls.length = 0
      const nyc = await geocode.geocodeSearch('10115')
      assert.equal(nyc.type, 'place')
      assert.equal(nyc.place.countryCode, 'US')
      assert.match(nyc.place.label, /New York City, NY 10115/)
      assert.equal(urls.some((href) => href.includes('nominatim')), false)

      const shared = await geocode.geocodeSearch('2000')
      assert.equal(shared.type, 'choices')
      assert.equal(shared.choices.filter((row) => row.countryCode === 'AU').length, 1)
      assert.match(shared.choices.find((row) => row.countryCode === 'AU').label, /Sydney/)
      assert.match(shared.choices.find((row) => row.countryCode === 'AL').label, /Albania/)
      assert.equal(await geocode.geocodeQuery('2000'), null)

      const mexico = await geocode.geocodeSearch('01000')
      assert.equal(mexico.type, 'choices')
      assert.equal(mexico.choices.some((row) => row.countryCode === 'MX'), true)

      const only = await geocode.geocodeSearch('3000')
      assert.equal(only.type, 'place')
      assert.equal(only.place.countryCode, 'AU')
      assert.match(only.place.label, /Melbourne/)

      assert.match(visitor.visitorCopy.codeChoices('2000'), /Pick a place/)
      assertPlain(visitor.visitorCopy.codeChoices('2000'))
      assertPlain(visitor.visitorCopy.regionDistances)
    } finally {
      globalThis.fetch = original
    }
  })

  it('reads international rows and still requires the public gate', () => {
    const london = parse.parseRow(
      {
        Clinic: 'Example London',
        City: 'London',
        State: 'N/A',
        Zipcode: 'SW1A 1AA',
        Country: 'United Kingdom',
        Contact: '+44 20 7946 0958',
        lat: 51.501,
        lng: -0.141,
        qualified: true,
        public_facing: true,
        demo_consent: true,
        visit_model: 'appointment',
      },
      9,
    )
    assert.equal(london.phone, '+44 20 7946 0958')
    assert.equal(london.zip, 'SW1A 1AA')
    assert.equal(london.state, '')
    assert.equal(london.country, 'United Kingdom')
    assert.equal(parse.formatAddress(london), 'London SW1A 1AA, United Kingdom')
    assert.equal(parse.isPublicQualified(london), true)
    assert.match(directions.directionsHref(london, { apple: false }), /United\+Kingdom/)

    const dubai = parse.parseRow(
      {
        name: 'Formation',
        city: 'Dubai',
        state: 'N/A',
        country: 'United Arab Emirates',
        contact: '971 58 598 8626',
        lat: 25.2,
        lng: 55.27,
        qualified: true,
        public_facing: true,
        demo_consent: true,
        visit_model: 'walk_in',
      },
      10,
    )
    assert.equal(dubai.phone, '971 58 598 8626')
    assert.equal(parse.isPublicQualified(dubai), true)

    const emailOnly = parse.parseRow(
      {
        name: 'Glow',
        city: 'Lisbon',
        country: 'Portugal',
        contact: 'hello@example.pt',
        lat: 38.72,
        lng: -9.14,
        'Can we send people there to Demo?': 'YES',
      },
      11,
    )
    assert.equal(emailOnly.email, 'hello@example.pt')
    assert.equal(emailOnly.phone, '')
    assert.equal(emailOnly.demoConsent, true)
    assert.equal(emailOnly.qualified, false)
    assert.equal(emailOnly.publicFacing, false)
    assert.equal(emailOnly.visitModel, 'none')
    assert.equal(parse.isPublicQualified(emailOnly), false)

    assert.equal(locate.currentPositionOptions.maximumAge, 0)

    const texas = {
      lat: 31.97,
      lng: -99.9,
      label: 'Texas',
      kind: 'state',
      state: 'Texas',
      countryCode: 'US',
    }
    const ranked = [
      placeRow('near', 'TX', 'Abilene', 40),
      placeRow('far', 'TX', 'Houston', 200),
      placeRow('other', 'OK', 'Tulsa', 30),
    ]
    const wide = nearby.selectPlaces(texas, ranked, 50)
    assert.equal(wide.regionWide, true)
    assert.deepEqual(
      wide.places.map((row) => row.id),
      ['near', 'far'],
    )
    const city = nearby.selectPlaces({ ...texas, kind: 'city', state: 'TX', label: 'Abilene, TX' }, ranked, 50)
    assert.equal(city.regionWide, false)
    assert.deepEqual(
      city.places.map((row) => row.id),
      ['near', 'other'],
    )
    const usa = nearby.selectPlaces(
      { ...texas, kind: 'country', state: undefined, country: 'United States', countryCode: 'US', label: 'United States' },
      ranked,
      25,
    )
    assert.equal(usa.regionWide, true)
    assert.deepEqual(
      usa.places.map((row) => row.id),
      ['near', 'far', 'other'],
    )
    const france = nearby.selectPlaces(
      { lat: 46.2, lng: 2.2, label: 'France', kind: 'country', country: 'France', countryCode: 'FR' },
      ranked,
      50,
    )
    assert.equal(france.regionWide, false)
    assert.deepEqual(
      france.places.map((row) => row.id),
      ['near', 'other'],
    )

    assert.equal(
      parse.parseRow(
        {
          Clinic: 'No coords',
          Country: 'France',
          'Can we send people there to Demo?': 'YES',
        },
        12,
      ),
      null,
    )
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
