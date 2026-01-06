/**
 * @capgo/seo-checker
 * Static SEO analysis for dist folders
 */

// Checks
export {
  checkAccessibility,
  checkContentFormat,
  checkContentLength,
  checkContentQuality,
  checkDuplicates,
  checkHeadings,
  checkHtmlSemantics,
  checkHtmlValidity,
  checkImages,
  checkIndexability,
  checkInternationalSEO,
  checkLinks,
  checkMetadata,
  checkOrphanPages,
  checkRobotsTxt,
  checkSitemap,
  checkSocialTags,
  checkStructuredData,
  checkTemplateHygiene,
  checkUrlHygiene,
  runPageChecks,
} from './checks.js'

// Domain utilities
export {
  extractHostname,
  getExpectedHostname,
  getMainDomain,
  isExactHostnameMatch,
  isSameSite,
  normalizeDomain,
  validateUrlDomain,
} from './domain.js'

// Exclusions
export {
  exportExclusionsToFile,
  filterDisabledRules,
  filterExcludedIssues,
  generateExclusionForIssue,
  loadExclusionsFromFile,
  shouldExcludeIssue,
} from './exclusions.js'

// Parser
export {
  clearDomainCache,
  clearFileExistsCache,
  fileExists,
  parseHtmlFile,
  resolveToFilePath,
  scanDistFolder,
} from './parser.js'

// Reporter
export {
  formatConsoleReport,
  formatGitHubReport,
  formatJsonReport,
  formatSarifReport,
  printReport,
  writeReport,
} from './reporter.js'

// Rules
export {
  getRule,
  getRulesByCategory,
  getRulesBySeverity,
  SEO_RULES,
} from './rules.js'

// Types
export type {
  CheckResult,
  ExclusionRule,
  PageData,
  RuleScope,
  SEOCheckerConfig,
  SEOIssue,
  SEORule,
  Severity,
  SiteData,
} from './types.js'
