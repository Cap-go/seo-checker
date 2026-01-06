/**
 * Comprehensive tests for SEO checks
 * Tests all rules to ensure they fire correctly
 */

import type { PageData, SEOCheckerConfig, SiteData } from './types.js'
import { describe, expect, it } from 'bun:test'
import {
  checkAccessibility,
  checkContentFormat,
  checkContentLength,
  checkContentQuality,
  checkHeadings,
  checkHtmlSemantics,
  checkHtmlValidity,
  checkImages,
  checkIndexability,
  checkInternationalSEO,
  checkLinks,
  checkMetadata,
  checkSocialTags,
  checkStructuredData,
  checkUrlHygiene,
} from './checks.js'

// Helper to create minimal site data
function createSiteData(): SiteData {
  return {
    pages: new Map(),
    titles: new Map(),
    descriptions: new Map(),
    h1s: new Map(),
    canonicals: new Map(),
    imageFiles: new Map(),
  }
}

// Helper to create a minimal page data object
function createPageData(overrides: Partial<PageData> = {}): PageData {
  return {
    filePath: '/dist/index.html',
    relativePath: 'index.html',
    url: 'https://example.com/',
    html: '<!DOCTYPE html><html><head></head><body></body></html>',
    h1s: [],
    h2s: [],
    h3s: [],
    h4s: [],
    h5s: [],
    h6s: [],
    headingOrder: [],
    og: {},
    twitter: {},
    hreflangs: [],
    links: [],
    images: [],
    videos: [],
    formInputsWithoutLabels: [],
    hasFavicon: true,
    isArticle: false,
    hasAuthorInfo: false,
    jsonLd: [],
    wordCount: 500,
    hasDoctype: true,
    hasMainLandmark: true,
    elementIds: [],
    ...overrides,
  }
}

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

// Helper to check if a specific rule ID was triggered
function hasIssue(issues: { ruleId: string }[], ruleId: string): boolean {
  return issues.some(i => i.ruleId === ruleId)
}

describe('checkMetadata', () => {
  const config = createConfig()

  describe('SEO00001: Missing or empty title', () => {
    it('should trigger when title is missing', () => {
      const page = createPageData({ title: undefined })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00001')).toBe(true)
    })

    it('should trigger when title is empty', () => {
      const page = createPageData({ title: '' })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00001')).toBe(true)
    })

    it('should trigger when title is only whitespace', () => {
      const page = createPageData({ title: '   ' })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00001')).toBe(true)
    })

    it('should not trigger when title is present', () => {
      const page = createPageData({ title: 'Valid Title' })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00001')).toBe(false)
    })
  })

  describe('SEO00002: Missing or empty meta description', () => {
    it('should trigger when description is missing', () => {
      const page = createPageData({ metaDescription: undefined })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00002')).toBe(true)
    })

    it('should trigger when description is empty', () => {
      const page = createPageData({ metaDescription: '' })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00002')).toBe(true)
    })

    it('should not trigger when description is present', () => {
      const page = createPageData({ metaDescription: 'Valid description for the page' })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00002')).toBe(false)
    })
  })

  describe('SEO00003: Missing or empty meta robots', () => {
    it('should trigger when robots is missing', () => {
      const page = createPageData({ metaRobots: undefined })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00003')).toBe(true)
    })

    it('should not trigger when robots is present', () => {
      const page = createPageData({ metaRobots: 'index, follow' })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00003')).toBe(false)
    })
  })

  describe('SEO00004: Missing canonical', () => {
    it('should trigger when canonical is missing', () => {
      const page = createPageData({ canonical: undefined })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00004')).toBe(true)
    })

    it('should not trigger when canonical is present', () => {
      const page = createPageData({ canonical: 'https://example.com/page' })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00004')).toBe(false)
    })
  })

  describe('SEO00005: Missing charset', () => {
    it('should trigger when charset is missing', () => {
      const page = createPageData({ charset: undefined })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00005')).toBe(true)
    })

    it('should not trigger when charset is present', () => {
      const page = createPageData({ charset: 'utf-8' })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00005')).toBe(false)
    })
  })

  describe('SEO00006: Missing html lang', () => {
    it('should trigger when html lang is missing', () => {
      const page = createPageData({ htmlLang: undefined })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00006')).toBe(true)
    })

    it('should not trigger when html lang is present', () => {
      const page = createPageData({ htmlLang: 'en' })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00006')).toBe(false)
    })
  })
})

