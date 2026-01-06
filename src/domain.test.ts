/**
 * Tests for domain.ts - Domain validation utilities
 */

import { describe, expect, it } from 'bun:test'
import {
  extractHostname,
  getExpectedHostname,
  getMainDomain,
  isExactHostnameMatch,
  isSameSite,
  normalizeDomain,
  validateUrlDomain,
} from './domain.js'
import type { SEOCheckerConfig } from './types.js'

// Helper to create a minimal config
function createConfig(overrides: Partial<SEOCheckerConfig> = {}): SEOCheckerConfig {
  return {
    distPath: '/dist',
    baseUrl: 'https://example.com',
    languages: ['en'],
    defaultLanguage: 'en',
    ...overrides,
  }
}

describe('extractHostname', () => {
  it('should extract hostname from valid URL', () => {
    expect(extractHostname('https://example.com/page')).toBe('example.com')
  })

  it('should extract hostname with www', () => {
    expect(extractHostname('https://www.example.com/page')).toBe('www.example.com')
  })

  it('should extract hostname with subdomain', () => {
    expect(extractHostname('https://blog.example.com/page')).toBe('blog.example.com')
  })

  it('should extract hostname with port', () => {
    expect(extractHostname('https://example.com:8080/page')).toBe('example.com')
  })

  it('should return null for invalid URL', () => {
    expect(extractHostname('not a url')).toBe(null)
  })

  it('should return null for empty string', () => {
    expect(extractHostname('')).toBe(null)
  })

  it('should handle http URLs', () => {
    expect(extractHostname('http://example.com')).toBe('example.com')
  })
})

describe('normalizeDomain', () => {
  it('should remove www. prefix', () => {
    expect(normalizeDomain('www.example.com')).toBe('example.com')
  })

  it('should convert to lowercase', () => {
    expect(normalizeDomain('EXAMPLE.COM')).toBe('example.com')
  })

  it('should handle both www and uppercase', () => {
    expect(normalizeDomain('WWW.EXAMPLE.COM')).toBe('example.com')
  })

  it('should not modify domain without www', () => {
    expect(normalizeDomain('example.com')).toBe('example.com')
  })

  it('should handle subdomains', () => {
    expect(normalizeDomain('blog.example.com')).toBe('blog.example.com')
  })
})

describe('getMainDomain', () => {
  it('should extract main domain from baseUrl', () => {
    const config = createConfig({ baseUrl: 'https://example.com' })
    expect(getMainDomain(config)).toBe('example.com')
  })

  it('should remove www from baseUrl', () => {
    const config = createConfig({ baseUrl: 'https://www.example.com' })
    expect(getMainDomain(config)).toBe('example.com')
  })

  it('should use mainDomain from config if provided', () => {
    const config = createConfig({
      baseUrl: 'https://www.example.com',
      mainDomain: 'mysite.org',
    })
    expect(getMainDomain(config)).toBe('mysite.org')
  })

  it('should normalize mainDomain from config', () => {
    const config = createConfig({
      baseUrl: 'https://example.com',
      mainDomain: 'WWW.MYSITE.ORG',
    })
    expect(getMainDomain(config)).toBe('mysite.org')
  })

  it('should return empty string for invalid baseUrl', () => {
    const config = createConfig({ baseUrl: 'not a url' })
    expect(getMainDomain(config)).toBe('')
  })
})

describe('getExpectedHostname', () => {
  it('should return hostname from baseUrl', () => {
    const config = createConfig({ baseUrl: 'https://example.com' })
    expect(getExpectedHostname(config)).toBe('example.com')
  })

  it('should preserve www in baseUrl', () => {
    const config = createConfig({ baseUrl: 'https://www.example.com' })
    expect(getExpectedHostname(config)).toBe('www.example.com')
  })

  it('should convert to lowercase', () => {
    const config = createConfig({ baseUrl: 'https://EXAMPLE.COM' })
    expect(getExpectedHostname(config)).toBe('example.com')
  })

  it('should return empty string for invalid baseUrl', () => {
    const config = createConfig({ baseUrl: 'invalid' })
    expect(getExpectedHostname(config)).toBe('')
  })
})

