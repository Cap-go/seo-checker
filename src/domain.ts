/**
 * Domain validation utilities for SEO Checker
 * Ensures URLs match the expected main domain
 */

import type { SEOCheckerConfig } from './types.js'

/**
 * Extract hostname from a URL string
 */
export function extractHostname(url: string): string | null {
  try {
    return new URL(url).hostname
  }
  catch {
    return null
  }
}

/**
 * Normalize a domain by removing www. prefix and converting to lowercase
 */
export function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '')
}

/**
 * Get the main domain from config, extracting from baseUrl if not provided
 */
export function getMainDomain(config: SEOCheckerConfig): string {
  if (config.mainDomain) {
    return normalizeDomain(config.mainDomain)
  }

  const hostname = extractHostname(config.baseUrl)
  if (hostname) {
    return normalizeDomain(hostname)
  }

  return ''
}

/**
 * Get the expected hostname based on baseUrl (preserves www if present in baseUrl)
 */
export function getExpectedHostname(config: SEOCheckerConfig): string {
  const hostname = extractHostname(config.baseUrl)
  return hostname ? hostname.toLowerCase() : ''
}

/**
 * Check if a URL uses the expected domain
 * Returns an object with validation results
 */
export function validateUrlDomain(
  url: string,
  config: SEOCheckerConfig,
): {
  isValid: boolean
  hostname: string | null
  expectedHostname: string
  mainDomain: string
  issue?: 'wrong_domain' | 'www_mismatch' | 'subdomain'
} {
  const hostname = extractHostname(url)
  const expectedHostname = getExpectedHostname(config)
  const mainDomain = getMainDomain(config)

  if (!hostname) {
    return {
      isValid: true, // Can't validate relative URLs
      hostname: null,
      expectedHostname,
      mainDomain,
    }
  }

  const normalizedHostname = hostname.toLowerCase()
  const normalizedExpected = expectedHostname.toLowerCase()

  // Exact match
  if (normalizedHostname === normalizedExpected) {
    return {
      isValid: true,
      hostname: normalizedHostname,
      expectedHostname,
      mainDomain,
    }
  }

  // Check if it's a www mismatch
  const normalizedWithoutWww = normalizeDomain(normalizedHostname)
  const expectedWithoutWww = normalizeDomain(normalizedExpected)

  if (normalizedWithoutWww === expectedWithoutWww) {
    // Domain is the same, just www mismatch
    const urlHasWww = normalizedHostname.startsWith('www.')
    const expectedHasWww = normalizedExpected.startsWith('www.')

    if (urlHasWww !== expectedHasWww) {
      return {
        isValid: false,
        hostname: normalizedHostname,
        expectedHostname,
        mainDomain,
        issue: 'www_mismatch',
      }
    }
  }

  // Check if it's a subdomain of the main domain
  if (normalizedWithoutWww.endsWith(`.${mainDomain}`) || normalizedWithoutWww === mainDomain) {
    if (normalizedWithoutWww !== expectedWithoutWww) {
      return {
        isValid: false,
        hostname: normalizedHostname,
        expectedHostname,
        mainDomain,
        issue: 'subdomain',
      }
    }
  }

  // Completely different domain
  return {
    isValid: false,
    hostname: normalizedHostname,
    expectedHostname,
    mainDomain,
    issue: 'wrong_domain',
  }
}

/**
 * Check if a URL is on the same domain (including subdomains and www variants)
 * Used for determining if a link is "internal" in a broad sense
 */
export function isSameSite(url: string, config: SEOCheckerConfig): boolean {
  const hostname = extractHostname(url)
  if (!hostname)
    return false

  const mainDomain = getMainDomain(config)
  const normalizedHostname = normalizeDomain(hostname)

  return normalizedHostname === mainDomain || normalizedHostname.endsWith(`.${mainDomain}`)
}

/**
 * Check if a URL matches the exact expected hostname from baseUrl
 */
export function isExactHostnameMatch(url: string, config: SEOCheckerConfig): boolean {
  const hostname = extractHostname(url)
  if (!hostname)
    return false

  const expectedHostname = getExpectedHostname(config)
  return hostname.toLowerCase() === expectedHostname.toLowerCase()
}