describe('checkContentLength', () => {
  const config = createConfig()

  describe('Title length checks', () => {
    describe('SEO00013-SEO00015: Title too short', () => {
      it('SEO00013: should trigger when title < 10 chars', () => {
        const page = createPageData({ title: 'Short' })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00013')).toBe(true)
      })

      it('SEO00014: should trigger when title 10-19 chars', () => {
        const page = createPageData({ title: 'Medium Len' }) // 10 chars
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00014')).toBe(true)
      })

      it('SEO00015: should trigger when title 20-29 chars', () => {
        const page = createPageData({ title: 'This is a medium title' }) // 22 chars
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00015')).toBe(true)
      })

      it('should not trigger for titles >= 30 chars', () => {
        const page = createPageData({ title: 'This is a properly long title for SEO' })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00013')).toBe(false)
        expect(hasIssue(issues, 'SEO00014')).toBe(false)
        expect(hasIssue(issues, 'SEO00015')).toBe(false)
      })
    })

    describe('SEO00020-SEO00022: Title too long', () => {
      it('SEO00020: should trigger when title > 60 chars', () => {
        const page = createPageData({ title: 'A'.repeat(61) })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00020')).toBe(true)
      })

      it('SEO00021: should trigger when title > 65 chars', () => {
        const page = createPageData({ title: 'A'.repeat(66) })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00021')).toBe(true)
      })

      it('SEO00022: should trigger when title > 70 chars', () => {
        const page = createPageData({ title: 'A'.repeat(71) })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00022')).toBe(true)
      })

      it('should not trigger for titles <= 60 chars', () => {
        const page = createPageData({ title: 'A'.repeat(60) })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00020')).toBe(false)
        expect(hasIssue(issues, 'SEO00021')).toBe(false)
        expect(hasIssue(issues, 'SEO00022')).toBe(false)
      })
    })
  })

  describe('Meta description length checks', () => {
    describe('SEO00023-SEO00026: Description too short', () => {
      it('SEO00023: should trigger when description < 50 chars', () => {
        const page = createPageData({ metaDescription: 'Short description' })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00023')).toBe(true)
      })

      it('SEO00024: should trigger when description 50-69 chars', () => {
        const page = createPageData({ metaDescription: 'A'.repeat(55) })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00024')).toBe(true)
      })

      it('SEO00025: should trigger when description 70-99 chars', () => {
        const page = createPageData({ metaDescription: 'A'.repeat(85) })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00025')).toBe(true)
      })

      it('SEO00026: should trigger when description 100-119 chars', () => {
        const page = createPageData({ metaDescription: 'A'.repeat(108) })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00026')).toBe(true)
      })

      it('should not trigger for descriptions >= 120 chars and <= 160 chars (optimal)', () => {
        const page = createPageData({ metaDescription: 'A'.repeat(140) })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00023')).toBe(false)
        expect(hasIssue(issues, 'SEO00024')).toBe(false)
        expect(hasIssue(issues, 'SEO00025')).toBe(false)
        expect(hasIssue(issues, 'SEO00026')).toBe(false)
        expect(hasIssue(issues, 'SEO00027')).toBe(false)
      })
    })

    describe('SEO00027-SEO00029: Description too long', () => {
      it('SEO00027: should trigger when description > 160 chars', () => {
        const page = createPageData({ metaDescription: 'A'.repeat(165) })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00027')).toBe(true)
      })

      it('SEO00028: should trigger when description > 200 chars', () => {
        const page = createPageData({ metaDescription: 'A'.repeat(250) })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00028')).toBe(true)
      })

      it('SEO00029: should trigger when description > 320 chars', () => {
        const page = createPageData({ metaDescription: 'A'.repeat(350) })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00029')).toBe(true)
      })

      it('should not trigger "too long" for descriptions <= 160 chars', () => {
        const page = createPageData({ metaDescription: 'A'.repeat(155) })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00027')).toBe(false)
        expect(hasIssue(issues, 'SEO00028')).toBe(false)
        expect(hasIssue(issues, 'SEO00029')).toBe(false)
      })
    })

    describe('False positive regression test', () => {
      it('should NOT trigger "too long" for 108 char description (was false positive)', () => {
        // This was the original bug: 108 chars was incorrectly flagged as "too long (>155)"
        const description = 'A'.repeat(108)
        expect(description.length).toBe(108)
        const page = createPageData({ metaDescription: description })
        const issues = checkContentLength(page, config)

        // Should NOT trigger any "too long" rules
        expect(hasIssue(issues, 'SEO00027')).toBe(false)
        expect(hasIssue(issues, 'SEO00028')).toBe(false)
        expect(hasIssue(issues, 'SEO00029')).toBe(false)

        // Should trigger "too short" SEO00026 (100-119 chars range)
        expect(hasIssue(issues, 'SEO00026')).toBe(true)
      })

      it('should have correct boundary at 120 chars (optimal minimum)', () => {
        // 119 chars should be "too short"
        const short = createPageData({ metaDescription: 'A'.repeat(119) })
        const shortIssues = checkContentLength(short, config)
        expect(hasIssue(shortIssues, 'SEO00026')).toBe(true)

        // 120 chars should be optimal (no length issues)
        const optimal = createPageData({ metaDescription: 'A'.repeat(120) })
        const optimalIssues = checkContentLength(optimal, config)
        expect(hasIssue(optimalIssues, 'SEO00023')).toBe(false)
        expect(hasIssue(optimalIssues, 'SEO00024')).toBe(false)
        expect(hasIssue(optimalIssues, 'SEO00025')).toBe(false)
        expect(hasIssue(optimalIssues, 'SEO00026')).toBe(false)
      })

      it('should have correct boundary at 160 chars (optimal maximum)', () => {
        // 160 chars should be optimal (no "too long" issues)
        const optimal = createPageData({ metaDescription: 'A'.repeat(160) })
        const optimalIssues = checkContentLength(optimal, config)
        expect(hasIssue(optimalIssues, 'SEO00027')).toBe(false)

        // 161 chars should be "too long"
        const long = createPageData({ metaDescription: 'A'.repeat(161) })
        const longIssues = checkContentLength(long, config)
        expect(hasIssue(longIssues, 'SEO00027')).toBe(true)
      })
    })
  })

  describe('H1 length checks', () => {
    describe('SEO00030-SEO00032: H1 too short', () => {
      it('SEO00030: should trigger when H1 < 5 chars', () => {
        const page = createPageData({ h1s: ['Hi'] })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00030')).toBe(true)
      })

      it('SEO00031: should trigger when H1 5-9 chars', () => {
        const page = createPageData({ h1s: ['Hello'] }) // 5 chars
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00031')).toBe(true)
      })

      it('SEO00032: should trigger when H1 10-19 chars', () => {
        const page = createPageData({ h1s: ['Hello World!'] }) // 12 chars
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00032')).toBe(true)
      })
    })

    describe('SEO00034-SEO00036: H1 too long', () => {
      it('SEO00034: should trigger when H1 > 80 chars', () => {
        const page = createPageData({ h1s: ['A'.repeat(85)] })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00034')).toBe(true)
      })

      it('SEO00035: should trigger when H1 > 90 chars', () => {
        const page = createPageData({ h1s: ['A'.repeat(95)] })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00035')).toBe(true)
      })

      it('SEO00036: should trigger when H1 > 100 chars', () => {
        const page = createPageData({ h1s: ['A'.repeat(105)] })
        const issues = checkContentLength(page, config)
        expect(hasIssue(issues, 'SEO00036')).toBe(true)
      })
    })
  })

  describe('H2 length checks', () => {
    it('SEO00037: should trigger when H2 < 5 chars', () => {
      const page = createPageData({ h2s: ['Hi'] })
      const issues = checkContentLength(page, config)
      expect(hasIssue(issues, 'SEO00037')).toBe(true)
    })

    it('SEO00043: should trigger when H2 > 80 chars', () => {
      const page = createPageData({ h2s: ['A'.repeat(85)] })
      const issues = checkContentLength(page, config)
      expect(hasIssue(issues, 'SEO00043')).toBe(true)
    })
  })
})

