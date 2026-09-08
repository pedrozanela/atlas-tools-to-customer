import { describe, expect, it } from 'vitest'
import { CERT_TABS, parseCertTab } from './certTabs'

describe('certification tab query parameter', () => {
  it.each(CERT_TABS)('accepts the supported tab %s', tab => {
    expect(parseCertTab(tab)).toBe(tab)
  })

  it('falls back safely for missing or unknown tabs', () => {
    expect(parseCertTab(null)).toBe('overview')
    expect(parseCertTab('admin')).toBe('overview')
  })
})
