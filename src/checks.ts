/**
 * SEO Check Implementations
 * Each check function tests for specific SEO issues
 * Implements rules from the comprehensive SEO rules CSV
 */

import type { PageData, SEOCheckerConfig, SEOIssue, SiteData } from './types.js'
import * as fsSync from 'node:fs'
import * as path from 'node:path'
import { validateUrlDomain } from './domain.js'
import { fileExists, resolveToFilePath } from './parser.js'
import { getRule } from './rules.js'
import { hasSchemaFor, validateJsonLd } from './schemaValidator.js'

// Valid BCP47 language codes (common ones)
const VALID_LANG_CODES = new Set([
  'en',
  'es',
  'fr',
  'de',
  'it',
  'pt',
  'nl',
  'pl',
  'ru',
  'ja',
  'zh',
  'ko',
  'ar',
  'hi',
  'tr',
  'vi',
  'th',
  'id',
  'ms',
  'uk',
  'cs',
  'el',
  'he',
  'sv',
  'da',
  'fi',
  'no',
  'hu',
  'ro',
  'sk',
  'bg',
  'hr',
  'sr',
  'sl',
  'et',
  'lv',
  'lt',
  'x-default',
  'en-US',
  'en-GB',
  'en-AU',
  'en-CA',
  'es-ES',
  'es-MX',
  'es-AR',
  'pt-BR',
  'pt-PT',
  'zh-CN',
  'zh-TW',
  'zh-HK',
  'fr-FR',
  'fr-CA',
  'de-DE',
  'de-AT',
  'de-CH',
  'it-IT',
  'nl-NL',
  'nl-BE',
  'ja-JP',
  'ko-KR',
])

// Mojibake patterns
const MOJIBAKE_PATTERN = /Ã.|â€™|â€œ|â€|Â |Ã©|Ã¨|Ã |ï¿½|Ã¢|Ã£|Ã¤|Ã¥|Ã¦|Ã§|Ãª|Ã«|Ã¬|Ã­|Ã®|Ã¯|Ã±|Ã²|Ã³|Ã´|Ãµ|Ã¶|Ã¹|Ãº|Ã»|Ã¼|Ã½|Ã¿/

// Tracking parameter patterns
const TRACKING_PARAMS_PATTERN = /(utm_|gclid=|fbclid=|mc_cid=|mc_eid=|__hs|_ga=|_gl=|dclid=|msclkid=)/i

// Generic anchor text patterns
const GENERIC_ANCHOR_PATTERNS: [RegExp, string][] = [
  [/^click here$/i, 'SEO00136'],
  [/^read more$/i, 'SEO00137'],
  [/^learn more$/i, 'SEO00138'],
  [/^here$/i, 'SEO00139'],
  [/^more$/i, 'SEO00140'],
  [/^link$/i, 'SEO00141'],
  [/^this$/i, 'SEO00142'],
]

// Placeholder patterns
const PLACEHOLDER_PATTERNS: [RegExp, string, string][] = [
  [/lorem ipsum/i, 'lorem ipsum', 'SEO00382'],
  [/\bTODO\b/, 'TODO', 'SEO00386'],
  [/\bFIXME\b/, 'FIXME', 'SEO00390'],
  [/^(untitled|new page)$/i, 'untitled', 'SEO00394'],
  [/\[placeholder\]/i, 'placeholder', 'SEO00382'],
  [/\{\{.*\}\}/, 'template variable', 'SEO00382'],
]

// Schema.org types and their required fields
const SCHEMA_REQUIRED_FIELDS: Record<string, string[]> = {
  Article: ['headline', 'author', 'datePublished'],
  NewsArticle: ['headline', 'author', 'datePublished'],
  BlogPosting: ['headline', 'author', 'datePublished'],
  Product: ['name', 'offers'],
  Organization: ['name', 'url'],
  Person: ['name'],
  LocalBusiness: ['name', 'address'],
  WebSite: ['name', 'url'],
  WebPage: ['name'],
  FAQPage: ['mainEntity'],
  HowTo: ['name', 'step'],
  Recipe: ['name', 'recipeIngredient', 'recipeInstructions'],
  Event: ['name', 'startDate', 'location'],
  VideoObject: ['name', 'thumbnailUrl', 'uploadDate'],
  ImageObject: ['contentUrl'],
  BreadcrumbList: ['itemListElement'],
  ItemList: ['itemListElement'],
  Review: ['itemReviewed', 'reviewRating'],
  AggregateRating: ['ratingValue', 'reviewCount'],
  Offer: ['price', 'priceCurrency'],
  SoftwareApplication: ['name', 'operatingSystem', 'applicationCategory'],
  JobPosting: ['title', 'datePosted', 'hiringOrganization'],
  Course: ['name', 'provider'],
  Book: ['name', 'author'],
}

/**
 * Create a fingerprint for an issue (for exclusion matching)
 */
function createFingerprint(
  ruleId: string,
  relativePath: string,
  element?: string,
  line?: number,
): string {
  const parts = [ruleId, relativePath]
  if (element)
    parts.push(element.substring(0, 100))
  if (line)
    parts.push(`L${line}`)
  return parts.join('::')
}

/**
 * Create an SEO issue
 */
function createIssue(
  ruleId: string,
  page: PageData,
  options: {
    element?: string
    actual?: string
    expected?: string
    line?: number
  } = {},
): SEOIssue | null {
  const rule = getRule(ruleId)
  if (!rule)
    return null

  return {
    ruleId,
    ruleName: rule.name,
    category: rule.category,
    severity: rule.severity,
    file: page.filePath,
    relativePath: page.relativePath,
    line: options.line,
    element: options.element,
    actual: options.actual,
    expected: options.expected,
    fixHint: rule.fixHint,
    fingerprint: createFingerprint(ruleId, page.relativePath, options.element, options.line),
  }
}

/**
 * Check metadata rules for a page
 * SEO00001-SEO00019
 */
