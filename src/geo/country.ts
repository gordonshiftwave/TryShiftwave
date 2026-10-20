/** Blank country on the historical list means the United States. */
export function treatsAsUnitedStates(country: string | undefined): boolean {
  const value = (country ?? '').trim().toLowerCase()
  return (
    value === '' ||
    value === 'us' ||
    value === 'usa' ||
    value === 'u.s.' ||
    value === 'u.s.a.' ||
    value === 'united states' ||
    value === 'united states of america'
  )
}

const COUNTRY_CODES: Record<string, string> = {
  us: 'US',
  usa: 'US',
  'united states': 'US',
  'united states of america': 'US',
  uk: 'GB',
  'u.k.': 'GB',
  'united kingdom': 'GB',
  'great britain': 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  canada: 'CA',
  australia: 'AU',
  germany: 'DE',
  france: 'FR',
  belgium: 'BE',
  netherlands: 'NL',
  ireland: 'IE',
  'new zealand': 'NZ',
  mexico: 'MX',
  japan: 'JP',
  singapore: 'SG',
  malaysia: 'MY',
  panama: 'PA',
  portugal: 'PT',
  uae: 'AE',
  'united arab emirates': 'AE',
  ukraine: 'UA',
}

/** ISO country code when we know the name. Blank stays blank. */
export function countryCode(country: string | undefined): string {
  const value = (country ?? '').trim().toLowerCase()
  if (!value) return ''
  if (/^[a-z]{2}$/i.test(value)) return value.toUpperCase()
  return COUNTRY_CODES[value] ?? ''
}

export function sameCountry(
  placeCountry: string | undefined,
  code?: string,
  name?: string,
): boolean {
  const placeCode = treatsAsUnitedStates(placeCountry) ? 'US' : countryCode(placeCountry)
  const wanted = (code ?? '').trim().toUpperCase()
  if (wanted && placeCode && placeCode === wanted) return true
  const wantedName = (name ?? '').trim().toLowerCase()
  const placeName = (placeCountry ?? '').trim().toLowerCase()
  return Boolean(wantedName && placeName && wantedName === placeName)
}