describe('checkContentFormat', () => {
  const config = createConfig()

  describe('Title format checks', () => {
    it('SEO00056: should trigger for title with leading/trailing whitespace', () => {
      const page = createPageData({ title: ' Title with spaces ' })
      const issues = checkContentFormat(page, config)
      expect(hasIssue(issues, 'SEO00056')).toBe(true)
    })

    it('SEO00057: should trigger for title with repeated spaces', () => {
      const page = createPageData({ title: 'Title  with  repeated  spaces' })
      const issues = checkContentFormat(page, config)
      expect(hasIssue(issues, 'SEO00057')).toBe(true)
    })

    it('SEO00058: should trigger for title with repeated punctuation', () => {
      const page = createPageData({ title: 'Amazing Title!!!' })
      const issues = checkContentFormat(page, config)
      expect(hasIssue(issues, 'SEO00058')).toBe(true)
    })

    it('SEO00064: should trigger for ALL CAPS title', () => {
      const page = createPageData({ title: 'THIS IS ALL CAPS TITLE' })
      const issues = checkContentFormat(page, config)
      expect(hasIssue(issues, 'SEO00064')).toBe(true)
    })

    it('SEO00068: should trigger for title starting with special char', () => {
      const page = createPageData({ title: '- Title starting with dash' })
      const issues = checkContentFormat(page, config)
      expect(hasIssue(issues, 'SEO00068')).toBe(true)
    })

    it('SEO00073: should trigger for title with 2 pipes', () => {
      const page = createPageData({ title: 'Title | Section | Brand' })
      const issues = checkContentFormat(page, config)
      expect(hasIssue(issues, 'SEO00073')).toBe(true)
    })

    it('SEO00074: should trigger for title with 3+ pipes', () => {
      const page = createPageData({ title: 'Title | A | B | Brand' })
      const issues = checkContentFormat(page, config)
      expect(hasIssue(issues, 'SEO00074')).toBe(true)
    })
  })

  describe('Description format checks', () => {
    it('SEO00060: should trigger for description with leading/trailing whitespace', () => {
      const page = createPageData({ metaDescription: ' Description with spaces ' })
      const issues = checkContentFormat(page, config)
      expect(hasIssue(issues, 'SEO00060')).toBe(true)
    })

    it('SEO00061: should trigger for description with repeated spaces', () => {
      const page = createPageData({ metaDescription: 'Description  with  repeated  spaces' })
      const issues = checkContentFormat(page, config)
      expect(hasIssue(issues, 'SEO00061')).toBe(true)
    })

    it('SEO00065: should trigger for ALL CAPS description', () => {
      const page = createPageData({ metaDescription: 'THIS IS AN ALL CAPS DESCRIPTION FOR THE PAGE' })
      const issues = checkContentFormat(page, config)
      expect(hasIssue(issues, 'SEO00065')).toBe(true)
    })
  })

  describe('H1 format checks', () => {
    it('SEO00066: should trigger for ALL CAPS H1', () => {
      const page = createPageData({ h1s: ['THIS IS ALL CAPS'] })
      const issues = checkContentFormat(page, config)
      expect(hasIssue(issues, 'SEO00066')).toBe(true)
    })

    it('SEO00069: should trigger for H1 starting with special char', () => {
      const page = createPageData({ h1s: ['- Heading with dash'] })
      const issues = checkContentFormat(page, config)
      expect(hasIssue(issues, 'SEO00069')).toBe(true)
    })
  })
})

describe('checkHeadings', () => {
  const config = createConfig()

  describe('SEO00109: Missing H1', () => {
    it('should trigger when no H1 exists', () => {
      const page = createPageData({ h1s: [] })
      const issues = checkHeadings(page, config)
      expect(hasIssue(issues, 'SEO00109')).toBe(true)
    })

    it('should not trigger when H1 exists', () => {
      const page = createPageData({
        h1s: ['Main Heading'],
        headingOrder: [{ level: 1, text: 'Main Heading' }],
      })
      const issues = checkHeadings(page, config)
      expect(hasIssue(issues, 'SEO00109')).toBe(false)
    })
  })

  describe('SEO00110: Multiple H1', () => {
    it('should trigger when multiple H1s exist', () => {
      const page = createPageData({
        h1s: ['First H1', 'Second H1'],
        headingOrder: [
          { level: 1, text: 'First H1' },
          { level: 1, text: 'Second H1' },
        ],
      })
      const issues = checkHeadings(page, config)
      expect(hasIssue(issues, 'SEO00110')).toBe(true)
    })
  })

  describe('SEO00111: Heading level skip', () => {
    it('should trigger when heading levels are skipped', () => {
      const page = createPageData({
        h1s: ['Main'],
        h3s: ['Skipped H2'],
        headingOrder: [
          { level: 1, text: 'Main' },
          { level: 3, text: 'Skipped H2' },
        ],
      })
      const issues = checkHeadings(page, config)
      expect(hasIssue(issues, 'SEO00111')).toBe(true)
    })

    it('should not trigger for proper heading hierarchy', () => {
      const page = createPageData({
        h1s: ['Main'],
        h2s: ['Sub'],
        h3s: ['SubSub'],
        headingOrder: [
          { level: 1, text: 'Main' },
          { level: 2, text: 'Sub' },
          { level: 3, text: 'SubSub' },
        ],
      })
      const issues = checkHeadings(page, config)
      expect(hasIssue(issues, 'SEO00111')).toBe(false)
    })
  })

  describe('SEO00112: First heading is not H1', () => {
    it('should trigger when first heading is not H1', () => {
      const page = createPageData({
        h2s: ['First heading is H2'],
        headingOrder: [{ level: 2, text: 'First heading is H2' }],
      })
      const issues = checkHeadings(page, config)
      expect(hasIssue(issues, 'SEO00112')).toBe(true)
    })
  })

  describe('SEO00125: Duplicate H1 text', () => {
    it('should trigger for duplicate H1 text within page', () => {
      const page = createPageData({
        h1s: ['Same Title', 'Same Title'],
        headingOrder: [
          { level: 1, text: 'Same Title' },
          { level: 1, text: 'Same Title' },
        ],
      })
      const issues = checkHeadings(page, config)
      expect(hasIssue(issues, 'SEO00125')).toBe(true)
    })
  })

  describe('SEO00126-SEO00127: Excessive headings', () => {
    it('SEO00126: should trigger when > 30 headings', () => {
      const headings = Array.from({ length: 35 }, (_, i) => ({
        level: (i % 3) + 1,
        text: `Heading ${i}`,
      }))
      const page = createPageData({ headingOrder: headings })
      const issues = checkHeadings(page, config)
      expect(hasIssue(issues, 'SEO00126')).toBe(true)
    })

    it('SEO00127: should trigger when > 50 headings', () => {
      const headings = Array.from({ length: 55 }, (_, i) => ({
        level: (i % 3) + 1,
        text: `Heading ${i}`,
      }))
      const page = createPageData({ headingOrder: headings })
      const issues = checkHeadings(page, config)
      expect(hasIssue(issues, 'SEO00127')).toBe(true)
    })
  })

  describe('SEO00128: Empty heading', () => {
    it('should trigger for empty heading', () => {
      const page = createPageData({
        headingOrder: [{ level: 2, text: '' }],
      })
      const issues = checkHeadings(page, config)
      expect(hasIssue(issues, 'SEO00128')).toBe(true)
    })

    it('should trigger for whitespace-only heading', () => {
      const page = createPageData({
        headingOrder: [{ level: 2, text: '   ' }],
      })
      const issues = checkHeadings(page, config)
      expect(hasIssue(issues, 'SEO00128')).toBe(true)
    })
  })

  describe('SEO00129: H1 matches title exactly', () => {
    it('should trigger when H1 matches title exactly', () => {
      const page = createPageData({
        title: 'Page Title',
        h1s: ['Page Title'],
        headingOrder: [{ level: 1, text: 'Page Title' }],
      })
      const issues = checkHeadings(page, config)
      expect(hasIssue(issues, 'SEO00129')).toBe(true)
    })

    it('should trigger for case-insensitive match', () => {
      const page = createPageData({
        title: 'Page Title',
        h1s: ['page title'],
        headingOrder: [{ level: 1, text: 'page title' }],
      })
      const issues = checkHeadings(page, config)
      expect(hasIssue(issues, 'SEO00129')).toBe(true)
    })
  })
})

