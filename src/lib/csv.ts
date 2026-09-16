export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  const src = text.replace(/^\uFEFF/, '')

  const pushRow = () => {
    if (row.some((value) => value !== '')) rows.push(row)
    row = []
  }

  for (let i = 0; i < src.length; i += 1) {
    const char = src[i]
    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(cell.trim())
      cell = ''
    } else if (char === '\n') {
      row.push(cell.trim())
      cell = ''
      pushRow()
    } else if (char === '\r') {
      continue
    } else {
      cell += char
    }
  }

  row.push(cell.trim())
  pushRow()
  return rows
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[_/]+/g, ' ').replace(/\s+/g, ' ')
}

const FIELD_ALIASES: Record<string, string[]> = {
  id: ['id', 'location id'],
  name: ['name', 'location', 'location name', 'business', 'studio', 'clinic'],
  address: ['address', 'street', 'street address', 'addr'],
  city: ['city'],
  state: ['state', 'state region', 'province'],
  zip: ['zip', 'zip code', 'zipcode', 'postal', 'postal code'],
  phone: ['phone', 'phone number', 'tel', 'telephone'],
  email: ['email', 'e-mail', 'e mail'],
  hours: ['hours', 'hours of operation', 'open', 'opening hours'],
  lat: ['lat', 'latitude'],
  lng: ['lng', 'lon', 'long', 'longitude'],
  qualified: [
    'qualified',
    'qualification',
    'qualification flag',
    'public',
    'demo',
    'approved',
    'map',
  ],
  category: ['category', 'type', 'location type'],
  notes: ['notes', 'note'],
}

function headerIndex(headers: string[]): Record<string, number> {
  const normalized = headers.map(normalizeHeader)
  const index: Record<string, number> = {}
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const found = normalized.findIndex((header) => aliases.includes(header))
    if (found >= 0) index[field] = found
  }
  return index
}

function cell(row: string[], index: Record<string, number>, field: string): string {
  const at = index[field]
  if (at == null) return ''
  return row[at] ?? ''
}

export { headerIndex, cell, normalizeHeader }
