import { describe, expect, it } from 'vitest'
import { findState } from '../data/usStates'

describe('findState', () => {
  it('matches name and abbreviation', () => {
    expect(findState('Colorado')?.abbr).toBe('CO')
    expect(findState('nj')?.name).toBe('New Jersey')
  })
})
