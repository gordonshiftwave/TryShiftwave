import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  DEFAULT_API_VERSION,
  MISSING_CREDENTIALS_MESSAGE,
  TAGGED_ORDERS_QUERY,
  TAGGED_ORDERS_SEARCH,
  createShopifyAdminClient,
  loadLocalEnv,
  normalizeShopDomain,
  readShopifyCredentials,
} from './shopify-admin.mjs'
import graphqlFixture from './fixtures/shopify-graphql-orders.json' with { type: 'json' }

function jsonResponse(status, body) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
    json: async () => JSON.parse(text),
  }
}

describe('Shopify admin client credentials', () => {
  it('normalizes myshopify shop input', () => {
    assert.equal(normalizeShopDomain('slow-wave-0f67'), 'slow-wave-0f67')
    assert.equal(normalizeShopDomain('https://Slow-Wave-0f67.myshopify.com/'), 'slow-wave-0f67')
  })

  it('requires Dev Dashboard env vars and never asks for a shpat_ token', () => {
    assert.throws(() => readShopifyCredentials({}), (err) => {
      assert.match(err.message, /SHOPIFY_CLIENT_SECRET/)
      assert.match(err.message, /Do not paste/)
      assert.equal(err.message, MISSING_CREDENTIALS_MESSAGE)
      assert.equal(err.message.includes('shpat_'), true)
      return true
    })
    const creds = readShopifyCredentials({
      SHOPIFY_SHOP: 'slow-wave-0f67.myshopify.com',
      SHOPIFY_CLIENT_ID: 'id',
      SHOPIFY_CLIENT_SECRET: 'secret',
    })
    assert.equal(creds.shop, 'slow-wave-0f67')
    assert.equal(creds.apiVersion, DEFAULT_API_VERSION)
  })

  it('loads .env without overriding live env', () => {
    const env = { SHOPIFY_SHOP: 'from-env' }
    const fs = {
      existsSync: () => true,
      readFileSync: () => 'SHOPIFY_SHOP=from-file\nSHOPIFY_CLIENT_ID=file-id\n',
    }
    loadLocalEnv('.env', env, fs)
    assert.equal(env.SHOPIFY_SHOP, 'from-env')
    assert.equal(env.SHOPIFY_CLIENT_ID, 'file-id')
  })

  it('caches the client-credentials token and refreshes before expiry', async () => {
    let now = 1_000_000
    let tokenCalls = 0
    const fetchImpl = async (url, init) => {
      if (String(url).includes('/admin/oauth/access_token')) {
        tokenCalls += 1
        const body = new URLSearchParams(init.body)
        assert.equal(body.get('grant_type'), 'client_credentials')
        assert.equal(body.get('client_id'), 'id')
        assert.equal(body.get('client_secret'), 'secret')
        assert.equal(init.method, 'POST')
        return jsonResponse(200, {
          access_token: `tok-${tokenCalls}`,
          scope: 'read_orders',
          expires_in: 86399,
        })
      }
      return jsonResponse(200, { data: { ok: true }, errors: [] })
    }
    const client = createShopifyAdminClient({
      shop: 'slow-wave-0f67',
      clientId: 'id',
      clientSecret: 'secret',
      fetchImpl,
      now: () => now,
    })
    assert.equal(await client.getAccessToken(), 'tok-1')
    now += 60_000
    assert.equal(await client.getAccessToken(), 'tok-1')
    now += 86_400_000
    assert.equal(await client.getAccessToken(), 'tok-2')
    assert.equal(tokenCalls, 2)
  })

  it('searches OPS.md tags and paginates GraphQL orders', async () => {
    assert.match(TAGGED_ORDERS_SEARCH, /tag:"sw-business"/)
    assert.match(TAGGED_ORDERS_SEARCH, /tag:"sw-finder-exclude"/)
    assert.match(TAGGED_ORDERS_QUERY, /orders\(/)
    assert.match(TAGGED_ORDERS_QUERY, /shippingAddress/)

    const pages = [
      {
        data: {
          orders: {
            pageInfo: { hasNextPage: true, endCursor: 'c1' },
            edges: [{ node: graphqlFixture.orders[0] }, { node: graphqlFixture.orders[1] }],
          },
        },
      },
      {
        data: {
          orders: {
            pageInfo: { hasNextPage: false, endCursor: 'c2' },
            edges: [{ node: graphqlFixture.orders[2] }, { node: graphqlFixture.orders[3] }],
          },
        },
      },
    ]
    let graphqlCalls = 0
    const fetchImpl = async (url, init) => {
      if (String(url).includes('/admin/oauth/access_token')) {
        return jsonResponse(200, { access_token: 'tok', expires_in: 86399 })
      }
      graphqlCalls += 1
      assert.match(String(url), /\/admin\/api\/2026-07\/graphql\.json$/)
      assert.equal(init.headers['X-Shopify-Access-Token'], 'tok')
      const payload = JSON.parse(init.body)
      assert.equal(payload.variables.query, TAGGED_ORDERS_SEARCH)
      if (graphqlCalls === 1) assert.equal(payload.variables.cursor, null)
      if (graphqlCalls === 2) assert.equal(payload.variables.cursor, 'c1')
      return jsonResponse(200, pages[graphqlCalls - 1])
    }
    const client = createShopifyAdminClient({
      shop: 'slow-wave-0f67',
      clientId: 'id',
      clientSecret: 'secret',
      fetchImpl,
    })
    const nodes = await client.fetchTaggedOrders()
    assert.equal(graphqlCalls, 2)
    assert.equal(nodes.length, 4)
    assert.equal(nodes[0].name, '#1042')
    assert.equal(nodes[3].name, '#1046')
  })
})