describe('validateUrlDomain', () => {
  describe('valid URLs', () => {
    it('should validate exact match', () => {
      const config = createConfig({ baseUrl: 'https://example.com' })
      const result = validateUrlDomain('https://example.com/page', config)
      expect(result.isValid).toBe(true)
      expect(result.hostname).toBe('example.com')
      expect(result.issue).toBeUndefined()
    })

    it('should validate exact match with www', () => {
      const config = createConfig({ baseUrl: 'https://www.example.com' })
      const result = validateUrlDomain('https://www.example.com/page', config)
      expect(result.isValid).toBe(true)
    })

    it('should treat relative URLs as valid (cannot validate)', () => {
      const config = createConfig()
      const result = validateUrlDomain('/page', config)
      expect(result.isValid).toBe(true)
      expect(result.hostname).toBe(null)
    })
  })

  describe('www mismatch', () => {
    it('should detect www when expected is non-www', () => {
      const config = createConfig({ baseUrl: 'https://example.com' })
      const result = validateUrlDomain('https://www.example.com/page', config)
      expect(result.isValid).toBe(false)
      expect(result.issue).toBe('www_mismatch')
      expect(result.hostname).toBe('www.example.com')
      expect(result.expectedHostname).toBe('example.com')
    })

    it('should detect missing www when expected has www', () => {
      const config = createConfig({ baseUrl: 'https://www.example.com' })
      const result = validateUrlDomain('https://example.com/page', config)
      expect(result.isValid).toBe(false)
      expect(result.issue).toBe('www_mismatch')
    })
  })

  describe('subdomain issues', () => {
    it('should detect subdomain mismatch', () => {
      const config = createConfig({ baseUrl: 'https://example.com' })
      const result = validateUrlDomain('https://blog.example.com/page', config)
      expect(result.isValid).toBe(false)
      expect(result.issue).toBe('subdomain')
    })

    it('should detect different subdomain', () => {
      const config = createConfig({ baseUrl: 'https://www.example.com' })
      const result = validateUrlDomain('https://blog.example.com/page', config)
      expect(result.isValid).toBe(false)
      expect(result.issue).toBe('subdomain')
    })
  })

  describe('wrong domain', () => {
    it('should detect completely different domain', () => {
      const config = createConfig({ baseUrl: 'https://example.com' })
      const result = validateUrlDomain('https://other-site.com/page', config)
      expect(result.isValid).toBe(false)
      expect(result.issue).toBe('wrong_domain')
    })

    it('should detect different TLD', () => {
      const config = createConfig({ baseUrl: 'https://example.com' })
      const result = validateUrlDomain('https://example.org/page', config)
      expect(result.isValid).toBe(false)
      expect(result.issue).toBe('wrong_domain')
    })
  })
})

describe('isSameSite', () => {
  it('should return true for exact domain match', () => {
    const config = createConfig({ baseUrl: 'https://example.com' })
    expect(isSameSite('https://example.com/page', config)).toBe(true)
  })

  it('should return true for www variant', () => {
    const config = createConfig({ baseUrl: 'https://example.com' })
    expect(isSameSite('https://www.example.com/page', config)).toBe(true)
  })

  it('should return true for subdomain', () => {
    const config = createConfig({ baseUrl: 'https://example.com' })
    expect(isSameSite('https://blog.example.com/page', config)).toBe(true)
  })

  it('should return false for different domain', () => {
    const config = createConfig({ baseUrl: 'https://example.com' })
    expect(isSameSite('https://other-site.com/page', config)).toBe(false)
  })

  it('should return false for invalid URL', () => {
    const config = createConfig()
    expect(isSameSite('not a url', config)).toBe(false)
  })
})

describe('isExactHostnameMatch', () => {
  it('should return true for exact match', () => {
    const config = createConfig({ baseUrl: 'https://example.com' })
    expect(isExactHostnameMatch('https://example.com/page', config)).toBe(true)
  })

  it('should return false for www mismatch', () => {
    const config = createConfig({ baseUrl: 'https://example.com' })
    expect(isExactHostnameMatch('https://www.example.com/page', config)).toBe(false)
  })

  it('should return true for www match when expected', () => {
    const config = createConfig({ baseUrl: 'https://www.example.com' })
    expect(isExactHostnameMatch('https://www.example.com/page', config)).toBe(true)
  })

  it('should return false for subdomain', () => {
    const config = createConfig({ baseUrl: 'https://example.com' })
    expect(isExactHostnameMatch('https://blog.example.com/page', config)).toBe(false)
  })

  it('should return false for invalid URL', () => {
    const config = createConfig()
    expect(isExactHostnameMatch('not a url', config)).toBe(false)
  })

  it('should be case insensitive', () => {
    const config = createConfig({ baseUrl: 'https://example.com' })
    expect(isExactHostnameMatch('https://EXAMPLE.COM/page', config)).toBe(true)
  })
})
