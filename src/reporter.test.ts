/**
 * Tests for reporter.ts - SEO Checker Reporter
 */

import type { CheckResult, SEOIssue } from './types.js'
import { describe, expect, it } from 'bun:test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {
  formatConsoleReport,
  formatGitHubReport,
  formatJsonReport,
  formatSarifReport,
  writeReport,
} from './reporter.js'

// Helper to create a minimal issue
function createIssue(overrides: Partial<SEOIssue> = {}): SEOIssue {
  return {
    ruleId: 'SEO00001',
    ruleName: 'Missing title',
    category: 'metadata',
    severity: 'error',
    file: '/dist/index.html',
    relativePath: 'index.html',
    fixHint: 'Add a title tag',
    fingerprint: 'SEO00001::index.html',
    ...overrides,
  }
}

// Helper to create a minimal check result
function createResult(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    issues: [],
    stats: {
      totalPages: 10,
      totalImages: 50,
      totalLinks: 100,
      issuesBySeverity: {
        error: 0,
        warning: 0,
        notice: 0,
      },
      issuesByCategory: {},
    },
    duration: 1234,
    excludedCount: 0,
    disabledCount: 0,
    ...overrides,
  }
}

describe('formatConsoleReport', () => {
  it('should format empty result', () => {
    const result = createResult()
    const output = formatConsoleReport(result)

    expect(output).toContain('SEO Static Analysis Report')
    expect(output).toContain('Total pages scanned: 10')
    expect(output).toContain('Total images checked: 50')
    expect(output).toContain('Total links checked: 100')
    expect(output).toContain('All SEO checks passed!')
  })

  it('should format result with issues', () => {
    const result = createResult({
      issues: [
        createIssue({ severity: 'error' }),
        createIssue({ ruleId: 'SEO00002', severity: 'warning' }),
      ],
      stats: {
        totalPages: 10,
        totalImages: 50,
        totalLinks: 100,
        issuesBySeverity: {
          error: 1,
          warning: 1,
          notice: 0,
        },
        issuesByCategory: {
          metadata: 2,
        },
      },
    })
    const output = formatConsoleReport(result)

    expect(output).toContain('SEO00001')
    expect(output).toContain('Missing title')
    expect(output).toContain('Errors:')
    expect(output).toContain('Warnings:')
    expect(output).toContain('Found 2 issues')
  })

  it('should group issues by category', () => {
    const result = createResult({
      issues: [
        createIssue({ category: 'metadata' }),
        createIssue({ category: 'images', ruleId: 'SEO00153' }),
      ],
      stats: {
        totalPages: 10,
        totalImages: 50,
        totalLinks: 100,
        issuesBySeverity: { error: 2, warning: 0, notice: 0 },
        issuesByCategory: { metadata: 1, images: 1 },
      },
    })
    const output = formatConsoleReport(result)

    expect(output).toContain('metadata')
    expect(output).toContain('images')
  })

  it('should show element info when present', () => {
    const result = createResult({
      issues: [
        createIssue({ element: '<img src="test.jpg">' }),
      ],
      stats: {
        totalPages: 10,
        totalImages: 50,
        totalLinks: 100,
        issuesBySeverity: { error: 1, warning: 0, notice: 0 },
        issuesByCategory: { metadata: 1 },
      },
    })
    const output = formatConsoleReport(result)

    expect(output).toContain('Element:')
    expect(output).toContain('<img src="test.jpg">')
  })

  it('should show actual/expected when present', () => {
    const result = createResult({
      issues: [
        createIssue({ actual: '5 chars', expected: '>= 30 chars' }),
      ],
      stats: {
        totalPages: 10,
        totalImages: 50,
        totalLinks: 100,
        issuesBySeverity: { error: 1, warning: 0, notice: 0 },
        issuesByCategory: { metadata: 1 },
      },
    })
    const output = formatConsoleReport(result)

    expect(output).toContain('Found:')
    expect(output).toContain('5 chars')
    expect(output).toContain('Expected:')
    expect(output).toContain('>= 30 chars')
  })

  it('should show excluded count when present', () => {
    const result = createResult({ excludedCount: 5 })
    const output = formatConsoleReport(result)

    expect(output).toContain('Excluded issues: 5')
  })

  it('should show disabled count when present', () => {
    const result = createResult({ disabledCount: 3 })
    const output = formatConsoleReport(result)

    expect(output).toContain('Disabled rule issues: 3')
  })

  it('should show duration', () => {
    const result = createResult({ duration: 5678 })
    const output = formatConsoleReport(result)

    expect(output).toContain('Duration: 5678ms')
  })
})