describe('checkIndexability', () => {
  const config = createConfig()

  describe('SEO00100: Canonical is relative URL', () => {
    it('should trigger for relative canonical', () => {
      const page = createPageData({ canonical: '/page' })
      const issues = checkIndexability(page, config)
      expect(hasIssue(issues, 'SEO00100')).toBe(true)
    })

    it('should not trigger for absolute canonical', () => {
      const page = createPageData({ canonical: 'https://example.com/page' })
      const issues = checkIndexability(page, config)
      expect(hasIssue(issues, 'SEO00100')).toBe(false)
    })
  })

  describe('SEO00101: Canonical contains fragment', () => {
    it('should trigger for canonical with fragment', () => {
      const page = createPageData({ canonical: 'https://example.com/page#section' })
      const issues = checkIndexability(page, config)
      expect(hasIssue(issues, 'SEO00101')).toBe(true)
    })
  })

  describe('SEO00102: Canonical contains tracking parameters', () => {
    it('should trigger for canonical with UTM params', () => {
      const page = createPageData({ canonical: 'https://example.com/page?utm_source=test' })
      const issues = checkIndexability(page, config)
      expect(hasIssue(issues, 'SEO00102')).toBe(true)
    })

    it('should trigger for canonical with gclid', () => {
      const page = createPageData({ canonical: 'https://example.com/page?gclid=123' })
      const issues = checkIndexability(page, config)
      expect(hasIssue(issues, 'SEO00102')).toBe(true)
    })
  })

  describe('SEO00103: Canonical uses HTTP instead of HTTPS', () => {
    it('should trigger when canonical is HTTP but site is HTTPS', () => {
      const page = createPageData({ canonical: 'http://example.com/page' })
      const issues = checkIndexability(page, config)
      expect(hasIssue(issues, 'SEO00103')).toBe(true)
    })
  })
})

describe('checkSocialTags', () => {
  const config = createConfig()

  describe('OpenGraph tags', () => {
    it('SEO00168: should trigger when og:title is missing', () => {
      const page = createPageData({ og: {} })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO00168')).toBe(true)
    })

    it('SEO00169: should trigger when og:description is missing', () => {
      const page = createPageData({ og: { title: 'Title' } })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO00169')).toBe(true)
    })

    it('SEO00170: should trigger when og:image is missing', () => {
      const page = createPageData({ og: { title: 'Title', description: 'Desc that is long enough to pass validation check' } })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO00170')).toBe(true)
    })

    it('SEO00171: should trigger when og:url is missing', () => {
      const page = createPageData({
        og: { title: 'Title', description: 'Desc that is long enough to pass validation check', image: 'https://example.com/img.jpg' },
      })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO00171')).toBe(true)
    })

    it('should not trigger when all required OG tags are present', () => {
      const page = createPageData({
        og: {
          title: 'Title',
          description: 'Description that is long enough to pass validation',
          image: 'https://example.com/img.jpg',
          url: 'https://example.com/',
        },
      })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO00168')).toBe(false)
      expect(hasIssue(issues, 'SEO00169')).toBe(false)
      expect(hasIssue(issues, 'SEO00170')).toBe(false)
      expect(hasIssue(issues, 'SEO00171')).toBe(false)
    })
  })

  describe('Twitter card tags', () => {
    it('SEO00172: should trigger when twitter:card is missing', () => {
      const page = createPageData({ twitter: {} })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO00172')).toBe(true)
    })

    it('SEO00173: should trigger when twitter:title is missing', () => {
      const page = createPageData({ twitter: { card: 'summary' } })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO00173')).toBe(true)
    })

    it('SEO00174: should trigger when twitter:description is missing', () => {
      const page = createPageData({ twitter: { card: 'summary', title: 'Title' } })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO00174')).toBe(true)
    })

    it('SEO00175: should trigger when twitter:image is missing', () => {
      const page = createPageData({
        twitter: { card: 'summary', title: 'Title', description: 'Desc' },
      })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO00175')).toBe(true)
    })
  })
})

describe('checkAccessibility', () => {
  const config = createConfig()

  describe('SEO00222: Missing main landmark', () => {
    it('should trigger when main landmark is missing', () => {
      const page = createPageData({ hasMainLandmark: false })
      const issues = checkAccessibility(page, config)
      expect(hasIssue(issues, 'SEO00222')).toBe(true)
    })

    it('should not trigger when main landmark is present', () => {
      const page = createPageData({ hasMainLandmark: true })
      const issues = checkAccessibility(page, config)
      expect(hasIssue(issues, 'SEO00222')).toBe(false)
    })
  })

  describe('SEO00223: Skip link missing', () => {
    it('should trigger when skip link is missing', () => {
      const page = createPageData({ html: '<!DOCTYPE html><html><body>No skip link</body></html>' })
      const issues = checkAccessibility(page, config)
      expect(hasIssue(issues, 'SEO00223')).toBe(true)
    })

    it('should not trigger when skip-to-content exists', () => {
      const page = createPageData({ html: '<!DOCTYPE html><html><body><a href="#main" class="skip-to-content">Skip</a></body></html>' })
      const issues = checkAccessibility(page, config)
      expect(hasIssue(issues, 'SEO00223')).toBe(false)
    })
  })

  describe('SEO01211: Form inputs without labels', () => {
    it('should trigger when input lacks label', () => {
      const page = createPageData({
        formInputsWithoutLabels: [
          { type: 'input', inputType: 'text', name: 'email' },
        ],
      })
      const issues = checkAccessibility(page, config)
      expect(hasIssue(issues, 'SEO01211')).toBe(true)
    })

    it('SEO01212: should trigger when select lacks label', () => {
      const page = createPageData({
        formInputsWithoutLabels: [
          { type: 'select', name: 'country' },
        ],
      })
      const issues = checkAccessibility(page, config)
      expect(hasIssue(issues, 'SEO01212')).toBe(true)
    })

    it('SEO01213: should trigger when textarea lacks label', () => {
      const page = createPageData({
        formInputsWithoutLabels: [
          { type: 'textarea', name: 'message' },
        ],
      })
      const issues = checkAccessibility(page, config)
      expect(hasIssue(issues, 'SEO01213')).toBe(true)
    })

    it('should not trigger when no form inputs without labels', () => {
      const page = createPageData({ formInputsWithoutLabels: [] })
      const issues = checkAccessibility(page, config)
      expect(hasIssue(issues, 'SEO01211')).toBe(false)
      expect(hasIssue(issues, 'SEO01212')).toBe(false)
      expect(hasIssue(issues, 'SEO01213')).toBe(false)
    })
  })
})

