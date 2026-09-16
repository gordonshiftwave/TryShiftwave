const TRUTHY = new Set(['true', 'yes', 'y', '1', 'qualified', 'public', 'demo', 'approved'])

export function isQualifiedFlag(value: string | boolean | undefined | null): boolean {
  if (typeof value === 'boolean') return value
  if (value == null) return false
  return TRUTHY.has(String(value).trim().toLowerCase())
}

export function slugId(name: string, zip: string): string {
  const base = `${name}-${zip}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return base || 'location'
}
