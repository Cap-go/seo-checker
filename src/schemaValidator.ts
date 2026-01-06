/**
 * Schema.org JSON-LD Validator
 * Uses schema-org-json-schemas package with Ajv for runtime validation
 */

import * as fs from 'node:fs'
import { createRequire } from 'node:module'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const Ajv = require('ajv').default || require('ajv')

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface SchemaValidationError {
  schemaType: string
  message: string
  path: string
  keyword: string
}

export interface SchemaValidationResult {
  valid: boolean
  errors: SchemaValidationError[]
}

interface AjvInstance {
  addSchema: (schema: unknown, id: string) => void
  getSchema: (id: string) => AjvValidateFunction | undefined
}

interface AjvValidateFunction {
  (data: unknown): boolean
  errors?: Array<{
    keyword: string
    instancePath: string
    message?: string
  }> | null
}

// Cache for compiled validators
const validatorCache = new Map<string, AjvValidateFunction>()

// Ajv instance configured for schema.org schemas
let ajvInstance: AjvInstance | null = null

/**
 * Get or create the Ajv instance with all schema.org schemas loaded
 */
function getAjv(): AjvInstance {
  if (ajvInstance) {
    return ajvInstance
  }

  const instance: AjvInstance = new Ajv({
    strict: false, // Schema.org schemas may not be strictly conformant
    allErrors: true, // Collect all errors, not just the first
    validateFormats: false, // Don't validate formats strictly
  })

  // Load all schema.org schemas for $ref resolution
  const schemasDir = path.join(__dirname, '..', 'node_modules', 'schema-org-json-schemas', 'schemas')

  if (fs.existsSync(schemasDir)) {
    const schemaFiles = fs.readdirSync(schemasDir).filter(f => f.endsWith('.schema.json'))

    for (const file of schemaFiles) {
      try {
        const schemaPath = path.join(schemasDir, file)
        const schemaContent = fs.readFileSync(schemaPath, 'utf-8')
        const schema = JSON.parse(schemaContent)
        // Add schema to Ajv with its $id for $ref resolution
        instance.addSchema(schema, schema.$id)
      }
      catch {
        // Skip schemas that fail to load
      }
    }
  }

  ajvInstance = instance
  return instance
}

/**
 * Get a compiled validator for a specific schema type
 */
function getValidator(schemaType: string): AjvValidateFunction | null {
  // Check cache first
  if (validatorCache.has(schemaType)) {
    return validatorCache.get(schemaType)!
  }

  const ajv = getAjv()
  const schemaId = `schema:${schemaType}`

  try {
    const validator = ajv.getSchema(schemaId)
    if (validator) {
      validatorCache.set(schemaType, validator)
      return validator
    }
  }
  catch {
    // Schema not found or compilation error
  }

  return null
}

/**
 * Validate a JSON-LD object against its schema.org type
 */
export function validateJsonLd(data: Record<string, unknown>): SchemaValidationResult {
  const errors: SchemaValidationError[] = []

  const schemaType = data['@type']
  if (!schemaType) {
    return { valid: true, errors: [] } // No type to validate against
  }

  const types = Array.isArray(schemaType) ? schemaType : [schemaType]

  for (const type of types) {
    if (typeof type !== 'string')
      continue

    const validator = getValidator(type)
    if (!validator) {
      continue // No schema available for this type
    }

    const valid = validator(data)
    if (!valid && validator.errors) {
      for (const error of validator.errors) {
        // Filter out overly noisy errors
        if (error.keyword === 'if' || error.keyword === 'then' || error.keyword === 'else') {
          continue
        }

        errors.push({
          schemaType: type,
          message: error.message || 'Unknown validation error',
          path: error.instancePath || '/',
          keyword: error.keyword,
        })
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Validate a nested schema item (for @graph or nested objects)
 */
export function validateSchemaItem(item: unknown): SchemaValidationResult {
  if (typeof item !== 'object' || item === null) {
    return { valid: true, errors: [] }
  }

  return validateJsonLd(item as Record<string, unknown>)
}

/**
 * Check if a schema type has a JSON Schema available
 */
export function hasSchemaFor(schemaType: string): boolean {
  return getValidator(schemaType) !== null
}

/**
 * Get list of available schema types
 */
export function getAvailableSchemaTypes(): string[] {
  const schemasDir = path.join(__dirname, '..', 'node_modules', 'schema-org-json-schemas', 'schemas')

  if (!fs.existsSync(schemasDir)) {
    return []
  }

  return fs.readdirSync(schemasDir)
    .filter(f => f.endsWith('.schema.json'))
    .map(f => f.replace('.schema.json', ''))
}