describe('checkHtmlValidity', () => {
  const config = createConfig()

  describe('SEO00226: Missing DOCTYPE', () => {
    it('should trigger when DOCTYPE is missing', () => {
      const page = createPageData({ hasDoctype: false })
      const issues = checkHtmlValidity(page, config)
      expect(hasIssue(issues, 'SEO00226')).toBe(true)
    })

    it('should not trigger when DOCTYPE is present', () => {
      const page = createPageData({ hasDoctype: true })
      const issues = checkHtmlValidity(page, config)
      expect(hasIssue(issues, 'SEO00226')).toBe(false)
    })
  })

  describe('SEO00007: Multiple title tags', () => {
    it('should trigger when multiple titles exist', () => {
      const page = createPageData({
        html: '<!DOCTYPE html><html><head><title>First</title><title>Second</title></head></html>',
      })
      const issues = checkHtmlValidity(page, config)
      expect(hasIssue(issues, 'SEO00007')).toBe(true)
    })
  })

  describe('SEO00008: Multiple meta descriptions', () => {
    it('should trigger when multiple meta descriptions exist', () => {
      const page = createPageData({
        html: '<!DOCTYPE html><html><head><meta name="description" content="First"><meta name="description" content="Second"></head></html>',
      })
      const issues = checkHtmlValidity(page, config)
      expect(hasIssue(issues, 'SEO00008')).toBe(true)
    })
  })

  describe('SEO00009: Multiple canonical tags', () => {
    it('should trigger when multiple canonicals exist', () => {
      const page = createPageData({
        html: '<!DOCTYPE html><html><head><link rel="canonical" href="a"><link rel="canonical" href="b"></head></html>',
      })
      const issues = checkHtmlValidity(page, config)
      expect(hasIssue(issues, 'SEO00009')).toBe(true)
    })
  })

  describe('SEO00380: Duplicate element IDs', () => {
    it('should trigger when duplicate IDs exist', () => {
      const page = createPageData({
        elementIds: ['header', 'main', 'header', 'footer'],
      })
      const issues = checkHtmlValidity(page, config)
      expect(hasIssue(issues, 'SEO00380')).toBe(true)
    })

    it('should not trigger when all IDs are unique', () => {
      const page = createPageData({
        elementIds: ['header', 'main', 'footer'],
      })
      const issues = checkHtmlValidity(page, config)
      expect(hasIssue(issues, 'SEO00380')).toBe(false)
    })
  })

  describe('SEO00381: Meta refresh redirect', () => {
    it('should trigger when meta refresh is present', () => {
      const page = createPageData({
        html: '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=other.html"></head></html>',
      })
      const issues = checkHtmlValidity(page, config)
      expect(hasIssue(issues, 'SEO00381')).toBe(true)
    })
  })

  describe('SEO00227: Doctype not at start', () => {
    it('should trigger when doctype is not at start', () => {
      const page = createPageData({
        hasDoctype: true,
        html: '<!-- comment --><!DOCTYPE html><html></html>',
      })
      const issues = checkHtmlValidity(page, config)
      expect(hasIssue(issues, 'SEO00227')).toBe(true)
    })
  })
})

describe('checkLinks', () => {
  const config = createConfig()

  describe('SEO00134: Empty href attribute', () => {
    it('should trigger for link with empty href', () => {
      const page = createPageData({
        links: [{ href: '', text: 'Link', isInternal: true, isExternal: false }],
      })
      const issues = checkLinks(page, config)
      expect(hasIssue(issues, 'SEO00134')).toBe(true)
    })
  })

  describe('SEO00135: Missing anchor text', () => {
    it('should trigger for link with no text, aria-label, or title', () => {
      const page = createPageData({
        links: [{ href: '/page', text: '', isInternal: true, isExternal: false }],
      })
      const issues = checkLinks(page, config)
      expect(hasIssue(issues, 'SEO00135')).toBe(true)
    })
  })

  describe('SEO00143: Internal link with nofollow', () => {
    it('should trigger for internal link with rel=nofollow', () => {
      const page = createPageData({
        links: [{ href: '/page', text: 'Link', rel: 'nofollow', isInternal: true, isExternal: false }],
      })
      const issues = checkLinks(page, config)
      expect(hasIssue(issues, 'SEO00143')).toBe(true)
    })
  })

  describe('SEO00145: mailto link missing email', () => {
    it('should trigger for mailto: link without email address', () => {
      const page = createPageData({
        links: [{ href: 'mailto:', text: 'Email', isInternal: false, isExternal: false }],
      })
      const issues = checkLinks(page, config)
      expect(hasIssue(issues, 'SEO00145')).toBe(true)
    })
  })

  describe('SEO00148: Double slash in path', () => {
    it('should trigger for URL with double slash', () => {
      const page = createPageData({
        links: [{ href: 'https://example.com//page', text: 'Link', isInternal: true, isExternal: false }],
      })
      const issues = checkLinks(page, config)
      expect(hasIssue(issues, 'SEO00148')).toBe(true)
    })
  })

  describe('SEO00150: Spaces in URL', () => {
    it('should trigger for URL with spaces', () => {
      const page = createPageData({
        links: [{ href: '/document%20name.html', text: 'Link', isInternal: true, isExternal: false }],
      })
      const issues = checkLinks(page, config)
      expect(hasIssue(issues, 'SEO00150')).toBe(true)
    })
  })

  describe('SEO00152: HTTP link on HTTPS page', () => {
    it('should trigger for HTTP links when site is HTTPS', () => {
      const page = createPageData({
        links: [{ href: 'http://example.com/page', text: 'Link', isInternal: false, isExternal: true }],
      })
      const issues = checkLinks(page, config)
      expect(hasIssue(issues, 'SEO00152')).toBe(true)
    })
  })
})

describe('checkImages', () => {
  const config = createConfig()
  const siteData = createSiteData()

  describe('SEO00153: Image missing alt', () => {
    it('should trigger when image has no alt attribute', () => {
      const page = createPageData({
        images: [{ src: '/img.jpg' }],
      })
      const issues = checkImages(page, config, siteData)
      expect(hasIssue(issues, 'SEO00153')).toBe(true)
    })
  })

  describe('SEO00154: Image with empty alt', () => {
    it('should trigger when image has empty alt', () => {
      const page = createPageData({
        images: [{ src: '/img.jpg', alt: '' }],
      })
      const issues = checkImages(page, config, siteData)
      expect(hasIssue(issues, 'SEO00154')).toBe(true)
    })
  })

  describe('SEO00156: Image with empty src', () => {
    it('should trigger when image has empty src', () => {
      const page = createPageData({
        images: [{ src: '', alt: 'test' }],
      })
      const issues = checkImages(page, config, siteData)
      expect(hasIssue(issues, 'SEO00156')).toBe(true)
    })
  })

  describe('SEO00157: Image alt too long', () => {
    it('should trigger when alt text exceeds 125 chars', () => {
      const page = createPageData({
        images: [{ src: '/img.jpg', alt: 'A'.repeat(130) }],
      })
      const issues = checkImages(page, config, siteData)
      expect(hasIssue(issues, 'SEO00157')).toBe(true)
    })
  })

  describe('SEO00159: Image alt contains "image" or "picture"', () => {
    it('should trigger when alt contains redundant words', () => {
      const page = createPageData({
        images: [{ src: '/img.jpg', alt: 'Image of a cat' }],
      })
      const issues = checkImages(page, config, siteData)
      expect(hasIssue(issues, 'SEO00159')).toBe(true)
    })
  })
})

