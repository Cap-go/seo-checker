/**
 * @capgo/seo-checker
 * Static SEO analysis for dist folders
 */

// Types
export type {
  Severity,
  RuleScope,
  SEORule,
  SEOIssue,
  ExclusionRule,
  SEOCheckerConfig,
  PageData,
  SiteData,
  CheckResult,
} from './types.js'

// Parser
export {
  parseHtmlFile,
  scanDistFolder,
  fileExists,
  clearFileExistsCache,
  resolveToFilePath,
} from './parser.js'

// Checks
export {
  checkMetadata,
  checkHtmlValidity,
  checkContentLength,
  checkContentFormat,
  checkHeadings,
  checkIndexability,
  checkLinks,
  checkUrlHygiene,
  checkImages,
  checkSocialTags,
  checkInternationalSEO,
  checkStructuredData,
  checkContentQuality,
  checkTemplateHygiene,
  checkAccessibility,
  checkHtmlSemantics,
  checkDuplicates,
  checkRobotsTxt,
  checkSitemap,
  runPageChecks,
} from './checks.js'

// Exclusions
export {
  shouldExcludeIssue,
  filterExcludedIssues,
  filterDisabledRules,
  loadExclusionsFromFile,
  generateExclusionForIssue,
  exportExclusionsToFile,
} from './exclusions.js'

// Reporter
export {
  formatConsoleReport,
  formatJsonReport,
  formatSarifReport,
  writeReport,
  printReport,
} from './reporter.js'

// Rules
export {
  SEO_RULES,
  getRule,
  getRulesByCategory,
  getRulesBySeverity,
} from './rules.js'