describe('formatJsonReport', () => {
  it('should return valid JSON', () => {
    const result = createResult()
    const output = formatJsonReport(result)

    const parsed = JSON.parse(output)
    expect(parsed).toBeDefined()
  })

  it('should include all result fields', () => {
    const result = createResult({
      issues: [createIssue()],
    })
    const output = formatJsonReport(result)
    const parsed = JSON.parse(output)

    expect(parsed.issues).toBeDefined()
    expect(parsed.stats).toBeDefined()
    expect(parsed.duration).toBeDefined()
    expect(parsed.excludedCount).toBeDefined()
    expect(parsed.disabledCount).toBeDefined()
  })

  it('should pretty print with indentation', () => {
    const result = createResult()
    const output = formatJsonReport(result)

    expect(output).toContain('\n')
    expect(output).toContain('  ')
  })
})

describe('formatGitHubReport', () => {
  it('should format issues as GitHub annotations', () => {
    const result = createResult({
      issues: [
        createIssue({ severity: 'error' }),
      ],
      stats: {
        totalPages: 10,
        totalImages: 50,
        totalLinks: 100,
        issuesBySeverity: { error: 1, warning: 0, notice: 0 },
        issuesByCategory: { metadata: 1 },
      },
    })
    const output = formatGitHubReport(result)

    expect(output).toContain('::error')
    expect(output).toContain('file=index.html')
    expect(output).toContain('SEO00001')
  })

  it('should use correct severity mapping', () => {
    const result = createResult({
      issues: [
        createIssue({ severity: 'error' }),
        createIssue({ severity: 'warning', ruleId: 'SEO00002' }),
        createIssue({ severity: 'notice', ruleId: 'SEO00003' }),
      ],
      stats: {
        totalPages: 10,
        totalImages: 50,
        totalLinks: 100,
        issuesBySeverity: { error: 1, warning: 1, notice: 1 },
        issuesByCategory: { metadata: 3 },
      },
    })
    const output = formatGitHubReport(result)

    expect(output).toContain('::error')
    expect(output).toContain('::warning')
    expect(output).toContain('::notice')
  })

  it('should include summary group', () => {
    const result = createResult()
    const output = formatGitHubReport(result)

    expect(output).toContain('::group::SEO Check Summary')
    expect(output).toContain('::endgroup::')
    expect(output).toContain('Total pages scanned:')
  })

  it('should include element in message when present', () => {
    const result = createResult({
      issues: [
        createIssue({ element: '<img>' }),
      ],
      stats: {
        totalPages: 10,
        totalImages: 50,
        totalLinks: 100,
        issuesBySeverity: { error: 1, warning: 0, notice: 0 },
        issuesByCategory: { metadata: 1 },
      },
    })
    const output = formatGitHubReport(result)

    expect(output).toContain('Element: <img>')
  })

  it('should use line number when present', () => {
    const result = createResult({
      issues: [
        createIssue({ line: 42 }),
      ],
      stats: {
        totalPages: 10,
        totalImages: 50,
        totalLinks: 100,
        issuesBySeverity: { error: 1, warning: 0, notice: 0 },
        issuesByCategory: { metadata: 1 },
      },
    })
    const output = formatGitHubReport(result)

    expect(output).toContain('line=42')
  })
})