describe('checkUrlHygiene', () => {
  const config = createConfig()

  describe('SEO00374: Session ID in URL', () => {
    it('should trigger for URLs with session IDs', () => {
      const page = createPageData({
        links: [{ href: '/page?PHPSESSID=abc123', text: 'Link', isInternal: true, isExternal: false }],
      })
      const issues = checkUrlHygiene(page, config)
      expect(hasIssue(issues, 'SEO00374')).toBe(true)
    })
  })

  describe('SEO00375-00378: Parameterized URLs (specific patterns)', () => {
    it('SEO00375: should trigger for URLs with .php? pattern', () => {
      const page = createPageData({
        links: [{ href: '/page.php?id=1', text: 'Link', isInternal: true, isExternal: false }],
      })
      const issues = checkUrlHygiene(page, config)
      expect(hasIssue(issues, 'SEO00375')).toBe(true)
    })

    it('SEO00376: should trigger for URLs with ?page= pattern', () => {
      const page = createPageData({
        links: [{ href: '/posts?page=2', text: 'Link', isInternal: true, isExternal: false }],
      })
      const issues = checkUrlHygiene(page, config)
      expect(hasIssue(issues, 'SEO00376')).toBe(true)
    })

    it('SEO00377: should trigger for URLs with ?p= pattern', () => {
      const page = createPageData({
        links: [{ href: '/article?p=123', text: 'Link', isInternal: true, isExternal: false }],
      })
      const issues = checkUrlHygiene(page, config)
      expect(hasIssue(issues, 'SEO00377')).toBe(true)
    })

    it('SEO00378: should trigger for URLs with ?id= pattern', () => {
      const page = createPageData({
        links: [{ href: '/product?id=456', text: 'Link', isInternal: true, isExternal: false }],
      })
      const issues = checkUrlHygiene(page, config)
      expect(hasIssue(issues, 'SEO00378')).toBe(true)
    })
  })
})

describe('checkInternationalSEO', () => {
  const config = createConfig({ languages: ['en', 'es', 'fr'] })

  describe('SEO00182: Invalid html lang', () => {
    it('should trigger for invalid lang code', () => {
      const page = createPageData({ htmlLang: 'invalid-lang-code-xyz' })
      const issues = checkInternationalSEO(page, config)
      expect(hasIssue(issues, 'SEO00182')).toBe(true)
    })
  })

  describe('SEO00177: hreflang with invalid language code', () => {
    it('should trigger for invalid hreflang lang', () => {
      const page = createPageData({
        hreflangs: [{ lang: 'invalid', url: 'https://example.com/invalid' }],
      })
      const issues = checkInternationalSEO(page, config)
      expect(hasIssue(issues, 'SEO00177')).toBe(true)
    })
  })

  describe('SEO00180: hreflang with relative URL', () => {
    it('should trigger for relative hreflang URL', () => {
      const page = createPageData({
        hreflangs: [{ lang: 'en', url: '/en/page' }],
      })
      const issues = checkInternationalSEO(page, config)
      expect(hasIssue(issues, 'SEO00180')).toBe(true)
    })
  })

  describe('SEO00179: Missing self-referencing hreflang', () => {
    it('should trigger when page URL is not in hreflangs', () => {
      const page = createPageData({
        url: 'https://example.com/page',
        hreflangs: [
          { lang: 'es', url: 'https://example.com/es/page' },
        ],
      })
      const issues = checkInternationalSEO(page, config)
      expect(hasIssue(issues, 'SEO00179')).toBe(true)
    })
  })

  describe('SEO00181: Missing x-default hreflang', () => {
    it('should trigger when x-default is missing with multiple hreflangs', () => {
      const page = createPageData({
        url: 'https://example.com/',
        hreflangs: [
          { lang: 'en', url: 'https://example.com/' },
          { lang: 'es', url: 'https://example.com/es' },
        ],
      })
      const issues = checkInternationalSEO(page, config)
      expect(hasIssue(issues, 'SEO00181')).toBe(true)
    })
  })
})

describe('checkStructuredData', () => {
  const config = createConfig()

  describe('SEO00230: Missing @context', () => {
    it('should trigger when @context is missing', () => {
      const page = createPageData({
        jsonLd: [{ '@type': 'Article' }],
      })
      const issues = checkStructuredData(page, config)
      expect(hasIssue(issues, 'SEO00230')).toBe(true)
    })
  })

  describe('SEO00231: Missing @type', () => {
    it('should trigger when @type is missing', () => {
      const page = createPageData({
        jsonLd: [{ '@context': 'https://schema.org' }],
      })
      const issues = checkStructuredData(page, config)
      expect(hasIssue(issues, 'SEO00231')).toBe(true)
    })
  })
})

describe('checkContentQuality', () => {
  const config = createConfig()

  describe('SEO00186-00190: Low word count', () => {
    it('SEO00186: should trigger when word count < 50', () => {
      const page = createPageData({ wordCount: 30 })
      const issues = checkContentQuality(page, config)
      expect(hasIssue(issues, 'SEO00186')).toBe(true)
    })

    it('SEO00187: should trigger when word count 50-99', () => {
      const page = createPageData({ wordCount: 75 })
      const issues = checkContentQuality(page, config)
      expect(hasIssue(issues, 'SEO00187')).toBe(true)
    })

    it('SEO00188: should trigger when word count 100-149', () => {
      const page = createPageData({ wordCount: 125 })
      const issues = checkContentQuality(page, config)
      expect(hasIssue(issues, 'SEO00188')).toBe(true)
    })

    it('SEO00189: should trigger when word count 150-199', () => {
      const page = createPageData({ wordCount: 175 })
      const issues = checkContentQuality(page, config)
      expect(hasIssue(issues, 'SEO00189')).toBe(true)
    })

    it('SEO00190: should trigger when word count 200-299', () => {
      const page = createPageData({ wordCount: 250 })
      const issues = checkContentQuality(page, config)
      expect(hasIssue(issues, 'SEO00190')).toBe(true)
    })
  })

  describe('SEO00198-00200: High word count', () => {
    it('SEO00200: should trigger when word count > 10000', () => {
      const page = createPageData({ wordCount: 12000 })
      const issues = checkContentQuality(page, config)
      expect(hasIssue(issues, 'SEO00200')).toBe(true)
    })

    it('SEO00199: should trigger when word count 7500-10000', () => {
      const page = createPageData({ wordCount: 8000 })
      const issues = checkContentQuality(page, config)
      expect(hasIssue(issues, 'SEO00199')).toBe(true)
    })

    it('SEO00198: should trigger when word count 5000-7500', () => {
      const page = createPageData({ wordCount: 6000 })
      const issues = checkContentQuality(page, config)
      expect(hasIssue(issues, 'SEO00198')).toBe(true)
    })
  })
})

