import type { FeedStatus } from './load'

/** Visitor-facing copy. Does not name a Shopify form id — the page owner supplies that. */
export function feedVisitorMessage(status: FeedStatus | 'loading'): string | null {
  switch (status) {
    case 'unavailable':
      return 'The try-spot list didn’t load. Scroll to the request form below this finder and we’ll help you find a place.'
    case 'empty':
      return 'No public try-spots are listed right now. Scroll to the request form below this finder.'
    case 'invalid':
      return 'The try-spot list couldn’t be read. Scroll to the request form below this finder.'
    default:
      return null
  }
}