describe('formatSarifReport', () => {
  it('should return valid SARIF JSON', () => {
    const result = createResult()
    const output = formatSarifReport(result)

    const parsed = JSON.parse(output)
    expect(parsed.$schema).toContain('sarif')
    expect(parsed.version).toBe('2.1.0')
  })

  it('should include tool information', () => {
    const result = createResult()
    const output = formatSarifReport(result)
    const parsed = JSON.parse(output)

    expect(parsed.runs).toBeDefined()
    expect(parsed.runs[0].tool).toBeDefined()
    expect(parsed.runs[0].tool.driver.name).toBe('SEO Static Checker')
  })

  it('should include rules definitions', () => {
    const result = createResult({
      issues: [
        createIssue(),
        createIssue({ ruleId: 'SEO00002', ruleName: 'Missing description' }),
      ],
      stats: {
        totalPages: 10,
        totalImages: 50,
        totalLinks: 100,
        issuesBySeverity: { error: 2, warning: 0, notice: 0 },
        issuesByCategory: { metadata: 2 },
      },
    })
    const output = formatSarifReport(result)
    const parsed = JSON.parse(output)

    const rules = parsed.runs[0].tool.driver.rules
    expect(Array.isArray(rules)).toBe(true)
    expect(rules.length).toBe(2)
    expect(rules.map((r: { id: string }) => r.id)).toContain('SEO00001')
    expect(rules.map((r: { id: string }) => r.id)).toContain('SEO00002')
  })

  it('should include results', () => {
    const result = createResult({
      issues: [createIssue()],
      stats: {
        totalPages: 10,
        totalImages: 50,
        totalLinks: 100,
        issuesBySeverity: { error: 1, warning: 0, notice: 0 },
        issuesByCategory: { metadata: 1 },
      },
    })
    const output = formatSarifReport(result)
    const parsed = JSON.parse(output)

    const results = parsed.runs[0].results
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBe(1)
    expect(results[0].ruleId).toBe('SEO00001')
  })

  it('should map severity correctly', () => {
    const result = createResult({
      issues: [
        createIssue({ severity: 'error' }),
        createIssue({ severity: 'warning', ruleId: 'SEO00002' }),
        createIssue({ severity: 'notice', ruleId: 'SEO00003' }),
      ],
      stats: {
        totalPages: 10,
        totalImages: 50,
        totalLinks: 100,
        issuesBySeverity: { error: 1, warning: 1, notice: 1 },
        issuesByCategory: { metadata: 3 },
      },
    })
    const output = formatSarifReport(result)
    const parsed = JSON.parse(output)

    const results = parsed.runs[0].results
    expect(results[0].level).toBe('error')
    expect(results[1].level).toBe('warning')
    expect(results[2].level).toBe('note')
  })

  it('should include location information', () => {
    const result = createResult({
      issues: [createIssue({ relativePath: 'pages/about.html', line: 10 })],
      stats: {
        totalPages: 10,
        totalImages: 50,
        totalLinks: 100,
        issuesBySeverity: { error: 1, warning: 0, notice: 0 },
        issuesByCategory: { metadata: 1 },
      },
    })
    const output = formatSarifReport(result)
    const parsed = JSON.parse(output)

    const location = parsed.runs[0].results[0].locations[0]
    expect(location.physicalLocation.artifactLocation.uri).toBe('pages/about.html')
    expect(location.physicalLocation.region.startLine).toBe(10)
  })

  it('should include fingerprint', () => {
    const result = createResult({
      issues: [createIssue({ fingerprint: 'unique-fp' })],
      stats: {
        totalPages: 10,
        totalImages: 50,
        totalLinks: 100,
        issuesBySeverity: { error: 1, warning: 0, notice: 0 },
        issuesByCategory: { metadata: 1 },
      },
    })
    const output = formatSarifReport(result)
    const parsed = JSON.parse(output)

    expect(parsed.runs[0].results[0].fingerprints.primary).toBe('unique-fp')
  })
})

describe('writeReport', () => {
  function createTempDir(): string {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'seo-test-'))
  }

  function cleanupTempDir(dir: string): void {
    fs.rmSync(dir, { recursive: true, force: true })
  }

  it('should write JSON report to file', () => {
    const tempDir = createTempDir()
    const filePath = path.join(tempDir, 'report.json')
    try {
      const result = createResult()
      writeReport(result, 'json', filePath)

      expect(fs.existsSync(filePath)).toBe(true)
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(content)
      expect(parsed.stats).toBeDefined()
    }
    finally {
      cleanupTempDir(tempDir)
    }
  })

  it('should write SARIF report to file', () => {
    const tempDir = createTempDir()
    const filePath = path.join(tempDir, 'report.sarif')
    try {
      const result = createResult()
      writeReport(result, 'sarif', filePath)

      expect(fs.existsSync(filePath)).toBe(true)
      const content = fs.readFileSync(filePath, 'utf-8')
      const parsed = JSON.parse(content)
      expect(parsed.version).toBe('2.1.0')
    }
    finally {
      cleanupTempDir(tempDir)
    }
  })

  it('should write GitHub report to file', () => {
    const tempDir = createTempDir()
    const filePath = path.join(tempDir, 'report.txt')
    try {
      const result = createResult()
      writeReport(result, 'github', filePath)

      expect(fs.existsSync(filePath)).toBe(true)
      const content = fs.readFileSync(filePath, 'utf-8')
      expect(content).toContain('SEO Check Summary')
    }
    finally {
      cleanupTempDir(tempDir)
    }
  })

  it('should write console report to file without ANSI codes', () => {
    const tempDir = createTempDir()
    const filePath = path.join(tempDir, 'report.txt')
    try {
      const result = createResult()
      writeReport(result, 'console', filePath)

      expect(fs.existsSync(filePath)).toBe(true)
      const content = fs.readFileSync(filePath, 'utf-8')
      // Should not contain ANSI escape codes
      expect(content).not.toContain('\x1B[')
      expect(content).toContain('SEO Static Analysis Report')
    }
    finally {
      cleanupTempDir(tempDir)
    }
  })
})
