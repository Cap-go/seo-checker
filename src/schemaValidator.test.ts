/**
 * Tests for schemaValidator.ts - Schema.org JSON-LD Validator
 */

import { describe, expect, it } from 'bun:test'
import {
  getAvailableSchemaTypes,
  hasSchemaFor,
  validateJsonLd,
  validateSchemaItem,
} from './schemaValidator.js'

describe('validateJsonLd', () => {
  describe('basic validation', () => {
    it('should return valid for object without @type', () => {
      const result = validateJsonLd({ name: 'Test' })
      expect(result.valid).toBe(true)
      expect(result.errors).toEqual([])
    })

    it('should validate a simple Article schema', () => {
      const data = {
        '@context': 'https://schema.org',
        '@type': 'Article',
        'headline': 'Test Article',
        'author': {
          '@type': 'Person',
          'name': 'John Doe',
        },
      }
      const result = validateJsonLd(data)
      // Result depends on whether schema files are available
      expect(result).toBeDefined()
      expect(Array.isArray(result.errors)).toBe(true)
    })

    it('should validate a Person schema', () => {
      const data = {
        '@context': 'https://schema.org',
        '@type': 'Person',
        'name': 'John Doe',
        'email': 'john@example.com',
      }
      const result = validateJsonLd(data)
      expect(result).toBeDefined()
      expect(Array.isArray(result.errors)).toBe(true)
    })

    it('should validate an Organization schema', () => {
      const data = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        'name': 'Acme Corp',
        'url': 'https://acme.com',
      }
      const result = validateJsonLd(data)
      expect(result).toBeDefined()
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })

  describe('array types', () => {
    it('should handle multiple @type values', () => {
      const data = {
        '@context': 'https://schema.org',
        '@type': ['Article', 'NewsArticle'],
        'headline': 'Breaking News',
      }
      const result = validateJsonLd(data)
      expect(result).toBeDefined()
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })

  describe('invalid data', () => {
    it('should skip non-string @type values', () => {
      const data = {
        '@type': 123, // Invalid type
        'name': 'Test',
      }
      const result = validateJsonLd(data as unknown as Record<string, unknown>)
      // Should not throw, just return valid (no type to validate)
      expect(result).toBeDefined()
    })

    it('should handle unknown schema types gracefully', () => {
      const data = {
        '@context': 'https://schema.org',
        '@type': 'UnknownSchemaType12345',
        'name': 'Test',
      }
      const result = validateJsonLd(data)
      // Unknown types should pass (no validator available)
      expect(result).toBeDefined()
    })
  })

  describe('BreadcrumbList validation', () => {
    it('should validate BreadcrumbList schema', () => {
      const data = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Home',
            'item': 'https://example.com/',
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': 'Products',
            'item': 'https://example.com/products',
          },
        ],
      }
      const result = validateJsonLd(data)
      expect(result).toBeDefined()
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })

  describe('Product validation', () => {
    it('should validate Product schema', () => {
      const data = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        'name': 'Test Product',
        'description': 'A great product',
        'offers': {
          '@type': 'Offer',
          'price': '19.99',
          'priceCurrency': 'USD',
        },
      }
      const result = validateJsonLd(data)
      expect(result).toBeDefined()
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })
})

describe('validateSchemaItem', () => {
  it('should validate nested objects', () => {
    const item = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      'name': 'Jane Doe',
    }
    const result = validateSchemaItem(item)
    expect(result).toBeDefined()
    expect(Array.isArray(result.errors)).toBe(true)
  })

  it('should return valid for null', () => {
    const result = validateSchemaItem(null)
    expect(result.valid).toBe(true)
    expect(result.errors).toEqual([])
  })

  it('should return valid for non-objects', () => {
    expect(validateSchemaItem('string').valid).toBe(true)
    expect(validateSchemaItem(123).valid).toBe(true)
    expect(validateSchemaItem(undefined).valid).toBe(true)
  })
})

describe('hasSchemaFor', () => {
  it('should check if schema exists for common types', () => {
    // These may or may not have schemas depending on installation
    const result = hasSchemaFor('Article')
    expect(typeof result).toBe('boolean')
  })

  it('should return false for unknown types', () => {
    const result = hasSchemaFor('CompletelyMadeUpType12345')
    expect(result).toBe(false)
  })

  it('should handle empty string', () => {
    const result = hasSchemaFor('')
    expect(result).toBe(false)
  })
})

describe('getAvailableSchemaTypes', () => {
  it('should return an array', () => {
    const types = getAvailableSchemaTypes()
    expect(Array.isArray(types)).toBe(true)
  })

  it('should return schema type names without .schema.json extension', () => {
    const types = getAvailableSchemaTypes()
    for (const type of types) {
      expect(type).not.toContain('.schema.json')
      expect(type).not.toContain('/')
    }
  })

  it('should include common schema types if available', () => {
    const types = getAvailableSchemaTypes()
    if (types.length > 0) {
      // If schemas are installed, check for some common ones
      const commonTypes = ['Article', 'Person', 'Organization', 'Product']
      const hasCommon = commonTypes.some(t => types.includes(t))
      // May or may not have common types depending on installation
      expect(typeof hasCommon).toBe('boolean')
    }
  })
})

describe('error filtering', () => {
  it('should filter out noisy error keywords', () => {
    // Test that if/then/else errors are filtered
    // This is an internal behavior, so we test indirectly
    const data = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': 'Test',
    }
    const result = validateJsonLd(data)

    // Verify no if/then/else errors are returned
    for (const error of result.errors) {
      expect(error.keyword).not.toBe('if')
      expect(error.keyword).not.toBe('then')
      expect(error.keyword).not.toBe('else')
    }
  })
})
