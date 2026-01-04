# @capgo/seo-checker

Static SEO checker for analyzing built HTML files in dist folders. Performs comprehensive SEO analysis with 1000+ rules covering metadata, content quality, accessibility, structured data, and more.

Inspired by Ahrefs SEO Audit and Lighthouse SEO audits, but focused on static sites built with frameworks like Astro, Next.js, SvelteKit, etc.

## Installation

```bash
npm install @capgo/seo-checker
# or
bun add @capgo/seo-checker
```

## CLI Usage

```bash
# Run with default settings (scans ./dist)
npx @capgo/seo-checker

# Specify dist path
npx @capgo/seo-checker --dist ./build

# Output as JSON
npx @capgo/seo-checker --output json

# Generate a sample config file
npx @capgo/seo-checker --generate-config
```

### CLI Options

| Option              | Description                         | Default                   |
| ------------------- | ----------------------------------- | ------------------------- |
| `--dist <path>`     | Path to dist folder                 | `./dist`                  |
| `--config <path>`   | Path to config file                 | `seo-checker.config.json` |
| `--output <format>` | Output format: console, json, sarif | `console`                 |
| `--report <path>`   | Path to write report file           | -                         |
| `--fail-on <level>` | Fail on: error, warning, notice     | `error`                   |
| `--max-issues <n>`  | Maximum issues before stopping      | `0` (unlimited)           |
| `--generate-config` | Generate a sample config file       | -                         |

## Configuration

Create a `seo-checker.config.json` file:

```json
{
  "distPath": "./dist",
  "baseUrl": "https://example.com",
  "languages": ["en", "es", "fr"],
  "defaultLanguage": "en",
  "rules": {
    "disabled": ["SEO00186", "SEO00189"],
    "severityOverrides": {
      "SEO00135": "notice"
    }
  },
  "exclusions": [
    {
      "ruleId": "SEO00147",
      "filePath": "404.html",
      "reason": "404 page intentionally has broken link examples"
    }
  ],
  "failOn": ["error"],
  "maxIssues": 0,
  "outputFormat": "console"
}
```

## Programmatic Usage

```typescript
import {
  checkDuplicates,
  printReport,
  runPageChecks,
  scanDistFolder
} from '@capgo/seo-checker'

const config = {
  distPath: './dist',
  baseUrl: 'https://example.com',
  languages: ['en'],
  defaultLanguage: 'en',
}

// Scan the dist folder
const siteData = await scanDistFolder(config)

// Run checks on each page
const issues = []
for (const page of siteData.pages.values()) {
  issues.push(...runPageChecks(page, config, siteData))
}

// Check for duplicates
issues.push(...checkDuplicates(siteData, config))

console.log(`Found ${issues.length} SEO issues`)
```

## Rules Categories

The checker includes 1000+ rules across these categories:

- **Metadata**: Title, description, canonical, charset, lang
- **Content Length**: Title/description/heading length limits
- **Content Format**: Whitespace, encoding, caps, punctuation
- **Headings**: H1 presence, hierarchy, duplicates
- **Indexability**: Robots directives, canonical issues
- **Links**: Broken links, anchor text, nofollow usage
- **Images**: Alt text, file size, broken references
- **Social Tags**: OpenGraph, Twitter cards
- **International SEO**: Hreflang, lang attributes
- **Structured Data**: JSON-LD validation
- **Accessibility**: Landmarks, skip links, ARIA
- **Robots.txt & Sitemap**: Validation and consistency

## Output Formats

### Console (default)

Colored terminal output grouped by category with severity indicators.

### JSON

Machine-readable JSON with all issues and statistics.

### SARIF

Static Analysis Results Interchange Format for CI/CD integration.

## License

MIT
