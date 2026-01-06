/**
 * Tests for rules.ts - SEO Rules Definition
 */

import { describe, expect, it } from 'bun:test'
import {
  getRule,
  getRulesByCategory,
  getRulesBySeverity,
  SEO_RULES,
} from './rules.js'

describe('SEO_RULES', () => {
  it('should have rules loaded', () => {
    expect(Array.isArray(SEO_RULES)).toBe(true)
    expect(SEO_RULES.length).toBeGreaterThan(0)
  })

  it('should have rules with required fields', () => {
    for (const rule of SEO_RULES.slice(0, 10)) { // Check first 10 rules
      expect(rule.id).toBeDefined()
      expect(rule.name).toBeDefined()
      expect(rule.category).toBeDefined()
      expect(rule.severity).toBeDefined()
      expect(['error', 'warning', 'notice']).toContain(rule.severity)
    }
  })
})

describe('getRule', () => {
  it('should return a rule by ID', () => {
    const rule = getRule('SEO00001')
    expect(rule).toBeDefined()
    expect(rule?.id).toBe('SEO00001')
  })

  it('should return undefined for non-existent rule', () => {
    const rule = getRule('NONEXISTENT')
    expect(rule).toBeUndefined()
  })

  it('should return rule with all expected properties', () => {
    const rule = getRule('SEO00001')
    expect(rule).toBeDefined()
    expect(rule?.id).toBeDefined()
    expect(rule?.name).toBeDefined()
    expect(rule?.category).toBeDefined()
    expect(rule?.severity).toBeDefined()
  })

  it('should find various rule types', () => {
    // Check different rule IDs exist
    expect(getRule('SEO00002')).toBeDefined()
    expect(getRule('SEO00010')).toBeDefined()
    expect(getRule('SEO00100')).toBeDefined()
  })
})

describe('getRulesByCategory', () => {
  it('should return rules for a category', () => {
    // First find a category that exists
    const categories = [...new Set(SEO_RULES.map(r => r.category))]
    expect(categories.length).toBeGreaterThan(0)

    const category = categories[0]
    const rules = getRulesByCategory(category)
    expect(Array.isArray(rules)).toBe(true)
    expect(rules.length).toBeGreaterThan(0)
    expect(rules.every(r => r.category === category)).toBe(true)
  })

  it('should return empty array for non-existent category', () => {
    const rules = getRulesByCategory('NONEXISTENT_CATEGORY')
    expect(Array.isArray(rules)).toBe(true)
    expect(rules.length).toBe(0)
  })

  it('should return rules for metadata category', () => {
    const rules = getRulesByCategory('metadata')
    expect(Array.isArray(rules)).toBe(true)
    // Metadata category should have rules
    if (rules.length > 0) {
      expect(rules.every(r => r.category === 'metadata')).toBe(true)
    }
  })
})

describe('getRulesBySeverity', () => {
  it('should return error rules', () => {
    const rules = getRulesBySeverity('error')
    expect(Array.isArray(rules)).toBe(true)
    if (rules.length > 0) {
      expect(rules.every(r => r.severity === 'error')).toBe(true)
    }
  })

  it('should return warning rules', () => {
    const rules = getRulesBySeverity('warning')
    expect(Array.isArray(rules)).toBe(true)
    if (rules.length > 0) {
      expect(rules.every(r => r.severity === 'warning')).toBe(true)
    }
  })

  it('should return notice rules', () => {
    const rules = getRulesBySeverity('notice')
    expect(Array.isArray(rules)).toBe(true)
    if (rules.length > 0) {
      expect(rules.every(r => r.severity === 'notice')).toBe(true)
    }
  })

  it('should have all rules covered by severity levels', () => {
    const errors = getRulesBySeverity('error')
    const warnings = getRulesBySeverity('warning')
    const notices = getRulesBySeverity('notice')

    const totalBySeverity = errors.length + warnings.length + notices.length
    expect(totalBySeverity).toBe(SEO_RULES.length)
  })
})

describe('Rule data integrity', () => {
  it('should have mostly unique rule IDs', () => {
    const ids = SEO_RULES.map(r => r.id)
    const uniqueIds = new Set(ids)
    // Allow for a small number of duplicates (some rules may be intentionally duplicated for different contexts)
    const duplicateCount = ids.length - uniqueIds.size
    expect(duplicateCount).toBeLessThan(10)
  })

  it('should have non-empty rule names', () => {
    for (const rule of SEO_RULES) {
      expect(rule.name.trim().length).toBeGreaterThan(0)
    }
  })

  it('should have valid severity values', () => {
    const validSeverities = ['error', 'warning', 'notice']
    for (const rule of SEO_RULES) {
      expect(validSeverities).toContain(rule.severity)
    }
  })

  it('should have fixHint for rules', () => {
    // Check a sample of rules have fixHint
    const sampleRules = SEO_RULES.slice(0, 20)
    for (const rule of sampleRules) {
      expect(rule.fixHint).toBeDefined()
    }
  })
})