export function checkMetadata(page: PageData, _config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  // SEO00001: Missing or empty title
  if (!page.title || page.title.trim() === '') {
    const issue = createIssue('SEO00001', page)
    if (issue)
      issues.push(issue)
  }

  // SEO00002: Missing or empty meta description
  if (!page.metaDescription || page.metaDescription.trim() === '') {
    const issue = createIssue('SEO00002', page)
    if (issue)
      issues.push(issue)
  }

  // SEO00003: Missing or empty meta robots
  if (!page.metaRobots || page.metaRobots.trim() === '') {
    const issue = createIssue('SEO00003', page)
    if (issue)
      issues.push(issue)
  }

  // SEO00004: Missing canonical
  if (!page.canonical) {
    const issue = createIssue('SEO00004', page)
    if (issue)
      issues.push(issue)
  }

  // SEO00005: Missing charset
  if (!page.charset) {
    const issue = createIssue('SEO00005', page)
    if (issue)
      issues.push(issue)
  }

  // SEO00006: Missing html lang
  if (!page.htmlLang) {
    const issue = createIssue('SEO00006', page)
    if (issue)
      issues.push(issue)
  }

  // SEO00010: Canonical is empty
  if (page.canonical !== undefined && page.canonical.trim() === '') {
    const issue = createIssue('SEO00010', page)
    if (issue)
      issues.push(issue)
  }

  // SEO00011: html lang is empty
  if (page.htmlLang !== undefined && page.htmlLang.trim() === '') {
    const issue = createIssue('SEO00011', page)
    if (issue)
      issues.push(issue)
  }

  // SEO00012: charset is empty
  if (page.charset !== undefined && page.charset.trim() === '') {
    const issue = createIssue('SEO00012', page)
    if (issue)
      issues.push(issue)
  }

  // SEO00413: Missing viewport
  if (!page.viewport) {
    const issue = createIssue('SEO00413', page)
    if (issue)
      issues.push(issue)
  }

  // SEO00414: Multiple viewport tags
  const viewportMatches = (page.html.match(/<meta[^>]*name=["']viewport["'][^>]*>/gi) || [])
  if (viewportMatches.length > 1) {
    const issue = createIssue('SEO00414', page, { actual: `${viewportMatches.length} viewport tags` })
    if (issue)
      issues.push(issue)
  }

  return issues
}

/**
 * Check HTML validity rules
 * SEO00007-SEO00009, SEO00226, SEO00380
 */
export function checkHtmlValidity(page: PageData, _config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  // Count elements to check for multiples
  const titleCount = (page.html.match(/<title[^>]*>/gi) || []).length
  const metaDescCount = (page.html.match(/<meta[^>]*name=["']description["'][^>]*>/gi) || []).length
  const canonicalCount = (page.html.match(/<link[^>]*rel=["']canonical["'][^>]*>/gi) || []).length
  const _charsetCount = (page.html.match(/<meta[^>]*charset[^>]*>/gi) || []).length
    + (page.html.match(/<meta[^>]*http-equiv=["']Content-Type["'][^>]*>/gi) || []).length

  // SEO00007: Multiple title tags
  if (titleCount > 1) {
    const issue = createIssue('SEO00007', page, { actual: `${titleCount} title tags` })
    if (issue)
      issues.push(issue)
  }

  // SEO00008: Multiple meta description tags
  if (metaDescCount > 1) {
    const issue = createIssue('SEO00008', page, { actual: `${metaDescCount} meta descriptions` })
    if (issue)
      issues.push(issue)
  }

  // SEO00009: Multiple canonical tags
  if (canonicalCount > 1) {
    const issue = createIssue('SEO00009', page, { actual: `${canonicalCount} canonicals` })
    if (issue)
      issues.push(issue)
  }

  // SEO00226: Missing doctype
  if (!page.hasDoctype) {
    const issue = createIssue('SEO00226', page)
    if (issue)
      issues.push(issue)
  }

  // SEO00227: Doctype not at start
  if (page.hasDoctype && !page.html.trim().toLowerCase().startsWith('<!doctype')) {
    const issue = createIssue('SEO00227', page)
    if (issue)
      issues.push(issue)
  }

  // SEO00380: Duplicate IDs
  const idCounts = new Map<string, number>()
  for (const id of page.elementIds) {
    idCounts.set(id, (idCounts.get(id) || 0) + 1)
  }
  for (const [id, count] of idCounts) {
    if (count > 1) {
      const issue = createIssue('SEO00380', page, {
        element: `id="${id}"`,
        actual: `${count} occurrences`,
      })
      if (issue)
        issues.push(issue)
    }
  }

  // SEO00381: Meta refresh redirect
  if (page.html.includes('http-equiv="refresh"') || page.html.includes('http-equiv=\'refresh\'')) {
    const issue = createIssue('SEO00381', page)
    if (issue)
      issues.push(issue)
  }

  return issues
}

/**
 * Check content text length rules
 * SEO00013-SEO00055
 */
export function checkContentLength(page: PageData, _config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  // Title length checks
  if (page.title) {
    const titleLen = page.title.length

    // SEO00013-00019: Title too short
    if (titleLen < 10) {
      const issue = createIssue('SEO00013', page, { actual: `${titleLen} chars`, expected: '>= 10 chars' })
      if (issue)
        issues.push(issue)
    }
    else if (titleLen < 20) {
      const issue = createIssue('SEO00014', page, { actual: `${titleLen} chars`, expected: '>= 20 chars' })
      if (issue)
        issues.push(issue)
    }
    else if (titleLen < 30) {
      const issue = createIssue('SEO00015', page, { actual: `${titleLen} chars`, expected: '>= 30 chars' })
      if (issue)
        issues.push(issue)
    }

    // SEO00020-00022: Title too long
    if (titleLen > 70) {
      const issue = createIssue('SEO00022', page, { actual: `${titleLen} chars`, expected: '<= 70 chars' })
      if (issue)
        issues.push(issue)
    }
    else if (titleLen > 65) {
      const issue = createIssue('SEO00021', page, { actual: `${titleLen} chars`, expected: '<= 65 chars' })
      if (issue)
        issues.push(issue)
    }
    else if (titleLen > 60) {
      const issue = createIssue('SEO00020', page, { actual: `${titleLen} chars`, expected: '<= 60 chars' })
      if (issue)
        issues.push(issue)
    }
  }

  // Meta description length checks
  if (page.metaDescription) {
    const descLen = page.metaDescription.length

    // SEO00023-00026: Description too short
    if (descLen < 50) {
      const issue = createIssue('SEO00023', page, { actual: `${descLen} chars`, expected: '>= 50 chars' })
      if (issue)
        issues.push(issue)
    }
    else if (descLen < 70) {
      const issue = createIssue('SEO00024', page, { actual: `${descLen} chars`, expected: '>= 70 chars' })
      if (issue)
        issues.push(issue)
    }
    else if (descLen < 100) {
      const issue = createIssue('SEO00025', page, { actual: `${descLen} chars`, expected: '>= 100 chars' })
      if (issue)
        issues.push(issue)
    }
    else if (descLen < 120) {
      const issue = createIssue('SEO00026', page, { actual: `${descLen} chars`, expected: '>= 120 chars' })
      if (issue)
        issues.push(issue)
    }

    // SEO00027-00029: Description too long
    if (descLen > 320) {
      const issue = createIssue('SEO00029', page, { actual: `${descLen} chars`, expected: '<= 320 chars' })
      if (issue)
        issues.push(issue)
    }
    else if (descLen > 200) {
      const issue = createIssue('SEO00028', page, { actual: `${descLen} chars`, expected: '<= 200 chars' })
      if (issue)
        issues.push(issue)
    }
    else if (descLen > 160) {
      const issue = createIssue('SEO00027', page, { actual: `${descLen} chars`, expected: '<= 160 chars' })
      if (issue)
        issues.push(issue)
    }
  }

  // H1 length checks
  for (const h1 of page.h1s) {
    const h1Len = h1.length

    // SEO00030-00033: H1 too short
    if (h1Len < 5) {
      const issue = createIssue('SEO00030', page, { element: h1.substring(0, 50), actual: `${h1Len} chars`, expected: '>= 5 chars' })
      if (issue)
        issues.push(issue)
    }
    else if (h1Len < 10) {
      const issue = createIssue('SEO00031', page, { element: h1.substring(0, 50), actual: `${h1Len} chars`, expected: '>= 10 chars' })
      if (issue)
        issues.push(issue)
    }
    else if (h1Len < 20) {
      const issue = createIssue('SEO00032', page, { element: h1.substring(0, 50), actual: `${h1Len} chars`, expected: '>= 20 chars' })
      if (issue)
        issues.push(issue)
    }

    // SEO00034-00036: H1 too long
    if (h1Len > 100) {
      const issue = createIssue('SEO00036', page, { element: h1.substring(0, 50), actual: `${h1Len} chars`, expected: '<= 100 chars' })
      if (issue)
        issues.push(issue)
    }
    else if (h1Len > 90) {
      const issue = createIssue('SEO00035', page, { element: h1.substring(0, 50), actual: `${h1Len} chars`, expected: '<= 90 chars' })
      if (issue)
        issues.push(issue)
    }
    else if (h1Len > 80) {
      const issue = createIssue('SEO00034', page, { element: h1.substring(0, 50), actual: `${h1Len} chars`, expected: '<= 80 chars' })
      if (issue)
        issues.push(issue)
    }
  }

  // H2 length checks
  for (const h2 of page.h2s) {
    const h2Len = h2.length

    // SEO00037-00040: H2 too short
    if (h2Len < 5) {
      const issue = createIssue('SEO00037', page, { element: h2.substring(0, 50), actual: `${h2Len} chars`, expected: '>= 5 chars' })
      if (issue)
        issues.push(issue)
    }

    // SEO00041-00043: H2 too long
    if (h2Len > 80) {
      const issue = createIssue('SEO00043', page, { element: h2.substring(0, 50), actual: `${h2Len} chars`, expected: '<= 80 chars' })
      if (issue)
        issues.push(issue)
    }
  }

  return issues
}

/**
 * Check content format rules
 * SEO00056-00087
 */
export function checkContentFormat(page: PageData, _config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  // Title format checks
  if (page.title) {
    // SEO00056: Leading/trailing whitespace
    if (page.title !== page.title.trim()) {
      const issue = createIssue('SEO00056', page, { element: page.title })
      if (issue)
        issues.push(issue)
    }

    // SEO00057: Repeated spaces
    if (/\s{2,}/.test(page.title)) {
      const issue = createIssue('SEO00057', page, { element: page.title })
      if (issue)
        issues.push(issue)
    }

    // SEO00058: Repeated punctuation
    if (/[.!?]{2,}|[-_]{3,}/.test(page.title)) {
      const issue = createIssue('SEO00058', page, { element: page.title })
      if (issue)
        issues.push(issue)
    }

    // SEO00059: Mojibake
    if (MOJIBAKE_PATTERN.test(page.title)) {
      const issue = createIssue('SEO00059', page, { element: page.title })
      if (issue)
        issues.push(issue)
    }

    // SEO00064: ALL CAPS title
    if (page.title.length > 10 && page.title === page.title.toUpperCase() && /[A-Z]/.test(page.title)) {
      const issue = createIssue('SEO00064', page, { element: page.title })
      if (issue)
        issues.push(issue)
    }

    // SEO00068: Title starts with special char
    if (/^[^a-z0-9]/i.test(page.title.trim())) {
      const issue = createIssue('SEO00068', page, { element: page.title })
      if (issue)
        issues.push(issue)
    }

    // SEO00072: Pipe separator count
    const pipeCount = (page.title.match(/\|/g) || []).length
    if (pipeCount > 2) {
      const issue = createIssue('SEO00074', page, { element: page.title, actual: `${pipeCount} pipes` })
      if (issue)
        issues.push(issue)
    }
    else if (pipeCount > 1) {
      const issue = createIssue('SEO00073', page, { element: page.title, actual: `${pipeCount} pipes` })
      if (issue)
        issues.push(issue)
    }
  }

  // Description format checks
  if (page.metaDescription) {
    // SEO00060: Leading/trailing whitespace
    if (page.metaDescription !== page.metaDescription.trim()) {
      const issue = createIssue('SEO00060', page, { element: page.metaDescription.substring(0, 50) })
      if (issue)
        issues.push(issue)
    }

    // SEO00061: Repeated spaces
    if (/\s{2,}/.test(page.metaDescription)) {
      const issue = createIssue('SEO00061', page, { element: page.metaDescription.substring(0, 50) })
      if (issue)
        issues.push(issue)
    }

    // SEO00063: Mojibake
    if (MOJIBAKE_PATTERN.test(page.metaDescription)) {
      const issue = createIssue('SEO00063', page, { element: page.metaDescription.substring(0, 50) })
      if (issue)
        issues.push(issue)
    }

    // SEO00065: ALL CAPS description
    if (page.metaDescription.length > 20 && page.metaDescription === page.metaDescription.toUpperCase() && /[A-Z]/.test(page.metaDescription)) {
      const issue = createIssue('SEO00065', page, { element: page.metaDescription.substring(0, 50) })
      if (issue)
        issues.push(issue)
    }
  }

  // H1 format checks
  for (const h1 of page.h1s) {
    // SEO00066: ALL CAPS H1
    if (h1.length > 5 && h1 === h1.toUpperCase() && /[A-Z]/.test(h1)) {
      const issue = createIssue('SEO00066', page, { element: h1.substring(0, 50) })
      if (issue)
        issues.push(issue)
    }

    // SEO00067: Mojibake in H1
    if (MOJIBAKE_PATTERN.test(h1)) {
      const issue = createIssue('SEO00067', page, { element: h1.substring(0, 50) })
      if (issue)
        issues.push(issue)
    }

    // SEO00069: H1 starts with special char
    if (/^[^a-z0-9]/i.test(h1.trim())) {
      const issue = createIssue('SEO00069', page, { element: h1.substring(0, 50) })
      if (issue)
        issues.push(issue)
    }
  }

  return issues
}

/**
 * Check heading rules
 * SEO00109-00135
 */
export function checkHeadings(page: PageData, _config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  // SEO00109: Missing H1
  if (page.h1s.length === 0) {
    const issue = createIssue('SEO00109', page)
    if (issue)
      issues.push(issue)
  }

  // SEO00110: Multiple H1
  if (page.h1s.length > 1) {
    const issue = createIssue('SEO00110', page, { actual: `${page.h1s.length} H1 tags` })
    if (issue)
      issues.push(issue)
  }

  // SEO00111: Heading level skip
  let previousLevel = 0
  for (const heading of page.headingOrder) {
    if (previousLevel > 0 && heading.level > previousLevel + 1) {
      const issue = createIssue('SEO00111', page, {
        element: heading.text.substring(0, 50),
        actual: `H${previousLevel} -> H${heading.level}`,
        expected: `H${previousLevel} -> H${previousLevel + 1}`,
      })
      if (issue)
        issues.push(issue)
    }
    previousLevel = heading.level
  }

  // SEO00112: First heading is not H1
  if (page.headingOrder.length > 0 && page.headingOrder[0].level !== 1) {
    const issue = createIssue('SEO00112', page, {
      actual: `First heading is H${page.headingOrder[0].level}`,
    })
    if (issue)
      issues.push(issue)
  }

  // SEO00113-00124: Missing heading levels (if other headings exist)
  if (page.headingOrder.length > 0) {
    const usedLevels = new Set(page.headingOrder.map(h => h.level))
    if (usedLevels.has(2) && !usedLevels.has(1)) {
      const issue = createIssue('SEO00113', page)
      if (issue)
        issues.push(issue)
    }
    if (usedLevels.has(3) && !usedLevels.has(2)) {
      const issue = createIssue('SEO00114', page)
      if (issue)
        issues.push(issue)
    }
    if (usedLevels.has(4) && !usedLevels.has(3)) {
      const issue = createIssue('SEO00115', page)
      if (issue)
        issues.push(issue)
    }
  }

  // SEO00125: Duplicate H1 text within page
  const h1Counts = new Map<string, number>()
  for (const h1 of page.h1s) {
    h1Counts.set(h1, (h1Counts.get(h1) || 0) + 1)
  }
  for (const [h1, count] of h1Counts) {
    if (count > 1) {
      const issue = createIssue('SEO00125', page, { element: h1.substring(0, 50), actual: `${count} occurrences` })
      if (issue)
        issues.push(issue)
    }
  }

  // SEO00126-00127: Excessive headings count
  if (page.headingOrder.length > 50) {
    const issue = createIssue('SEO00127', page, { actual: `${page.headingOrder.length} headings` })
    if (issue)
      issues.push(issue)
  }
  else if (page.headingOrder.length > 30) {
    const issue = createIssue('SEO00126', page, { actual: `${page.headingOrder.length} headings` })
    if (issue)
      issues.push(issue)
  }

  // SEO00128: Empty heading
  for (const heading of page.headingOrder) {
    if (!heading.text || heading.text.trim() === '') {
      const issue = createIssue('SEO00128', page, { element: `H${heading.level}` })
      if (issue)
        issues.push(issue)
    }
  }

  // SEO00129-00130: H1 matches title exactly or nearly
  if (page.title && page.h1s.length > 0) {
    const normalizedTitle = page.title.toLowerCase().trim()
    for (const h1 of page.h1s) {
      const normalizedH1 = h1.toLowerCase().trim()
      if (normalizedH1 === normalizedTitle) {
        const issue = createIssue('SEO00129', page, { element: h1.substring(0, 50) })
        if (issue)
          issues.push(issue)
      }
    }
  }

  return issues
}

/**
 * Check indexability rules
 * SEO00100-00108
 */
export function checkIndexability(page: PageData, config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  if (page.canonical) {
    // SEO00100: Canonical is relative URL
    if (!page.canonical.startsWith('http://') && !page.canonical.startsWith('https://')) {
      const issue = createIssue('SEO00100', page, { element: page.canonical })
      if (issue)
        issues.push(issue)
    }

    // SEO00101: Canonical contains fragment
    if (page.canonical.includes('#')) {
      const issue = createIssue('SEO00101', page, { element: page.canonical })
      if (issue)
        issues.push(issue)
    }

    // SEO00102: Canonical contains tracking parameters
    if (TRACKING_PARAMS_PATTERN.test(page.canonical)) {
      const issue = createIssue('SEO00102', page, { element: page.canonical })
      if (issue)
        issues.push(issue)
    }

    // SEO00103: Canonical uses HTTP instead of HTTPS
    if (page.canonical.startsWith('http://') && config.baseUrl.startsWith('https://')) {
      const issue = createIssue('SEO00103', page, { element: page.canonical })
      if (issue)
        issues.push(issue)
    }

    // Domain validation for canonical URL
    const domainValidation = validateUrlDomain(page.canonical, config)
    if (!domainValidation.isValid && domainValidation.issue) {
      // SEO00104: www when main domain does not use it
      // SEO00420: missing www when main domain uses it
      // SEO00421: different subdomain
      let ruleId: string
      switch (domainValidation.issue) {
        case 'www_mismatch':
          ruleId = domainValidation.hostname?.startsWith('www.') ? 'SEO00104' : 'SEO00420'
          break
        case 'subdomain':
          ruleId = 'SEO00421'
          break
        default:
          ruleId = 'SEO00421' // wrong_domain treated as subdomain issue
      }

      const issue = createIssue(ruleId, page, {
        element: page.canonical,
        actual: domainValidation.hostname || page.canonical,
        expected: domainValidation.expectedHostname,
      })
      if (issue)
        issues.push(issue)
    }
  }

  // SEO00105: Conflicting robots directives
  if (page.metaRobots) {
    const lower = page.metaRobots.toLowerCase()
    const hasNoindex = lower.includes('noindex')
    const hasIndex = /\bindex\b/.test(lower) && !hasNoindex
    const hasNofollow = lower.includes('nofollow')
    const hasFollow = /\bfollow\b/.test(lower) && !hasNofollow

    if ((hasNoindex && hasIndex) || (hasNofollow && hasFollow)) {
      const issue = createIssue('SEO00105', page, { element: page.metaRobots })
      if (issue)
        issues.push(issue)
    }
  }

  // SEO00106: Page has noindex but is in sitemap (would need sitemap data)
  // SEO00107: Page has noindex but has incoming internal links (would need link graph)

  // SEO00368: rel=prev/next used (deprecated)
  if (page.html.includes('rel="prev"') || page.html.includes('rel=\'prev\'')
    || page.html.includes('rel="next"') || page.html.includes('rel=\'next\'')) {
    const issue = createIssue('SEO00368', page)
    if (issue)
      issues.push(issue)
  }

  return issues
}

/**
 * Check link rules
 * SEO00134-00151
 */
export function checkLinks(page: PageData, config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  for (const link of page.links) {
    // SEO00134: Empty href attribute
    if (link.href === '' || link.href === undefined) {
      const issue = createIssue('SEO00134', page, { element: link.text || '(empty link)' })
      if (issue)
        issues.push(issue)
    }

    // SEO00135: Anchor text missing/empty (no text, no aria-label, no title)
    const hasText = link.text && link.text.trim() !== ''
    const hasAriaLabel = link.ariaLabel && link.ariaLabel.trim() !== ''
    const hasTitle = link.title && link.title.trim() !== ''
    if (!hasText && !hasAriaLabel && !hasTitle) {
      const issue = createIssue('SEO00135', page, { element: link.href })
      if (issue)
        issues.push(issue)
    }

    // SEO00136-00142: Generic anchor text
    if (link.text) {
      const lowerText = link.text.toLowerCase().trim()
      for (const [pattern, ruleId] of GENERIC_ANCHOR_PATTERNS) {
        if (pattern.test(lowerText)) {
          const issue = createIssue(ruleId, page, { element: link.text })
          if (issue)
            issues.push(issue)
          break
        }
      }
    }

    // SEO00143: Internal link uses nofollow
    if (link.isInternal && link.rel?.includes('nofollow')) {
      const issue = createIssue('SEO00143', page, { element: link.href })
      if (issue)
        issues.push(issue)
    }

    // SEO00145: mailto: link missing email address
    if (link.href && link.href.startsWith('mailto:')) {
      const email = link.href.slice(7).split('?')[0] // Remove query params
      if (!email || email.trim() === '') {
        const issue = createIssue('SEO00145', page, { element: link.href })
        if (issue)
          issues.push(issue)
      }
    }

    // SEO00146: tel: link missing phone number
    if (link.href && link.href.startsWith('tel:')) {
      const phone = link.href.slice(4).split('?')[0]
      if (!phone || phone.trim() === '') {
        const issue = createIssue('SEO00146', page, { element: link.href })
        if (issue)
          issues.push(issue)
      }
    }

    // SEO00147: Broken relative link
    const isRelativeUrl = link.href
      && !link.href.startsWith('http://')
      && !link.href.startsWith('https://')
      && !link.href.startsWith('#')
      && !link.href.startsWith('mailto:')
      && !link.href.startsWith('tel:')
      && !link.href.startsWith('javascript:')
      && !link.href.startsWith('data:')

    if (isRelativeUrl) {
      const resolvedPath = resolveToFilePath(link.href, page.relativePath, config.distPath)
      if (resolvedPath && !fileExists(resolvedPath)) {
        const issue = createIssue('SEO00147', page, { element: link.href })
        if (issue)
          issues.push(issue)
      }
    }

    // SEO00148: Double slash in path
    if (link.href && /https?:\/\/[^/]+\/\//.test(link.href)) {
      const issue = createIssue('SEO00148', page, { element: link.href })
      if (issue)
        issues.push(issue)
    }

    // SEO00149: Uppercase letters in URL path (internal links)
    if (link.href && link.isInternal) {
      // Extract path portion (after domain)
      const urlPath = link.href.replace(/^https?:\/\/[^/]+/, '')
      if (urlPath && /[A-Z]/.test(urlPath)) {
        const issue = createIssue('SEO00149', page, { element: link.href })
        if (issue)
          issues.push(issue)
      }
    }

    // SEO00150: Spaces in URL (encoded or not)
    if (link.href && /%20| /.test(link.href)) {
      const issue = createIssue('SEO00150', page, { element: link.href })
      if (issue)
        issues.push(issue)
    }

    // SEO00151: Trailing punctuation in URL
    if (link.href && /[.,;:!?]$/.test(link.href.replace(/\/$/, ''))) {
      const issue = createIssue('SEO00151', page, { element: link.href })
      if (issue)
        issues.push(issue)
    }

    // SEO00152: HTTP links on HTTPS page
    if (config.baseUrl.startsWith('https://') && link.href && link.href.startsWith('http://')) {
      const issue = createIssue('SEO00152', page, { element: link.href })
      if (issue)
        issues.push(issue)
    }
  }

  return issues
}

/**
 * Check URL hygiene rules
 * SEO00373-00379
 */
export function checkUrlHygiene(page: PageData, _config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  for (const link of page.links) {
    if (!link.isInternal || !link.href)
      continue

    // SEO00374: Session IDs in URLs
    if (/[?&](sid|sessionid|phpsessid|jsessionid)=/i.test(link.href)) {
      const issue = createIssue('SEO00374', page, { element: link.href })
      if (issue)
        issues.push(issue)
    }

    // SEO00375-00379: Parameterized URLs
    if (/\.php\?/.test(link.href)) {
      const issue = createIssue('SEO00375', page, { element: link.href })
      if (issue)
        issues.push(issue)
    }
    if (/\?page=/.test(link.href)) {
      const issue = createIssue('SEO00376', page, { element: link.href })
      if (issue)
        issues.push(issue)
    }
    if (/\?p=/.test(link.href)) {
      const issue = createIssue('SEO00377', page, { element: link.href })
      if (issue)
        issues.push(issue)
    }
    if (/\?id=/.test(link.href)) {
      const issue = createIssue('SEO00378', page, { element: link.href })
      if (issue)
        issues.push(issue)
    }
  }

  return issues
}

/**
 * Check image rules
 * SEO00153-00167
 */
export function checkImages(page: PageData, config: SEOCheckerConfig, siteData: SiteData): SEOIssue[] {
  const issues: SEOIssue[] = []

  for (const img of page.images) {
    // SEO00153: Missing alt attribute
    if (img.alt === undefined) {
      const issue = createIssue('SEO00153', page, { element: img.src })
      if (issue)
        issues.push(issue)
    }

    // SEO00154: Empty alt attribute (might be intentional for decorative images)
    if (img.alt !== undefined && img.alt.trim() === '') {
      const issue = createIssue('SEO00154', page, { element: img.src })
      if (issue)
        issues.push(issue)
    }

    // SEO00155: Broken image reference
    if (img.src && !img.src.startsWith('http://') && !img.src.startsWith('https://') && !img.src.startsWith('data:')) {
      const resolvedPath = resolveToFilePath(img.src, page.relativePath, config.distPath)
      if (resolvedPath && !fileExists(resolvedPath)) {
        const issue = createIssue('SEO00155', page, { element: img.src })
        if (issue)
          issues.push(issue)
      }
    }

    // SEO00156: Image src is empty
    if (img.src !== undefined && img.src.trim() === '') {
      const issue = createIssue('SEO00156', page, { element: '(empty src)' })
      if (issue)
        issues.push(issue)
    }

    // SEO00157: Alt text too long
    if (img.alt && img.alt.length > 125) {
      const issue = createIssue('SEO00157', page, {
        element: img.src,
        actual: `${img.alt.length} chars`,
        expected: '<= 125 chars',
      })
      if (issue)
        issues.push(issue)
    }

    // SEO00158: Alt text is just filename
    if (img.alt && img.src) {
      const filename = img.src.split('/').pop()?.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ')
      if (filename && img.alt.toLowerCase().trim() === filename.toLowerCase()) {
        const issue = createIssue('SEO00158', page, { element: img.src })
        if (issue)
          issues.push(issue)
      }
    }

    // SEO00159: Alt text contains "image of" or "photo of"
    if (img.alt && /^(image|photo|picture|graphic) of/i.test(img.alt)) {
      const issue = createIssue('SEO00159', page, { element: img.alt.substring(0, 50) })
      if (issue)
        issues.push(issue)
    }

    // Check image file size
    if (img.src && !img.src.startsWith('http://') && !img.src.startsWith('https://') && !img.src.startsWith('data:')) {
      const resolvedPath = resolveToFilePath(img.src, page.relativePath, config.distPath)
      if (resolvedPath) {
        const relativePath = path.relative(config.distPath, resolvedPath)
        const imageInfo = siteData.imageFiles.get(relativePath)
        if (imageInfo) {
          const sizeKB = imageInfo.size / 1024

          // SEO00166-00167: Image > 1024KB / > 2048KB
          if (sizeKB > 2048) {
            const issue = createIssue('SEO00167', page, { element: img.src, actual: `${Math.round(sizeKB)}KB`, expected: '<= 2048KB' })
            if (issue)
              issues.push(issue)
          }
          else if (sizeKB > 1024) {
            const issue = createIssue('SEO00166', page, { element: img.src, actual: `${Math.round(sizeKB)}KB`, expected: '<= 1024KB' })
            if (issue)
              issues.push(issue)
          }
          // SEO00164-00165: Image > 300KB / > 500KB
          else if (sizeKB > 500) {
            const issue = createIssue('SEO00165', page, { element: img.src, actual: `${Math.round(sizeKB)}KB`, expected: '<= 500KB' })
            if (issue)
              issues.push(issue)
          }
          else if (sizeKB > 300) {
            const issue = createIssue('SEO00164', page, { element: img.src, actual: `${Math.round(sizeKB)}KB`, expected: '<= 300KB' })
            if (issue)
              issues.push(issue)
          }
          // SEO00160-00163: Image > 100KB / > 150KB / > 200KB
          else if (sizeKB > 200) {
            const issue = createIssue('SEO00163', page, { element: img.src, actual: `${Math.round(sizeKB)}KB`, expected: '<= 200KB' })
            if (issue)
              issues.push(issue)
          }
          else if (sizeKB > 150) {
            const issue = createIssue('SEO00162', page, { element: img.src, actual: `${Math.round(sizeKB)}KB`, expected: '<= 150KB' })
            if (issue)
              issues.push(issue)
          }
          else if (sizeKB > 100) {
            const issue = createIssue('SEO00160', page, { element: img.src, actual: `${Math.round(sizeKB)}KB`, expected: '<= 100KB' })
            if (issue)
              issues.push(issue)
          }
        }
      }
    }
  }

  return issues
}

// Valid Open Graph types
const VALID_OG_TYPES = new Set([
  'website',
  'article',
  'book',
  'profile',
  'music.song',
  'music.album',
  'music.playlist',
  'music.radio_station',
  'video.movie',
  'video.episode',
  'video.tv_show',
  'video.other',
])

// Valid Twitter card types
const VALID_TWITTER_CARD_TYPES = new Set([
  'summary',
  'summary_large_image',
  'app',
  'player',
])

// Valid image MIME types for og:image:type
const VALID_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
])

// Pattern for valid og:locale format (e.g., en_US, fr_FR)
const OG_LOCALE_PATTERN = /^[a-z]{2}_[A-Z]{2}$/

// Pattern for valid Twitter handle
const TWITTER_HANDLE_PATTERN = /^@\w{1,15}$/

/**
 * Check social tags rules
 * SEO00168-00176, SEO00371-00372, SEO01175-01210
 */
export function checkSocialTags(page: PageData, config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  // =====================
  // OpenGraph Basic Tags
  // =====================

  // SEO00168: Missing og:title
  if (!page.og.title) {
    const issue = createIssue('SEO00168', page)
    if (issue)
      issues.push(issue)
  }
  else {
    // SEO01206: og:title is empty
    if (page.og.title.trim() === '') {
      const issue = createIssue('SEO01206', page)
      if (issue)
        issues.push(issue)
    }
    else {
      // SEO01177/SEO00176: og:title too long (>60 chars)
      if (page.og.title.length > 60) {
        const issue = createIssue('SEO01177', page, {
          element: page.og.title.substring(0, 50),
          actual: `${page.og.title.length} chars`,
          expected: '<= 60 chars',
        })
        if (issue)
          issues.push(issue)
      }

      // SEO01195: og:title matches page title exactly
      if (page.title && page.og.title === page.title) {
        const issue = createIssue('SEO01195', page, {
          element: page.og.title.substring(0, 50),
        })
        if (issue)
          issues.push(issue)
      }
    }
  }

  // SEO00169: Missing og:description
  if (!page.og.description) {
    const issue = createIssue('SEO00169', page)
    if (issue)
      issues.push(issue)
  }
  else {
    // SEO01207: og:description is empty
    if (page.og.description.trim() === '') {
      const issue = createIssue('SEO01207', page)
      if (issue)
        issues.push(issue)
    }
    else {
      // SEO01178: og:description too long (>200 chars)
      if (page.og.description.length > 200) {
        const issue = createIssue('SEO01178', page, {
          element: page.og.description.substring(0, 50),
          actual: `${page.og.description.length} chars`,
          expected: '<= 200 chars',
        })
        if (issue)
          issues.push(issue)
      }

      // SEO01179: og:description too short (<50 chars)
      if (page.og.description.length < 50) {
        const issue = createIssue('SEO01179', page, {
          element: page.og.description.substring(0, 50),
          actual: `${page.og.description.length} chars`,
          expected: '>= 50 chars',
        })
        if (issue)
          issues.push(issue)
      }

      // SEO01196: og:description matches meta description exactly
      if (page.metaDescription && page.og.description === page.metaDescription) {
        const issue = createIssue('SEO01196', page, {
          element: page.og.description.substring(0, 50),
        })
        if (issue)
          issues.push(issue)
      }
    }
  }

  // SEO00170: Missing og:image
  if (!page.og.image) {
    const issue = createIssue('SEO00170', page)
    if (issue)
      issues.push(issue)
  }
  else {
    // SEO00371: og:image is relative
    if (!page.og.image.startsWith('http://') && !page.og.image.startsWith('https://')) {
      const issue = createIssue('SEO00371', page, { element: page.og.image })
      if (issue)
        issues.push(issue)

      // SEO00372: og:image points to missing file
      const resolvedPath = resolveToFilePath(page.og.image, page.relativePath, config.distPath)
      if (resolvedPath && !fileExists(resolvedPath)) {
        const issue = createIssue('SEO00372', page, { element: page.og.image })
        if (issue)
          issues.push(issue)
      }
    }

    // SEO01197: og:image uses HTTP instead of HTTPS
    if (page.og.image.startsWith('http://')) {
      const issue = createIssue('SEO01197', page, { element: page.og.image })
      if (issue)
        issues.push(issue)
    }
  }

  // SEO00171: Missing og:url
  if (!page.og.url) {
    const issue = createIssue('SEO00171', page)
    if (issue)
      issues.push(issue)
  }
  else {
    // SEO01202: og:url is relative
    if (!page.og.url.startsWith('http://') && !page.og.url.startsWith('https://')) {
      const issue = createIssue('SEO01202', page, { element: page.og.url })
      if (issue)
        issues.push(issue)
    }
    else {
      // Domain validation for og:url
      const domainValidation = validateUrlDomain(page.og.url, config)
      if (!domainValidation.isValid && domainValidation.issue) {
        // SEO00422: www when main domain does not use it
        // SEO00423: missing www when main domain uses it
        let ruleId: string
        switch (domainValidation.issue) {
          case 'www_mismatch':
            ruleId = domainValidation.hostname?.startsWith('www.') ? 'SEO00422' : 'SEO00423'
            break
          default:
            ruleId = '' // Skip for subdomain/wrong_domain - og:url may legitimately differ
        }

        if (ruleId) {
          const issue = createIssue(ruleId, page, {
            element: page.og.url,
            actual: domainValidation.hostname || page.og.url,
            expected: domainValidation.expectedHostname,
          })
          if (issue)
            issues.push(issue)
        }
      }

      // SEO01190: og:url mismatch with canonical
      if (page.canonical && page.og.url !== page.canonical) {
        const issue = createIssue('SEO01190', page, {
          element: `og:url: ${page.og.url}`,
          actual: page.og.url,
          expected: page.canonical,
        })
        if (issue)
          issues.push(issue)
      }
    }
  }

  // SEO01175: Missing og:type
  if (!page.og.type) {
    const issue = createIssue('SEO01175', page)
    if (issue)
      issues.push(issue)
  }
  else {
    // SEO01176: Invalid og:type value
    if (!VALID_OG_TYPES.has(page.og.type)) {
      const issue = createIssue('SEO01176', page, {
        element: page.og.type,
        actual: page.og.type,
        expected: 'website, article, book, profile, or video/music types',
      })
      if (issue)
        issues.push(issue)
    }

    // Article-specific checks
    if (page.og.type === 'article') {
      // SEO01203: Article missing og:article:published_time
      if (!page.og.articlePublishedTime) {
        const issue = createIssue('SEO01203', page)
        if (issue)
          issues.push(issue)
      }

      // SEO01204: Article missing og:article:author
      if (!page.og.articleAuthor) {
        const issue = createIssue('SEO01204', page)
        if (issue)
          issues.push(issue)
      }
    }
  }

  // SEO01185: Missing og:site_name
  if (!page.og.siteName) {
    const issue = createIssue('SEO01185', page)
    if (issue)
      issues.push(issue)
  }

  // SEO01186: Missing og:locale
  if (!page.og.locale) {
    const issue = createIssue('SEO01186', page)
    if (issue)
      issues.push(issue)
  }
  else {
    // SEO01187: Invalid og:locale format
    if (!OG_LOCALE_PATTERN.test(page.og.locale)) {
      const issue = createIssue('SEO01187', page, {
        element: page.og.locale,
        actual: page.og.locale,
        expected: 'language_TERRITORY format (e.g., en_US)',
      })
      if (issue)
        issues.push(issue)
    }
  }

  // =====================
  // OpenGraph Image Tags
  // =====================

  if (page.og.image) {
    // SEO01188: og:image dimensions not specified
    if (!page.og.imageWidth || !page.og.imageHeight) {
      const issue = createIssue('SEO01188', page, { element: page.og.image })
      if (issue)
        issues.push(issue)
    }
    else {
      // SEO01189: og:image too small for optimal display
      const width = Number.parseInt(page.og.imageWidth, 10)
      const height = Number.parseInt(page.og.imageHeight, 10)
      if (!Number.isNaN(width) && !Number.isNaN(height)) {
        if (width < 1200 || height < 630) {
          const issue = createIssue('SEO01189', page, {
            element: page.og.image,
            actual: `${width}x${height}`,
            expected: '>= 1200x630',
          })
          if (issue)
            issues.push(issue)
        }
      }
    }

    // SEO01199: Missing og:image:alt
    if (!page.og.imageAlt) {
      const issue = createIssue('SEO01199', page, { element: page.og.image })
      if (issue)
        issues.push(issue)
    }
    else if (page.og.imageAlt.trim() === '') {
      // SEO01210: og:image:alt is empty
      const issue = createIssue('SEO01210', page, { element: page.og.image })
      if (issue)
        issues.push(issue)
    }

    // SEO01205: Invalid og:image:type
    if (page.og.imageType && !VALID_IMAGE_MIME_TYPES.has(page.og.imageType)) {
      const issue = createIssue('SEO01205', page, {
        element: page.og.imageType,
        actual: page.og.imageType,
        expected: 'image/jpeg, image/png, image/gif, image/webp, or image/svg+xml',
      })
      if (issue)
        issues.push(issue)
    }

    // SEO01201: Duplicate og:image tags
    if (page.ogImageCount && page.ogImageCount > 1) {
      const issue = createIssue('SEO01201', page, {
        actual: `${page.ogImageCount} og:image tags`,
      })
      if (issue)
        issues.push(issue)
    }
  }

  // =====================
  // Twitter Card Tags
  // =====================

  // SEO00172: Missing twitter:card
  if (!page.twitter.card) {
    const issue = createIssue('SEO00172', page)
    if (issue)
      issues.push(issue)
  }
  else {
    // SEO01180: Invalid twitter:card value
    if (!VALID_TWITTER_CARD_TYPES.has(page.twitter.card)) {
      const issue = createIssue('SEO01180', page, {
        element: page.twitter.card,
        actual: page.twitter.card,
        expected: 'summary, summary_large_image, app, or player',
      })
      if (issue)
        issues.push(issue)
    }
  }

  // SEO00173: Missing twitter:title
  if (!page.twitter.title) {
    const issue = createIssue('SEO00173', page)
    if (issue)
      issues.push(issue)
  }
  else {
    // SEO01208: twitter:title is empty
    if (page.twitter.title.trim() === '') {
      const issue = createIssue('SEO01208', page)
      if (issue)
        issues.push(issue)
    }
    else {
      // SEO01181: twitter:title too long (>70 chars)
      if (page.twitter.title.length > 70) {
        const issue = createIssue('SEO01181', page, {
          element: page.twitter.title.substring(0, 50),
          actual: `${page.twitter.title.length} chars`,
          expected: '<= 70 chars',
        })
        if (issue)
          issues.push(issue)
      }
    }
  }

  // SEO00174: Missing twitter:description
  if (!page.twitter.description) {
    const issue = createIssue('SEO00174', page)
    if (issue)
      issues.push(issue)
  }
  else {
    // SEO01209: twitter:description is empty
    if (page.twitter.description.trim() === '') {
      const issue = createIssue('SEO01209', page)
      if (issue)
        issues.push(issue)
    }
    else {
      // SEO01182: twitter:description too long (>200 chars)
      if (page.twitter.description.length > 200) {
        const issue = createIssue('SEO01182', page, {
          element: page.twitter.description.substring(0, 50),
          actual: `${page.twitter.description.length} chars`,
          expected: '<= 200 chars',
        })
        if (issue)
          issues.push(issue)
      }
    }
  }

  // SEO00175: Missing twitter:image
  if (!page.twitter.image) {
    const issue = createIssue('SEO00175', page)
    if (issue)
      issues.push(issue)
  }
  else {
    // SEO01183: twitter:image is relative URL
    if (!page.twitter.image.startsWith('http://') && !page.twitter.image.startsWith('https://')) {
      const issue = createIssue('SEO01183', page, { element: page.twitter.image })
      if (issue)
        issues.push(issue)

      // SEO01184: twitter:image points to missing file
      const resolvedPath = resolveToFilePath(page.twitter.image, page.relativePath, config.distPath)
      if (resolvedPath && !fileExists(resolvedPath)) {
        const issue = createIssue('SEO01184', page, { element: page.twitter.image })
        if (issue)
          issues.push(issue)
      }
    }

    // SEO01198: twitter:image uses HTTP instead of HTTPS
    if (page.twitter.image.startsWith('http://')) {
      const issue = createIssue('SEO01198', page, { element: page.twitter.image })
      if (issue)
        issues.push(issue)
    }

    // SEO01200: Missing twitter:image:alt
    if (!page.twitter.imageAlt) {
      const issue = createIssue('SEO01200', page, { element: page.twitter.image })
      if (issue)
        issues.push(issue)
    }
  }

  // SEO01191: Missing twitter:site
  if (!page.twitter.site) {
    const issue = createIssue('SEO01191', page)
    if (issue)
      issues.push(issue)
  }
  else {
    // SEO01192: Invalid twitter:site format
    if (!TWITTER_HANDLE_PATTERN.test(page.twitter.site)) {
      const issue = createIssue('SEO01192', page, {
        element: page.twitter.site,
        actual: page.twitter.site,
        expected: '@handle format',
      })
      if (issue)
        issues.push(issue)
    }
  }

  // SEO01193: Missing twitter:creator (optional, only notice)
  if (!page.twitter.creator) {
    const issue = createIssue('SEO01193', page)
    if (issue)
      issues.push(issue)
  }
  else {
    // SEO01194: Invalid twitter:creator format
    if (!TWITTER_HANDLE_PATTERN.test(page.twitter.creator)) {
      const issue = createIssue('SEO01194', page, {
        element: page.twitter.creator,
        actual: page.twitter.creator,
        expected: '@handle format',
      })
      if (issue)
        issues.push(issue)
    }
  }

  return issues
}

/**
 * Check international SEO rules
 * SEO00177-00185
 */
export function checkInternationalSEO(page: PageData, config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  // SEO00182: Invalid HTML lang attribute
  if (page.htmlLang && !isValidBCP47(page.htmlLang)) {
    const issue = createIssue('SEO00182', page, { element: page.htmlLang })
    if (issue)
      issues.push(issue)
  }

  // SEO00183: lang attribute doesn't match content language (would need language detection)

  if (page.hreflangs.length > 0) {
    const langCodes = new Set<string>()
    let hasSelfReference = false
    let hasXDefault = false

    for (const hreflang of page.hreflangs) {
      // SEO00177: Invalid language code
      if (!isValidBCP47(hreflang.lang)) {
        const issue = createIssue('SEO00177', page, { element: hreflang.lang })
        if (issue)
          issues.push(issue)
      }

      // SEO00178: Duplicate language codes
      if (langCodes.has(hreflang.lang)) {
        const issue = createIssue('SEO00178', page, { element: hreflang.lang })
        if (issue)
          issues.push(issue)
      }
      langCodes.add(hreflang.lang)

      // SEO00180: Relative hreflang URLs
      if (!hreflang.url.startsWith('http://') && !hreflang.url.startsWith('https://')) {
        const issue = createIssue('SEO00180', page, { element: `${hreflang.lang}: ${hreflang.url}` })
        if (issue)
          issues.push(issue)
      }
      else {
        // Domain validation for hreflang URLs (only for absolute URLs)
        const domainValidation = validateUrlDomain(hreflang.url, config)
        if (!domainValidation.isValid && domainValidation.issue) {
          // SEO00184: www when main domain does not use it
          // SEO00185: missing www when main domain uses it
          let ruleId: string
          switch (domainValidation.issue) {
            case 'www_mismatch':
              ruleId = domainValidation.hostname?.startsWith('www.') ? 'SEO00184' : 'SEO00185'
              break
            default:
              // For subdomain/wrong_domain, skip - hreflang can reference different subdomains legitimately
              ruleId = ''
          }

          if (ruleId) {
            const issue = createIssue(ruleId, page, {
              element: `${hreflang.lang}: ${hreflang.url}`,
              actual: domainValidation.hostname || hreflang.url,
              expected: domainValidation.expectedHostname,
            })
            if (issue)
              issues.push(issue)
          }
        }
      }

      // Check for self-reference
      if (hreflang.url === page.url || hreflang.url === page.canonical) {
        hasSelfReference = true
      }

      if (hreflang.lang === 'x-default') {
        hasXDefault = true
      }
    }

    // SEO00179: Missing self-reference
    if (!hasSelfReference && page.hreflangs.length > 0) {
      const issue = createIssue('SEO00179', page)
      if (issue)
        issues.push(issue)
    }

    // SEO00181: Missing x-default
    if (!hasXDefault && page.hreflangs.length > 1) {
      const issue = createIssue('SEO00181', page)
      if (issue)
        issues.push(issue)
    }
  }

  return issues
}

/**
 * Check structured data rules
 * SEO00229-00367
 */
export function checkStructuredData(page: PageData, _config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  for (const data of page.jsonLd) {
    // SEO00229: Invalid JSON
    if (typeof data === 'object' && data !== null && '_parseError' in data) {
      const issue = createIssue('SEO00229', page)
      if (issue)
        issues.push(issue)
      continue
    }

    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>

      // SEO00230: Missing @context
      if (!('@context' in obj)) {
        const issue = createIssue('SEO00230', page)
        if (issue)
          issues.push(issue)
      }

      // SEO00231: Missing @type
      if (!('@type' in obj) && !('@graph' in obj)) {
        const issue = createIssue('SEO00231', page)
        if (issue)
          issues.push(issue)
      }

      // Check for @graph structure
      if ('@graph' in obj && Array.isArray(obj['@graph'])) {
        for (const item of obj['@graph']) {
          checkSchemaItem(item, page, issues)
        }
      }
      else if ('@type' in obj) {
        checkSchemaItem(obj, page, issues)
      }
    }
  }

  return issues
}

/**
 * Check a single schema.org item for required fields and validate against JSON Schema
 */
function checkSchemaItem(item: unknown, page: PageData, issues: SEOIssue[]): void {
  if (typeof item !== 'object' || item === null)
    return

  const obj = item as Record<string, unknown>
  const schemaType = obj['@type'] as string | string[] | undefined

  if (!schemaType)
    return

  const types = Array.isArray(schemaType) ? schemaType : [schemaType]

  for (const type of types) {
    // Check if schema type exists in schema.org
    if (!hasSchemaFor(type)) {
      const issue = createIssue('SEO01174', page, {
        element: `Unknown schema type: ${type}`,
      })
      if (issue) {
        issue.ruleName = `Unknown schema type: ${type}`
        issues.push(issue)
      }
    }

    const requiredFields = SCHEMA_REQUIRED_FIELDS[type]
    if (requiredFields) {
      for (const field of requiredFields) {
        if (!(field in obj) || obj[field] === null || obj[field] === undefined) {
          // Generate rule ID based on schema type and field
          // This maps to rules like SEO00232-SEO00367 for various schema types
          const issue = createIssue('SEO00232', page, {
            element: `${type}: missing '${field}'`,
          })
          if (issue) {
            issue.ruleName = `Schema ${type}: missing '${field}'`
            issues.push(issue)
          }
        }
        else if (typeof obj[field] === 'string' && (obj[field] as string).trim() === '') {
          const issue = createIssue('SEO00233', page, {
            element: `${type}: empty '${field}'`,
          })
          if (issue) {
            issue.ruleName = `Schema ${type}: empty '${field}'`
            issues.push(issue)
          }
        }
      }
    }

    // Check for BreadcrumbList specifics
    if (type === 'BreadcrumbList' && 'itemListElement' in obj) {
      const items = obj.itemListElement
      if (!Array.isArray(items)) {
        const issue = createIssue('SEO00359', page)
        if (issue)
          issues.push(issue)
      }
      else {
        // Check each breadcrumb item has position
        for (let i = 0; i < items.length; i++) {
          const listItem = items[i] as Record<string, unknown>
          if (!listItem.position) {
            const issue = createIssue('SEO00360', page, {
              element: `ListItem ${i + 1} missing position`,
            })
            if (issue)
              issues.push(issue)
          }
        }
      }
    }
  }

  // Validate against JSON Schema (schema.org)
  const validationResult = validateJsonLd(obj)
  if (!validationResult.valid) {
    // Deduplicate errors by message to avoid noise
    const seenErrors = new Set<string>()
    for (const error of validationResult.errors) {
      const errorKey = `${error.schemaType}:${error.path}:${error.keyword}`
      if (seenErrors.has(errorKey))
        continue
      seenErrors.add(errorKey)

      // Map error keywords to appropriate rule IDs
      const ruleId = error.keyword === 'type' ? 'SEO01173' : 'SEO01172'
      const issue = createIssue(ruleId, page, {
        element: `${error.schemaType}${error.path}: ${error.message}`,
      })
      if (issue) {
        issue.ruleName = `Schema ${error.schemaType}: ${error.message}`
        issues.push(issue)
      }
    }
  }

  // Recursively check nested objects
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('@'))
      continue
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        for (const v of value) {
          checkSchemaItem(v, page, issues)
        }
      }
      else {
        checkSchemaItem(value, page, issues)
      }
    }
  }
}

/**
 * Check content quality rules
 * SEO00186-00225
 */
export function checkContentQuality(page: PageData, _config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  // SEO00186-00195: Thin content by word count thresholds
  if (page.wordCount < 50) {
    const issue = createIssue('SEO00186', page, { actual: `${page.wordCount} words`, expected: '>= 50 words' })
    if (issue)
      issues.push(issue)
  }
  else if (page.wordCount < 100) {
    const issue = createIssue('SEO00187', page, { actual: `${page.wordCount} words`, expected: '>= 100 words' })
    if (issue)
      issues.push(issue)
  }
  else if (page.wordCount < 150) {
    const issue = createIssue('SEO00188', page, { actual: `${page.wordCount} words`, expected: '>= 150 words' })
    if (issue)
      issues.push(issue)
  }
  else if (page.wordCount < 200) {
    const issue = createIssue('SEO00189', page, { actual: `${page.wordCount} words`, expected: '>= 200 words' })
    if (issue)
      issues.push(issue)
  }
  else if (page.wordCount < 300) {
    const issue = createIssue('SEO00190', page, { actual: `${page.wordCount} words`, expected: '>= 300 words' })
    if (issue)
      issues.push(issue)
  }

  // SEO00196-00200: Too much content (very long pages)
  if (page.wordCount > 10000) {
    const issue = createIssue('SEO00200', page, { actual: `${page.wordCount} words`, expected: '<= 10000 words' })
    if (issue)
      issues.push(issue)
  }
  else if (page.wordCount > 7500) {
    const issue = createIssue('SEO00199', page, { actual: `${page.wordCount} words`, expected: '<= 7500 words' })
    if (issue)
      issues.push(issue)
  }
  else if (page.wordCount > 5000) {
    const issue = createIssue('SEO00198', page, { actual: `${page.wordCount} words`, expected: '<= 5000 words' })
    if (issue)
      issues.push(issue)
  }

  return issues
}

/**
 * Check template hygiene rules
 * SEO00382-00397
 */
export function checkTemplateHygiene(page: PageData, _config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  // Check title for placeholders
  if (page.title) {
    for (const [pattern, name, ruleId] of PLACEHOLDER_PATTERNS) {
      if (pattern.test(page.title)) {
        const issue = createIssue(ruleId, page, { element: `title: ${page.title}` })
        if (issue) {
          issue.ruleName = `${name} placeholder in title`
          issues.push(issue)
        }
      }
    }
  }

  // Check meta description for placeholders
  if (page.metaDescription) {
    for (const [pattern, name, ruleId] of PLACEHOLDER_PATTERNS) {
      if (pattern.test(page.metaDescription)) {
        const issue = createIssue(ruleId.replace('382', '383'), page, {
          element: `description: ${page.metaDescription.substring(0, 50)}`,
        })
        if (issue) {
          issue.ruleName = `${name} placeholder in meta description`
          issues.push(issue)
        }
      }
    }
  }

  // Check H1 for placeholders
  for (const h1 of page.h1s) {
    for (const [pattern, name, ruleId] of PLACEHOLDER_PATTERNS) {
      if (pattern.test(h1)) {
        const issue = createIssue(ruleId.replace('382', '384'), page, {
          element: `h1: ${h1.substring(0, 50)}`,
        })
        if (issue) {
          issue.ruleName = `${name} placeholder in H1`
          issues.push(issue)
        }
      }
    }
  }

  // Check body text for common placeholders
  const bodyText = page.html.replace(/<[^>]+>/g, ' ').substring(0, 10000)
  if (/lorem ipsum/i.test(bodyText)) {
    const issue = createIssue('SEO00385', page)
    if (issue)
      issues.push(issue)
  }
  if (/\bTODO\b/.test(bodyText)) {
    const issue = createIssue('SEO00389', page)
    if (issue)
      issues.push(issue)
  }
  if (/\bFIXME\b/.test(bodyText)) {
    const issue = createIssue('SEO00393', page)
    if (issue)
      issues.push(issue)
  }

  return issues
}

/**
 * Check accessibility rules
 * SEO00222-00225, SEO00398-00412
 */
export function checkAccessibility(page: PageData, _config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  // SEO00222: Missing main landmark
  if (!page.hasMainLandmark) {
    const issue = createIssue('SEO00222', page)
    if (issue)
      issues.push(issue)
  }

  // SEO00223: Skip link missing (check for skip-to-content or skip-nav)
  if (!page.html.includes('skip-to-') && !page.html.includes('skip-nav') && !page.html.includes('skipnav')) {
    const issue = createIssue('SEO00223', page)
    if (issue)
      issues.push(issue)
  }

  // SEO00410: Empty aria-label
  const emptyAriaLabels = page.html.match(/aria-label=["']\s*["']/gi)
  if (emptyAriaLabels && emptyAriaLabels.length > 0) {
    const issue = createIssue('SEO00410', page, { actual: `${emptyAriaLabels.length} empty aria-labels` })
    if (issue)
      issues.push(issue)
  }

  // SEO00412: role="img" without aria-label
  const imgRoles = page.html.match(/role=["']img["'][^>]*>/gi) || []
  for (const imgRole of imgRoles) {
    if (!imgRole.includes('aria-label') && !imgRole.includes('aria-labelledby')) {
      const issue = createIssue('SEO00412', page)
      if (issue)
        issues.push(issue)
      break // Only report once per page
    }
  }

  // SEO01211-01213: Form inputs without labels
  for (const input of page.formInputsWithoutLabels) {
    let ruleId: string
    switch (input.type) {
      case 'input':
        ruleId = 'SEO01211'
        break
      case 'select':
        ruleId = 'SEO01212'
        break
      case 'textarea':
        ruleId = 'SEO01213'
        break
    }
    const element = input.id
      ? `<${input.type} id="${input.id}">`
      : input.name
        ? `<${input.type} name="${input.name}">`
        : `<${input.type}${input.inputType ? ` type="${input.inputType}"` : ''}>`
    const issue = createIssue(ruleId, page, { element })
    if (issue)
      issues.push(issue)
  }

  return issues
}

/**
 * Check broken anchor links
 * SEO01214
 */
export function checkBrokenAnchors(page: PageData, _config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []
  const elementIds = new Set(page.elementIds)

  for (const link of page.links) {
    // Check for anchor links (href="#something")
    if (link.href && link.href.startsWith('#') && link.href.length > 1) {
      const targetId = link.href.slice(1)
      if (!elementIds.has(targetId)) {
        const issue = createIssue('SEO01214', page, {
          element: link.href,
          actual: `Target id="${targetId}" not found`,
        })
        if (issue)
          issues.push(issue)
      }
    }
  }

  return issues
}

/**
 * Check video elements
 * SEO01215
 */
export function checkVideos(page: PageData, _config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  for (const video of page.videos) {
    // SEO01215: Video missing poster attribute
    if (!video.poster) {
      const issue = createIssue('SEO01215', page, {
        element: video.src || '<video>',
      })
      if (issue)
        issues.push(issue)
    }
  }

  return issues
}

/**
 * Check E-E-A-T signals (author information on articles)
 * SEO01216
 */
export function checkEEAT(page: PageData, _config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  // SEO01216: Article missing author information
  if (page.isArticle && !page.hasAuthorInfo) {
    const issue = createIssue('SEO01216', page)
    if (issue)
      issues.push(issue)
  }

  return issues
}

/**
 * Check favicon presence
 * SEO01217
 */
export function checkFavicon(page: PageData, _config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  // SEO01217: Missing favicon
  if (!page.hasFavicon) {
    const issue = createIssue('SEO01217', page)
    if (issue)
      issues.push(issue)
  }

  return issues
}

/**
 * Check image dimensions for CLS
 * SEO01218-01220
 */
export function checkImageDimensions(page: PageData, _config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  for (const img of page.images) {
    // Skip data URIs and SVGs (they often don't need explicit dimensions)
    if (img.src && (img.src.startsWith('data:') || img.src.endsWith('.svg')))
      continue

    const hasWidth = img.width !== undefined && img.width !== ''
    const hasHeight = img.height !== undefined && img.height !== ''

    if (!hasWidth && !hasHeight) {
      // SEO01220: Missing both width and height (error)
      const issue = createIssue('SEO01220', page, { element: img.src })
      if (issue)
        issues.push(issue)
    }
    else if (!hasWidth) {
      // SEO01218: Missing width only (warning)
      const issue = createIssue('SEO01218', page, { element: img.src })
      if (issue)
        issues.push(issue)
    }
    else if (!hasHeight) {
      // SEO01219: Missing height only (warning)
      const issue = createIssue('SEO01219', page, { element: img.src })
      if (issue)
        issues.push(issue)
    }
  }

  return issues
}

/**
 * Check HTML semantics
 * SEO00416-00429
 */
export function checkHtmlSemantics(page: PageData, _config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  // SEO00416: Using <b> instead of <strong>
  if (/<b[^>]*>/.test(page.html) && !/<strong[^>]*>/.test(page.html)) {
    const issue = createIssue('SEO00416', page)
    if (issue)
      issues.push(issue)
  }

  // SEO00417: Using <i> instead of <em>
  if (/<i[^>]*>/.test(page.html) && !/<em[^>]*>/.test(page.html)) {
    const issue = createIssue('SEO00417', page)
    if (issue)
      issues.push(issue)
  }

  // SEO00418: Using deprecated tags
  const deprecatedTags = ['<font', '<center', '<marquee', '<blink', '<strike', '<big', '<tt']
  for (const tag of deprecatedTags) {
    if (page.html.toLowerCase().includes(tag)) {
      const issue = createIssue('SEO00418', page, { element: tag })
      if (issue)
        issues.push(issue)
    }
  }

  // SEO00419: Tables used for layout (tables without proper headers)
  const tableMatches = page.html.match(/<table[^>]*>[\s\S]*?<\/table>/gi) || []
  for (const table of tableMatches) {
    if (!/<th[^>]*>/i.test(table)) {
      const issue = createIssue('SEO00419', page)
      if (issue)
        issues.push(issue)
      break
    }
  }

  // SEO00420: Inline styles used excessively
  const inlineStyleCount = (page.html.match(/style=["'][^"']+["']/gi) || []).length
  if (inlineStyleCount > 50) {
    const issue = createIssue('SEO00420', page, { actual: `${inlineStyleCount} inline styles` })
    if (issue)
      issues.push(issue)
  }

  return issues
}

/**
 * Check site-wide duplicate rules
 * SEO00088-00099
 */
export function checkDuplicates(siteData: SiteData, config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  // SEO00088: Duplicate titles
  for (const [title, pages] of siteData.titles) {
    if (pages.length > 1) {
      const rule = getRule('SEO00088')
      if (rule) {
        issues.push({
          ruleId: 'SEO00088',
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          file: '',
          relativePath: pages.slice(0, 3).join(', ') + (pages.length > 3 ? ` (+${pages.length - 3} more)` : ''),
          element: title.substring(0, 50),
          actual: `${pages.length} pages`,
          fixHint: rule.fixHint,
          fingerprint: `SEO00088::${title.substring(0, 50)}`,
        })
      }
    }
  }

  // SEO00090: Duplicate descriptions
  for (const [desc, pages] of siteData.descriptions) {
    if (pages.length > 1) {
      const rule = getRule('SEO00090')
      if (rule) {
        issues.push({
          ruleId: 'SEO00090',
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          file: '',
          relativePath: pages.slice(0, 3).join(', ') + (pages.length > 3 ? ` (+${pages.length - 3} more)` : ''),
          element: desc.substring(0, 50),
          actual: `${pages.length} pages`,
          fixHint: rule.fixHint,
          fingerprint: `SEO00090::${desc.substring(0, 50)}`,
        })
      }
    }
  }

  // SEO00092: Duplicate H1s
  for (const [h1, pages] of siteData.h1s) {
    if (pages.length > 1) {
      const rule = getRule('SEO00092')
      if (rule) {
        issues.push({
          ruleId: 'SEO00092',
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          file: '',
          relativePath: pages.slice(0, 3).join(', ') + (pages.length > 3 ? ` (+${pages.length - 3} more)` : ''),
          element: h1.substring(0, 50),
          actual: `${pages.length} pages`,
          fixHint: rule.fixHint,
          fingerprint: `SEO00092::${h1.substring(0, 50)}`,
        })
      }
    }
  }

  // SEO00094: Duplicate canonicals
  for (const [canonical, pages] of siteData.canonicals) {
    if (pages.length > 1) {
      // Check if these are language variants
      const isLanguageVariant = pages.every((p) => {
        const langMatch = p.match(/^([a-z]{2}(-[A-Z]{2})?)\//i)
        return langMatch !== null
      })

      if (!isLanguageVariant || pages.length > config.languages.length) {
        const rule = getRule('SEO00094')
        if (rule) {
          issues.push({
            ruleId: 'SEO00094',
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            file: '',
            relativePath: pages.slice(0, 3).join(', ') + (pages.length > 3 ? ` (+${pages.length - 3} more)` : ''),
            element: canonical.substring(0, 50),
            actual: `${pages.length} pages`,
            fixHint: rule.fixHint,
            fingerprint: `SEO00094::${canonical.substring(0, 50)}`,
          })
        }
      }
    }
  }

  return issues
}

/**
 * Check robots.txt file
 * SEO01153-01157, SEO01165
 */
export function checkRobotsTxt(config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []
  const robotsPath = path.join(config.distPath, 'robots.txt')

  // SEO01153: Missing robots.txt
  if (!fileExists(robotsPath)) {
    const rule = getRule('SEO01153')
    if (rule) {
      issues.push({
        ruleId: 'SEO01153',
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        file: 'robots.txt',
        relativePath: 'robots.txt',
        fixHint: rule.fixHint,
        fingerprint: 'SEO01153::robots.txt',
      })
    }
    return issues
  }

  // Read and parse robots.txt
  const content = fsSync.readFileSync(robotsPath, 'utf-8')
  const lines = content.split('\n')

  let _hasUserAgent = false
  let hasSitemap = false
  let hasDisallowAll = false
  const sitemapUrls: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#'))
      continue

    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) {
      // SEO01154: Syntax error - line without colon
      const rule = getRule('SEO01154')
      if (rule) {
        issues.push({
          ruleId: 'SEO01154',
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          file: 'robots.txt',
          relativePath: 'robots.txt',
          element: trimmed.substring(0, 50),
          fixHint: rule.fixHint,
          fingerprint: `SEO01154::${trimmed.substring(0, 30)}`,
        })
      }
      continue
    }

    const directive = trimmed.substring(0, colonIndex).toLowerCase().trim()
    const value = trimmed.substring(colonIndex + 1).trim()

    if (directive === 'user-agent') {
      _hasUserAgent = true
    }
    else if (directive === 'sitemap') {
      hasSitemap = true
      sitemapUrls.push(value)

      // Validate domain of sitemap URL
      const domainValidation = validateUrlDomain(value, config)

      if (!domainValidation.isValid && domainValidation.issue) {
        // SEO01166: www when main domain does not use it
        // SEO01167: missing www when main domain uses it
        // SEO01168: different subdomain
        let ruleId: string
        switch (domainValidation.issue) {
          case 'www_mismatch':
            // Check if the URL has www but expected doesn't
            ruleId = domainValidation.hostname?.startsWith('www.') ? 'SEO01166' : 'SEO01167'
            break
          case 'subdomain':
            ruleId = 'SEO01168'
            break
          default:
            ruleId = 'SEO01157'
        }

        const rule = getRule(ruleId)
        if (rule) {
          issues.push({
            ruleId,
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            file: 'robots.txt',
            relativePath: 'robots.txt',
            element: value,
            actual: domainValidation.hostname || value,
            expected: domainValidation.expectedHostname,
            fixHint: rule.fixHint,
            fingerprint: `${ruleId}::${value}`,
          })
        }
      }
      else if (!value.startsWith(config.baseUrl)) {
        // SEO01157: Sitemap URL doesn't match baseUrl (fallback for protocol mismatch, etc.)
        const rule = getRule('SEO01157')
        if (rule) {
          issues.push({
            ruleId: 'SEO01157',
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            file: 'robots.txt',
            relativePath: 'robots.txt',
            element: value,
            actual: value,
            expected: config.baseUrl,
            fixHint: rule.fixHint,
            fingerprint: `SEO01157::${value}`,
          })
        }
      }
    }
    else if (directive === 'disallow' && value === '/') {
      hasDisallowAll = true
    }
  }

  // SEO01155: Missing Sitemap directive
  if (!hasSitemap) {
    const rule = getRule('SEO01155')
    if (rule) {
      issues.push({
        ruleId: 'SEO01155',
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        file: 'robots.txt',
        relativePath: 'robots.txt',
        fixHint: rule.fixHint,
        fingerprint: 'SEO01155::robots.txt',
      })
    }
  }

  // SEO01156: Blocks all crawlers
  if (hasDisallowAll) {
    const rule = getRule('SEO01156')
    if (rule) {
      issues.push({
        ruleId: 'SEO01156',
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        file: 'robots.txt',
        relativePath: 'robots.txt',
        element: 'Disallow: /',
        fixHint: rule.fixHint,
        fingerprint: 'SEO01156::robots.txt',
      })
    }
  }

  // SEO01165: Sitemap in robots.txt doesn't exist
  for (const sitemapUrl of sitemapUrls) {
    // Convert URL to file path - extract pathname from URL regardless of domain
    let sitemapPath: string
    try {
      const urlObj = new URL(sitemapUrl)
      sitemapPath = urlObj.pathname.replace(/^\//, '')
    }
    catch {
      // If URL parsing fails, try simple replace as fallback
      sitemapPath = sitemapUrl.replace(config.baseUrl, '').replace(/^\//, '')
    }
    const fullPath = path.join(config.distPath, sitemapPath)

    if (!fileExists(fullPath)) {
      const rule = getRule('SEO01165')
      if (rule) {
        issues.push({
          ruleId: 'SEO01165',
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          file: 'robots.txt',
          relativePath: 'robots.txt',
          element: sitemapUrl,
          fixHint: rule.fixHint,
          fingerprint: `SEO01165::${sitemapUrl}`,
        })
      }
    }
  }

  return issues
}

/**
 * Check sitemap.xml files
 * SEO01158-01164
 */
export function checkSitemap(config: SEOCheckerConfig, _siteData: SiteData): SEOIssue[] {
  const issues: SEOIssue[] = []

  // Check for sitemap files - could be sitemap.xml, sitemap-index.xml, or sitemap-0.xml
  const possibleSitemaps = ['sitemap.xml', 'sitemap-index.xml', 'sitemap-0.xml']
  let foundSitemap = false
  const sitemapFiles: string[] = []

  for (const name of possibleSitemaps) {
    const sitemapPath = path.join(config.distPath, name)
    if (fileExists(sitemapPath)) {
      foundSitemap = true
      sitemapFiles.push(sitemapPath)
    }
  }

  // SEO01158: Missing sitemap
  if (!foundSitemap) {
    const rule = getRule('SEO01158')
    if (rule) {
      issues.push({
        ruleId: 'SEO01158',
        ruleName: rule.name,
        category: rule.category,
        severity: rule.severity,
        file: 'sitemap.xml',
        relativePath: 'sitemap.xml',
        fixHint: rule.fixHint,
        fingerprint: 'SEO01158::sitemap.xml',
      })
    }
    return issues
  }

  // Process each sitemap file
  const seenUrls = new Set<string>()
  const urlsWithTrailingSlash = new Set<string>()
  const urlsWithoutTrailingSlash = new Set<string>()

  for (const sitemapPath of sitemapFiles) {
    const relativePath = path.relative(config.distPath, sitemapPath)
    let content: string

    try {
      content = fsSync.readFileSync(sitemapPath, 'utf-8')
    }
    catch {
      continue
    }

    // Basic XML validation
    if (!content.includes('<?xml') && !content.includes('<urlset') && !content.includes('<sitemapindex')) {
      const rule = getRule('SEO01159')
      if (rule) {
        issues.push({
          ruleId: 'SEO01159',
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          file: sitemapPath,
          relativePath,
          fixHint: rule.fixHint,
          fingerprint: `SEO01159::${relativePath}`,
        })
      }
      continue
    }

    // If it's a sitemap index, find referenced sitemaps
    if (content.includes('<sitemapindex')) {
      const locMatches = content.matchAll(/<loc>([^<]+)<\/loc>/g)
      for (const match of locMatches) {
        const loc = match[1]
        // Extract pathname from URL regardless of domain
        let sitemapName: string
        try {
          const urlObj = new URL(loc)
          sitemapName = urlObj.pathname.replace(/^\//, '')
        }
        catch {
          // If URL parsing fails, try simple replace as fallback
          sitemapName = loc.replace(config.baseUrl, '').replace(/^\//, '')
        }
        const referencedPath = path.join(config.distPath, sitemapName)
        if (fileExists(referencedPath) && !sitemapFiles.includes(referencedPath)) {
          sitemapFiles.push(referencedPath)
        }
      }
      continue
    }

    // Parse URLs from sitemap
    const urlMatches = content.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]*)<\/lastmod>)?/g)

    for (const match of urlMatches) {
      const url = match[1]
      const lastmod = match[2]

      // SEO01161: HTTP instead of HTTPS
      if (config.baseUrl.startsWith('https://') && url.startsWith('http://')) {
        const rule = getRule('SEO01161')
        if (rule) {
          issues.push({
            ruleId: 'SEO01161',
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            file: sitemapPath,
            relativePath,
            element: url.substring(0, 80),
            fixHint: rule.fixHint,
            fingerprint: `SEO01161::${url.substring(0, 50)}`,
          })
        }
      }

      // Domain validation for sitemap URLs
      const domainValidation = validateUrlDomain(url, config)
      if (!domainValidation.isValid && domainValidation.issue) {
        // SEO01169: www when main domain does not use it
        // SEO01170: missing www when main domain uses it
        // SEO01171: different subdomain
        let ruleId: string
        switch (domainValidation.issue) {
          case 'www_mismatch':
            ruleId = domainValidation.hostname?.startsWith('www.') ? 'SEO01169' : 'SEO01170'
            break
          case 'subdomain':
            ruleId = 'SEO01171'
            break
          default:
            ruleId = 'SEO01171' // wrong_domain treated as subdomain issue
        }

        const rule = getRule(ruleId)
        if (rule) {
          issues.push({
            ruleId,
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            file: sitemapPath,
            relativePath,
            element: url.substring(0, 80),
            actual: domainValidation.hostname || url,
            expected: domainValidation.expectedHostname,
            fixHint: rule.fixHint,
            fingerprint: `${ruleId}::${url.substring(0, 50)}`,
          })
        }
      }

      // SEO01162: Duplicate URLs
      if (seenUrls.has(url)) {
        const rule = getRule('SEO01162')
        if (rule) {
          issues.push({
            ruleId: 'SEO01162',
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            file: sitemapPath,
            relativePath,
            element: url.substring(0, 80),
            fixHint: rule.fixHint,
            fingerprint: `SEO01162::${url.substring(0, 50)}`,
          })
        }
      }
      seenUrls.add(url)

      // Track trailing slash consistency
      if (url.endsWith('/')) {
        urlsWithTrailingSlash.add(url)
      }
      else {
        urlsWithoutTrailingSlash.add(url)
      }

      // SEO01163: Invalid lastmod date
      if (lastmod && lastmod.trim() !== '') {
        const datePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/
        if (!datePattern.test(lastmod.trim())) {
          const rule = getRule('SEO01163')
          if (rule) {
            issues.push({
              ruleId: 'SEO01163',
              ruleName: rule.name,
              category: rule.category,
              severity: rule.severity,
              file: sitemapPath,
              relativePath,
              element: `${url.substring(0, 40)} - lastmod: ${lastmod}`,
              fixHint: rule.fixHint,
              fingerprint: `SEO01163::${url.substring(0, 30)}::${lastmod}`,
            })
          }
        }
      }

      // SEO01160: URL references non-existent page
      // Extract pathname from URL regardless of domain
      let urlPath: string
      try {
        const urlObj = new URL(url)
        urlPath = urlObj.pathname.replace(/^\//, '').replace(/\/$/, '')
      }
      catch {
        // If URL parsing fails, try simple replace as fallback
        urlPath = url.replace(config.baseUrl, '').replace(/^\//, '').replace(/\/$/, '')
      }

      const possiblePaths = [
        path.join(config.distPath, urlPath, 'index.html'),
        path.join(config.distPath, `${urlPath}.html`),
      ]

      const exists = possiblePaths.some(p => fileExists(p))
      if (!exists && urlPath !== '') {
        const rule = getRule('SEO01160')
        if (rule) {
          issues.push({
            ruleId: 'SEO01160',
            ruleName: rule.name,
            category: rule.category,
            severity: rule.severity,
            file: sitemapPath,
            relativePath,
            element: url.substring(0, 80),
            fixHint: rule.fixHint,
            fingerprint: `SEO01160::${url.substring(0, 50)}`,
          })
        }
      }
    }
  }

  // SEO01164: Trailing slash inconsistency (only report if there's a mix)
  if (urlsWithTrailingSlash.size > 0 && urlsWithoutTrailingSlash.size > 0) {
    // Only report if the inconsistency is significant (more than 10% of URLs differ)
    const total = urlsWithTrailingSlash.size + urlsWithoutTrailingSlash.size
    const minority = Math.min(urlsWithTrailingSlash.size, urlsWithoutTrailingSlash.size)
    if (minority > total * 0.1) {
      const rule = getRule('SEO01164')
      if (rule) {
        issues.push({
          ruleId: 'SEO01164',
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          file: 'sitemap',
          relativePath: 'sitemap',
          actual: `${urlsWithTrailingSlash.size} with trailing slash, ${urlsWithoutTrailingSlash.size} without`,
          fixHint: rule.fixHint,
          fingerprint: 'SEO01164::sitemap',
        })
      }
    }
  }

  return issues
}

/**
 * Check for orphan pages (pages with no internal links pointing to them)
 * SEO01175
 */
export function checkOrphanPages(siteData: SiteData, config: SEOCheckerConfig): SEOIssue[] {
  const issues: SEOIssue[] = []

  // Build a set of all pages that are linked to from other pages
  const linkedPages = new Set<string>()

  // Go through all pages and collect their internal link targets
  for (const [, page] of siteData.pages) {
    for (const link of page.links) {
      // Only consider internal links
      if (!link.isInternal)
        continue

      // Resolve the link to a file path
      const resolvedPath = resolveToFilePath(link.href, page.relativePath, config.distPath)
      if (resolvedPath) {
        // Normalize the path to get the relative path from dist
        const relativePath = path.relative(config.distPath, resolvedPath)
        linkedPages.add(relativePath)
      }
    }
  }

  // Check each page to see if it's linked from any other page
  for (const [filePath, page] of siteData.pages) {
    // Skip the homepage - it's expected to not have incoming links
    const isHomePage = page.relativePath === 'index.html'
      || page.relativePath.match(/^[a-z]{2}(-[A-Z]{2})?\/index\.html$/i) !== null

    if (isHomePage)
      continue

    // Skip pages that are noindex (they're intentionally not linked)
    if (page.metaRobots?.toLowerCase().includes('noindex'))
      continue

    // Check if this page is linked from anywhere
    if (!linkedPages.has(page.relativePath)) {
      const rule = getRule('SEO01175')
      if (rule) {
        issues.push({
          ruleId: 'SEO01175',
          ruleName: rule.name,
          category: rule.category,
          severity: rule.severity,
          file: filePath,
          relativePath: page.relativePath,
          element: page.title || page.url,
          fixHint: rule.fixHint,
          fingerprint: `SEO01175::${page.relativePath}`,
        })
      }
    }
  }

  return issues
}

/**
 * Validate BCP47 language code
 */
function isValidBCP47(lang: string): boolean {
  if (VALID_LANG_CODES.has(lang))
    return true
  // Basic BCP47 pattern: 2-3 letter language, optional region
  const bcp47Pattern = /^[a-z]{2,3}(-[A-Z]{2})?$/i
  return bcp47Pattern.test(lang)
}

/**
 * Run all checks on a page
 */
export function runPageChecks(
  page: PageData,
  config: SEOCheckerConfig,
  siteData: SiteData,
): SEOIssue[] {
  const allIssues: SEOIssue[] = []

  allIssues.push(...checkMetadata(page, config))
  allIssues.push(...checkHtmlValidity(page, config))
  allIssues.push(...checkContentLength(page, config))
  allIssues.push(...checkContentFormat(page, config))
  allIssues.push(...checkHeadings(page, config))
  allIssues.push(...checkIndexability(page, config))
  allIssues.push(...checkLinks(page, config))
  allIssues.push(...checkBrokenAnchors(page, config))
  allIssues.push(...checkUrlHygiene(page, config))
  allIssues.push(...checkImages(page, config, siteData))
  allIssues.push(...checkImageDimensions(page, config))
  allIssues.push(...checkVideos(page, config))
  allIssues.push(...checkSocialTags(page, config))
  allIssues.push(...checkInternationalSEO(page, config))
  allIssues.push(...checkStructuredData(page, config))
  allIssues.push(...checkContentQuality(page, config))
  allIssues.push(...checkTemplateHygiene(page, config))
  allIssues.push(...checkAccessibility(page, config))
  allIssues.push(...checkHtmlSemantics(page, config))
  allIssues.push(...checkFavicon(page, config))
  allIssues.push(...checkEEAT(page, config))

  return allIssues
}