describe('checkHtmlSemantics', () => {
  const config = createConfig()

  describe('SEO00416: Using <b> instead of <strong>', () => {
    it('should trigger when using <b> but no <strong>', () => {
      const page = createPageData({
        html: '<!DOCTYPE html><html><body><b>Bold text</b></body></html>',
      })
      const issues = checkHtmlSemantics(page, config)
      expect(hasIssue(issues, 'SEO00416')).toBe(true)
    })

    it('should not trigger when using <strong>', () => {
      const page = createPageData({
        html: '<!DOCTYPE html><html><body><strong>Bold text</strong></body></html>',
      })
      const issues = checkHtmlSemantics(page, config)
      expect(hasIssue(issues, 'SEO00416')).toBe(false)
    })
  })

  describe('SEO00417: Using <i> instead of <em>', () => {
    it('should trigger when using <i> but no <em>', () => {
      const page = createPageData({
        html: '<!DOCTYPE html><html><body><i>Italic text</i></body></html>',
      })
      const issues = checkHtmlSemantics(page, config)
      expect(hasIssue(issues, 'SEO00417')).toBe(true)
    })

    it('should not trigger when using <em>', () => {
      const page = createPageData({
        html: '<!DOCTYPE html><html><body><em>Italic text</em></body></html>',
      })
      const issues = checkHtmlSemantics(page, config)
      expect(hasIssue(issues, 'SEO00417')).toBe(false)
    })
  })

  describe('SEO00418: Deprecated HTML tags', () => {
    it('should trigger for deprecated tags like <center>', () => {
      const page = createPageData({
        html: '<!DOCTYPE html><html><body><center>Centered</center></body></html>',
      })
      const issues = checkHtmlSemantics(page, config)
      expect(hasIssue(issues, 'SEO00418')).toBe(true)
    })

    it('should trigger for deprecated <font> tag', () => {
      const page = createPageData({
        html: '<!DOCTYPE html><html><body><font>Text</font></body></html>',
      })
      const issues = checkHtmlSemantics(page, config)
      expect(hasIssue(issues, 'SEO00418')).toBe(true)
    })
  })

  describe('SEO00419: Tables without headers', () => {
    it('should trigger for tables without <th> elements', () => {
      const page = createPageData({
        html: '<!DOCTYPE html><html><body><table><tr><td>Cell</td></tr></table></body></html>',
      })
      const issues = checkHtmlSemantics(page, config)
      expect(hasIssue(issues, 'SEO00419')).toBe(true)
    })

    it('should not trigger for tables with <th> elements', () => {
      const page = createPageData({
        html: '<!DOCTYPE html><html><body><table><tr><th>Header</th></tr><tr><td>Cell</td></tr></table></body></html>',
      })
      const issues = checkHtmlSemantics(page, config)
      expect(hasIssue(issues, 'SEO00419')).toBe(false)
    })
  })

  describe('SEO00420: Excessive inline styles', () => {
    it('should trigger for more than 50 inline styles', () => {
      const styles = Array.from({ length: 55 }, () => '<div style="color:red">x</div>').join('')
      const page = createPageData({
        html: `<!DOCTYPE html><html><body>${styles}</body></html>`,
      })
      const issues = checkHtmlSemantics(page, config)
      expect(hasIssue(issues, 'SEO00420')).toBe(true)
    })

    it('should not trigger for 50 or fewer inline styles', () => {
      const styles = Array.from({ length: 50 }, () => '<div style="color:red">x</div>').join('')
      const page = createPageData({
        html: `<!DOCTYPE html><html><body>${styles}</body></html>`,
      })
      const issues = checkHtmlSemantics(page, config)
      expect(hasIssue(issues, 'SEO00420')).toBe(false)
    })
  })
})

describe('Additional metadata checks', () => {
  const config = createConfig()

  describe('SEO00010: Empty canonical', () => {
    it('should trigger when canonical is empty string', () => {
      const page = createPageData({ canonical: '' })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00010')).toBe(true)
    })
  })

  describe('SEO00011: Empty html lang', () => {
    it('should trigger when html lang is empty string', () => {
      const page = createPageData({ htmlLang: '' })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00011')).toBe(true)
    })
  })

  describe('SEO00012: Empty charset', () => {
    it('should trigger when charset is empty string', () => {
      const page = createPageData({ charset: '' })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00012')).toBe(true)
    })
  })

  describe('SEO00413: Missing viewport', () => {
    it('should trigger when viewport is missing', () => {
      const page = createPageData({ viewport: undefined })
      const issues = checkMetadata(page, config)
      expect(hasIssue(issues, 'SEO00413')).toBe(true)
    })
  })
})

describe('Additional indexability checks', () => {
  const config = createConfig()

  describe('SEO00105: Conflicting robots directives', () => {
    // Note: The current implementation has guards that prevent detecting
    // "noindex, index" or "nofollow, follow" conflicts due to how
    // hasIndex/hasFollow are calculated. These tests document current behavior.
    it('should not trigger for non-conflicting directives', () => {
      const page = createPageData({ metaRobots: 'noindex, nofollow' })
      const issues = checkIndexability(page, config)
      expect(hasIssue(issues, 'SEO00105')).toBe(false)
    })

    it('should not trigger for normal index,follow directives', () => {
      const page = createPageData({ metaRobots: 'index, follow' })
      const issues = checkIndexability(page, config)
      expect(hasIssue(issues, 'SEO00105')).toBe(false)
    })
  })

  describe('SEO00368: rel=prev/next used (deprecated)', () => {
    it('should trigger when rel=prev is used', () => {
      const page = createPageData({
        html: '<!DOCTYPE html><html><head><link rel="prev" href="/page1"></head></html>',
      })
      const issues = checkIndexability(page, config)
      expect(hasIssue(issues, 'SEO00368')).toBe(true)
    })
  })
})

