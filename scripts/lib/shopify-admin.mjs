/**
 * Dev Dashboard Shopify Admin client (client credentials, not a shpat_ token).
 *
 * Token: POST /admin/oauth/access_token grant_type=client_credentials
 * Scope available today: read_orders. Cache ~24h and refresh before expiry.
 */

import { existsSync, readFileSync } from 'node:fs'

import { EXCLUDE_TAG, INTAKE_TAG } from './shopify-staging.mjs'

export const DEFAULT_API_VERSION = '2026-07'
export const TOKEN_REFRESH_SKEW_MS = 60_000
export const ORDERS_PAGE_SIZE = 50
export const MAX_ORDER_PAGES = 100
export const DEFAULT_TOKEN_TTL_SEC = 86399

export const TAGGED_ORDERS_SEARCH = `(tag:"${INTAKE_TAG}") OR (tag:"${EXCLUDE_TAG}")`

export const TAGGED_ORDERS_QUERY = `#graphql
query StageTaggedOrders($query: String!, $cursor: String) {
  orders(first: ${ORDERS_PAGE_SIZE}, after: $cursor, query: $query) {
    pageInfo {
      hasNextPage
      endCursor
    }
    edges {
      node {
        id
        name
        email
        phone
        note
        tags
        shippingAddress {
          company
          name
          address1
          city
          provinceCode
          province
          zip
          phone
        }
        billingAddress {
          company
          name
          address1
          city
          provinceCode
          province
          zip
          phone
        }
      }
    }
  }
}
`

/**
 * Load KEY=VALUE pairs from a local .env without overriding real env vars.
 * Never log values — files may contain client secrets.
 */
export function loadLocalEnv(filePath = '.env', env = process.env, fs = { existsSync, readFileSync }) {
  if (!fs.existsSync(filePath)) return env
  const text = fs.readFileSync(filePath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    if (!key) continue
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (env[key] == null || env[key] === '') env[key] = value
  }
  return env
}

export function normalizeShopDomain(shop) {
  let s = String(shop ?? '').trim().toLowerCase()
  s = s.replace(/^https?:\/\//, '')
  s = s.replace(/\/.*$/, '')
  if (s.endsWith('.myshopify.com')) s = s.slice(0, -'.myshopify.com'.length)
  if (!s) {
    throw new Error('SHOPIFY_SHOP is required (myshopify subdomain, e.g. slow-wave-0f67)')
  }
  if (!/^[a-z0-9][a-z0-9-]*$/.test(s)) {
    throw new Error('SHOPIFY_SHOP should be the myshopify subdomain only (e.g. slow-wave-0f67)')
  }
  return s
}

export const MISSING_CREDENTIALS_MESSAGE = [
  'Set SHOPIFY_SHOP, SHOPIFY_CLIENT_ID, and SHOPIFY_CLIENT_SECRET in the environment (or a local .env).',
  'Use Dev Dashboard client credentials — not a legacy shpat_ Admin token.',
  'Do not paste secrets or access tokens into chat.',
  'CSV fallback: node scripts/stage-from-shopify-csv.mjs <export.csv>',
].join(' ')

export function readShopifyCredentials(env = process.env) {
  const shopRaw = String(env.SHOPIFY_SHOP ?? '').trim()
  const clientId = String(env.SHOPIFY_CLIENT_ID ?? '').trim()
  const clientSecret = String(env.SHOPIFY_CLIENT_SECRET ?? '').trim()
  const apiVersion = String(env.SHOPIFY_API_VERSION ?? DEFAULT_API_VERSION).trim() || DEFAULT_API_VERSION
  if (!shopRaw || !clientId || !clientSecret) {
    throw new Error(MISSING_CREDENTIALS_MESSAGE)
  }
  return {
    shop: normalizeShopDomain(shopRaw),
    clientId,
    clientSecret,
    apiVersion,
  }
}

export function createShopifyAdminClient({
  shop,
  clientId,
  clientSecret,
  apiVersion = DEFAULT_API_VERSION,
  fetchImpl = globalThis.fetch,
  now = () => Date.now(),
  refreshSkewMs = TOKEN_REFRESH_SKEW_MS,
} = {}) {
  const shopDomain = normalizeShopDomain(shop)
  let accessToken = null
  let tokenExpiresAt = 0

  async function getAccessToken() {
    if (accessToken && now() < tokenExpiresAt - refreshSkewMs) return accessToken

    const url = `https://${shopDomain}.myshopify.com/admin/oauth/access_token`
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })
    const text = await response.text()
    let payload = {}
    try {
      payload = text ? JSON.parse(text) : {}
    } catch {
      payload = {}
    }
    if (!response.ok || !payload.access_token) {
      const detail = payload.error_description || payload.error || `HTTP ${response.status}`
      throw new Error(`Shopify token request failed (${response.status}): ${detail}`)
    }
    accessToken = payload.access_token
    const expiresIn = Number(payload.expires_in)
    tokenExpiresAt = now() + (Number.isFinite(expiresIn) ? expiresIn * 1000 : DEFAULT_TOKEN_TTL_SEC * 1000)
    return accessToken
  }

  async function graphql(query, variables = {}) {
    const token = await getAccessToken()
    const url = `https://${shopDomain}.myshopify.com/admin/api/${apiVersion}/graphql.json`
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(`Shopify GraphQL HTTP ${response.status}`)
    }
    if (payload.errors?.length) {
      const messages = payload.errors.map((err) => err.message).join('; ')
      throw new Error(`Shopify GraphQL errors: ${messages}`)
    }
    return payload.data
  }

  async function fetchTaggedOrders({ query = TAGGED_ORDERS_SEARCH } = {}) {
    const nodes = []
    let cursor = null
    for (let page = 0; page < MAX_ORDER_PAGES; page++) {
      const data = await graphql(TAGGED_ORDERS_QUERY, { query, cursor })
      const conn = data?.orders
      for (const edge of conn?.edges ?? []) {
        if (edge?.node) nodes.push(edge.node)
      }
      if (!conn?.pageInfo?.hasNextPage) break
      cursor = conn.pageInfo.endCursor
      if (!cursor) break
    }
    return nodes
  }

  return {
    shop: shopDomain,
    apiVersion,
    getAccessToken,
    graphql,
    fetchTaggedOrders,
  }
}