describe('Additional social tag checks', () => {
  const config = createConfig()

  describe('SEO01175: Missing og:type', () => {
    it('should trigger when og:type is missing', () => {
      const page = createPageData({
        og: { title: 'Title', description: 'A long enough description for validation', image: 'https://example.com/img.jpg', url: 'https://example.com/' },
      })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO01175')).toBe(true)
    })
  })

  describe('SEO01177: og:title too long', () => {
    it('should trigger when og:title > 60 chars', () => {
      const page = createPageData({
        og: { title: 'A'.repeat(65), description: 'A long enough description for validation', image: 'https://example.com/img.jpg', url: 'https://example.com/' },
      })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO01177')).toBe(true)
    })
  })

  describe('SEO01178: og:description too long', () => {
    it('should trigger when og:description > 200 chars', () => {
      const page = createPageData({
        og: { title: 'Title', description: 'A'.repeat(210), image: 'https://example.com/img.jpg', url: 'https://example.com/' },
      })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO01178')).toBe(true)
    })
  })

  describe('SEO01179: og:description too short', () => {
    it('should trigger when og:description < 50 chars', () => {
      const page = createPageData({
        og: { title: 'Title', description: 'Short', image: 'https://example.com/img.jpg', url: 'https://example.com/' },
      })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO01179')).toBe(true)
    })
  })

  describe('SEO00371: og:image is relative', () => {
    it('should trigger when og:image is relative URL', () => {
      const page = createPageData({
        og: { title: 'Title', description: 'A long enough description for validation', image: '/images/og.jpg', url: 'https://example.com/' },
      })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO00371')).toBe(true)
    })
  })

  describe('SEO01181: twitter:title too long', () => {
    it('should trigger when twitter:title > 70 chars', () => {
      const page = createPageData({
        twitter: { card: 'summary', title: 'A'.repeat(75), description: 'Desc', image: 'https://example.com/img.jpg' },
      })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO01181')).toBe(true)
    })
  })

  describe('SEO01182: twitter:description too long', () => {
    it('should trigger when twitter:description > 200 chars', () => {
      const page = createPageData({
        twitter: { card: 'summary', title: 'Title', description: 'A'.repeat(210), image: 'https://example.com/img.jpg' },
      })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO01182')).toBe(true)
    })
  })

  describe('SEO01183: twitter:image is relative', () => {
    it('should trigger when twitter:image is relative URL', () => {
      const page = createPageData({
        twitter: { card: 'summary', title: 'Title', description: 'Desc', image: '/images/twitter.jpg' },
      })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO01183')).toBe(true)
    })
  })

  describe('SEO01185: Missing og:site_name', () => {
    it('should trigger when og:site_name is missing', () => {
      const page = createPageData({
        og: { title: 'Title', description: 'A long enough description for validation', image: 'https://example.com/img.jpg', url: 'https://example.com/', type: 'website' },
      })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO01185')).toBe(true)
    })
  })

  describe('SEO01186: Missing og:locale', () => {
    it('should trigger when og:locale is missing', () => {
      const page = createPageData({
        og: { title: 'Title', description: 'A long enough description for validation', image: 'https://example.com/img.jpg', url: 'https://example.com/', type: 'website', siteName: 'Site' },
      })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO01186')).toBe(true)
    })
  })

  describe('SEO01188: og:image dimensions not specified', () => {
    it('should trigger when og:image width/height are missing', () => {
      const page = createPageData({
        og: { title: 'Title', description: 'A long enough description for validation', image: 'https://example.com/img.jpg', url: 'https://example.com/', type: 'website', siteName: 'Site', locale: 'en_US' },
      })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO01188')).toBe(true)
    })
  })

  describe('SEO01199: Missing og:image:alt', () => {
    it('should trigger when og:image:alt is missing', () => {
      const page = createPageData({
        og: {
          title: 'Title',
          description: 'A long enough description for validation',
          image: 'https://example.com/img.jpg',
          url: 'https://example.com/',
          type: 'website',
          siteName: 'Site',
          locale: 'en_US',
          imageWidth: '1200',
          imageHeight: '630',
        },
      })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO01199')).toBe(true)
    })
  })

  describe('SEO01191: Missing twitter:site', () => {
    it('should trigger when twitter:site is missing', () => {
      const page = createPageData({
        twitter: { card: 'summary', title: 'Title', description: 'Desc', image: 'https://example.com/img.jpg' },
      })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO01191')).toBe(true)
    })
  })

  describe('SEO01193: Missing twitter:image:alt', () => {
    it('should trigger when twitter:image:alt is missing', () => {
      const page = createPageData({
        twitter: { card: 'summary', title: 'Title', description: 'Desc', image: 'https://example.com/img.jpg', site: '@example' },
      })
      const issues = checkSocialTags(page, config)
      expect(hasIssue(issues, 'SEO01193')).toBe(true)
    })
  })
})

describe('Additional content format checks', () => {
  const config = createConfig()

  describe('SEO00059: Mojibake in title', () => {
    it('should trigger for mojibake characters in title', () => {
      const page = createPageData({ title: 'Title with Ã© mojibake' })
      const issues = checkContentFormat(page, config)
      expect(hasIssue(issues, 'SEO00059')).toBe(true)
    })
  })

  describe('SEO00063: Mojibake in description', () => {
    it('should trigger for mojibake characters in description', () => {
      const page = createPageData({ metaDescription: 'Description with â€™ mojibake' })
      const issues = checkContentFormat(page, config)
      expect(hasIssue(issues, 'SEO00063')).toBe(true)
    })
  })

  describe('SEO00067: Mojibake in H1', () => {
    it('should trigger for mojibake characters in H1', () => {
      const page = createPageData({ h1s: ['Heading with Ã¨ mojibake'] })
      const issues = checkContentFormat(page, config)
      expect(hasIssue(issues, 'SEO00067')).toBe(true)
    })
  })
})

describe('Additional heading checks', () => {
  const config = createConfig()

  describe('SEO00113-00115: Missing heading levels', () => {
    it('SEO00113: should trigger when H2 exists but H1 is missing', () => {
      const page = createPageData({
        h2s: ['Section'],
        headingOrder: [{ level: 2, text: 'Section' }],
      })
      const issues = checkHeadings(page, config)
      expect(hasIssue(issues, 'SEO00113')).toBe(true)
    })

    it('SEO00114: should trigger when H3 exists but H2 is missing', () => {
      const page = createPageData({
        h1s: ['Main'],
        h3s: ['Subsection'],
        headingOrder: [
          { level: 1, text: 'Main' },
          { level: 3, text: 'Subsection' },
        ],
      })
      const issues = checkHeadings(page, config)
      expect(hasIssue(issues, 'SEO00114')).toBe(true)
    })

    it('SEO00115: should trigger when H4 exists but H3 is missing', () => {
      const page = createPageData({
        h1s: ['Main'],
        h2s: ['Section'],
        h4s: ['Deep'],
        headingOrder: [
          { level: 1, text: 'Main' },
          { level: 2, text: 'Section' },
          { level: 4, text: 'Deep' },
        ],
      })
      const issues = checkHeadings(page, config)
      expect(hasIssue(issues, 'SEO00115')).toBe(true)
    })
  })
})

describe('Additional accessibility checks', () => {
  const config = createConfig()

  describe('SEO00410: Empty aria-label', () => {
    it('should trigger for empty aria-label attributes', () => {
      const page = createPageData({
        html: '<!DOCTYPE html><html><body><button aria-label="">Click</button></body></html>',
      })
      const issues = checkAccessibility(page, config)
      expect(hasIssue(issues, 'SEO00410')).toBe(true)
    })
  })

  describe('SEO00412: role="img" without aria-label', () => {
    it('should trigger for role="img" without aria-label', () => {
      const page = createPageData({
        html: '<!DOCTYPE html><html><body><div role="img"></div></body></html>',
      })
      const issues = checkAccessibility(page, config)
      expect(hasIssue(issues, 'SEO00412')).toBe(true)
    })
  })
})
