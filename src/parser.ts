/**
 * HTML Parser for SEO Checker
 * Optimized for maximum performance with parallel processing
 */

import type { PageData, SEOCheckerConfig, SiteData } from './types.js'
import * as fs from 'node:fs'
import * as fsp from 'node:fs/promises'
import * as path from 'node:path'
import { load } from 'cheerio'
import { getExpectedHostname, getMainDomain } from './domain.js'

// Pre-compiled URL for faster hostname comparison
let baseHostname: string | null = null
let mainDomain: string | null = null

/**
 * Parse a single HTML file and extract SEO data
 * Optimized version with minimal redundant operations
 */
export function parseHtmlFile(
  filePath: string,
  html: string,
  distPath: string,
  config: SEOCheckerConfig,
): PageData {
  const $ = load(html, { xml: false })
  const relativePath = path.relative(distPath, filePath)

  // Determine the URL from the file path
  const urlPath = relativePath.replace(/index\.html$/, '').replace(/\.html$/, '')
  const url = `${config.baseUrl}/${urlPath}`.replace(/\/+$/, '') || config.baseUrl

  // Cache base hostname and main domain for URL checks
  if (baseHostname === null) {
    baseHostname = getExpectedHostname(config)
    mainDomain = getMainDomain(config)
  }

  // Extract headings with their order - single pass
  const headingOrder: PageData['headingOrder'] = []
  const h1s: string[] = []
  const h2s: string[] = []
  const h3s: string[] = []
  const h4s: string[] = []
  const h5s: string[] = []
  const h6s: string[] = []

  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    const tagName = ($(el).prop('tagName') || '').toLowerCase()
    const level = Number.parseInt(tagName.charAt(1), 10)
    const text = $(el).text().trim()

    if (!Number.isNaN(level)) {
      headingOrder.push({ level, text })
      switch (level) {
        case 1:
          h1s.push(text)
          break
        case 2:
          h2s.push(text)
          break
        case 3:
          h3s.push(text)
          break
        case 4:
          h4s.push(text)
          break
        case 5:
          h5s.push(text)
          break
        case 6:
          h6s.push(text)
          break
      }
    }
  })

  // Extract links - optimized
  const links: PageData['links'] = []
  $('a[href]').each((_, el) => {
    const $el = $(el)
    const href = $el.attr('href') || ''

    // Fast path classification
    let isInternal = false
    let isExternal = false

    if (href && !href.startsWith('#') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
        isInternal = true
      }
      else if (href.startsWith('http://') || href.startsWith('https://')) {
        try {
          const urlHost = new URL(href).hostname.toLowerCase()
          // Check if the hostname matches the expected hostname exactly
          // or if the normalized hostname (without www) matches the main domain
          const normalizedUrlHost = urlHost.replace(/^www\./, '')

          if (urlHost === baseHostname) {
            // Exact match with baseUrl hostname
            isInternal = true
          }
          else if (mainDomain && normalizedUrlHost === mainDomain) {
            // Same domain but different www prefix - still considered internal
            // but may trigger domain mismatch warnings elsewhere
            isInternal = true
          }
          else if (mainDomain && normalizedUrlHost.endsWith(`.${mainDomain}`)) {
            // Subdomain of main domain - considered external for link purposes
            // (e.g., blog.example.com when main domain is example.com)
            isExternal = true
          }
          else {
            isExternal = true
          }
        }
        catch {
          // Invalid URL
        }
      }
    }

    links.push({
      href,
      text: $el.text().trim(),
      ariaLabel: $el.attr('aria-label'),
      title: $el.attr('title'),
      rel: $el.attr('rel'),
      target: $el.attr('target'),
      isInternal,
      isExternal,
    })
  })

  // Extract images
  const images: PageData['images'] = []
  $('img').each((_, el) => {
    const $el = $(el)
    images.push({
      src: $el.attr('src') || '',
      alt: $el.attr('alt'),
      width: $el.attr('width'),
      height: $el.attr('height'),
    })
  })

  // Extract videos
  const videos: PageData['videos'] = []
  $('video').each((_, el) => {
    const $el = $(el)
    videos.push({
      src: $el.attr('src') || $el.find('source').first().attr('src'),
      poster: $el.attr('poster'),
    })
  })

  // Check for favicon
  const hasFavicon = $('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').length > 0

  // Extract form inputs without labels
  const formInputsWithoutLabels: PageData['formInputsWithoutLabels'] = []
  const labelForIds = new Set<string>()

  // Collect all label 'for' attributes
  $('label[for]').each((_, el) => {
    const forAttr = $(el).attr('for')
    if (forAttr)
      labelForIds.add(forAttr)
  })

  // Check inputs (except hidden, submit, button, reset, image types)
  $('input').each((_, el) => {
    const $el = $(el)
    const inputType = $el.attr('type') || 'text'

    // Skip inputs that don't need labels
    if (['hidden', 'submit', 'button', 'reset', 'image'].includes(inputType))
      return

    const id = $el.attr('id')
    const hasForLabel = id && labelForIds.has(id)
    const hasWrappingLabel = $el.closest('label').length > 0
    const hasAriaLabel = $el.attr('aria-label') && $el.attr('aria-label')!.trim() !== ''
    const hasAriaLabelledBy = $el.attr('aria-labelledby') && $el.attr('aria-labelledby')!.trim() !== ''
    const hasTitle = $el.attr('title') && $el.attr('title')!.trim() !== ''

    if (!hasForLabel && !hasWrappingLabel && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
      formInputsWithoutLabels.push({
        type: 'input',
        inputType,
        id,
        name: $el.attr('name'),
      })
    }
  })

  // Check selects
  $('select').each((_, el) => {
    const $el = $(el)
    const id = $el.attr('id')
    const hasForLabel = id && labelForIds.has(id)
    const hasWrappingLabel = $el.closest('label').length > 0
    const hasAriaLabel = $el.attr('aria-label') && $el.attr('aria-label')!.trim() !== ''
    const hasAriaLabelledBy = $el.attr('aria-labelledby') && $el.attr('aria-labelledby')!.trim() !== ''
    const hasTitle = $el.attr('title') && $el.attr('title')!.trim() !== ''

    if (!hasForLabel && !hasWrappingLabel && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
      formInputsWithoutLabels.push({
        type: 'select',
        id,
        name: $el.attr('name'),
      })
    }
  })

  // Check textareas
  $('textarea').each((_, el) => {
    const $el = $(el)
    const id = $el.attr('id')
    const hasForLabel = id && labelForIds.has(id)
    const hasWrappingLabel = $el.closest('label').length > 0
    const hasAriaLabel = $el.attr('aria-label') && $el.attr('aria-label')!.trim() !== ''
    const hasAriaLabelledBy = $el.attr('aria-labelledby') && $el.attr('aria-labelledby')!.trim() !== ''
    const hasTitle = $el.attr('title') && $el.attr('title')!.trim() !== ''

    if (!hasForLabel && !hasWrappingLabel && !hasAriaLabel && !hasAriaLabelledBy && !hasTitle) {
      formInputsWithoutLabels.push({
        type: 'textarea',
        id,
        name: $el.attr('name'),
      })
    }
  })

  // Extract JSON-LD
  const jsonLd: unknown[] = []
  $('script[type="application/ld+json"]').each((_, el) => {
    const content = $(el).html()
    if (content) {
      try {
        jsonLd.push(JSON.parse(content))
      }
      catch {
        jsonLd.push({ _parseError: true, _raw: content })
      }
    }
  })

  // Extract hreflangs
  const hreflangs: PageData['hreflangs'] = []
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const $el = $(el)
    hreflangs.push({
      lang: $el.attr('hreflang') || '',
      url: $el.attr('href') || '',
    })
  })

  // Extract element IDs
  const elementIds: string[] = []
  $('[id]').each((_, el) => {
    const id = $(el).attr('id')
    if (id)
      elementIds.push(id)
  })

  // Calculate word count - fast path
  const mainText = $('main').text() || $('body').text()
  const wordCount = mainText.split(/\s+/).filter(w => w.length > 0).length

  // Get charset
  let charset = $('meta[charset]').attr('charset')
  if (!charset) {
    const httpEquiv = $('meta[http-equiv="Content-Type"]').attr('content')
    if (httpEquiv) {
      const match = httpEquiv.match(/charset=([^\s;]+)/i)
      if (match)
        charset = match[1]
    }
  }

  // Determine if page is an article and has author info
  const ogType = $('meta[property="og:type"]').attr('content')?.trim()
  const ogArticleAuthor = $('meta[property="article:author"]').attr('content')?.trim()
  const isArticle = ogType === 'article'
    || jsonLd.some((data) => {
      if (typeof data === 'object' && data !== null) {
        const obj = data as Record<string, unknown>
        const schemaType = obj['@type']
        if (Array.isArray(schemaType)) {
          return schemaType.some(t => ['Article', 'NewsArticle', 'BlogPosting', 'TechArticle', 'ScholarlyArticle'].includes(t as string))
        }
        return ['Article', 'NewsArticle', 'BlogPosting', 'TechArticle', 'ScholarlyArticle'].includes(schemaType as string)
      }
      return false
    })

  // Check for author info in various places
  const hasAuthorInSchema = jsonLd.some((data) => {
    if (typeof data === 'object' && data !== null) {
      const obj = data as Record<string, unknown>
      return 'author' in obj && obj.author !== null && obj.author !== undefined
    }
    return false
  })
  const hasAuthorInfo = !!(ogArticleAuthor || hasAuthorInSchema)

  return {
    filePath,
    relativePath,
    url,
    html,
    title: $('title').first().text().trim() || undefined,
    metaDescription: $('meta[name="description"]').attr('content')?.trim(),
    metaRobots: $('meta[name="robots"]').attr('content')?.trim(),
    canonical: $('link[rel="canonical"]').attr('href')?.trim(),
    htmlLang: $('html').attr('lang')?.trim(),
    charset,
    h1s,
    h2s,
    h3s,
    h4s,
    h5s,
    h6s,
    headingOrder,
    og: {
      title: $('meta[property="og:title"]').attr('content')?.trim(),
      description: $('meta[property="og:description"]').attr('content')?.trim(),
      image: $('meta[property="og:image"]').attr('content')?.trim(),
      url: $('meta[property="og:url"]').attr('content')?.trim(),
      type: $('meta[property="og:type"]').attr('content')?.trim(),
      siteName: $('meta[property="og:site_name"]').attr('content')?.trim(),
      locale: $('meta[property="og:locale"]').attr('content')?.trim(),
      imageWidth: $('meta[property="og:image:width"]').attr('content')?.trim(),
      imageHeight: $('meta[property="og:image:height"]').attr('content')?.trim(),
      imageAlt: $('meta[property="og:image:alt"]').attr('content')?.trim(),
      imageType: $('meta[property="og:image:type"]').attr('content')?.trim(),
      articlePublishedTime: $('meta[property="article:published_time"]').attr('content')?.trim(),
      articleAuthor: $('meta[property="article:author"]').attr('content')?.trim(),
    },
    twitter: {
      card: $('meta[name="twitter:card"]').attr('content')?.trim(),
      title: $('meta[name="twitter:title"]').attr('content')?.trim(),
      description: $('meta[name="twitter:description"]').attr('content')?.trim(),
      image: $('meta[name="twitter:image"]').attr('content')?.trim(),
      site: $('meta[name="twitter:site"]').attr('content')?.trim(),
      creator: $('meta[name="twitter:creator"]').attr('content')?.trim(),
      imageAlt: $('meta[name="twitter:image:alt"]').attr('content')?.trim(),
    },
    ogImageCount: $('meta[property="og:image"]').length,
    hreflangs,
    links,
    images,
    videos,
    formInputsWithoutLabels,
    hasFavicon,
    isArticle,
    hasAuthorInfo,
    jsonLd,
    wordCount,
    hasDoctype: html.slice(0, 100).toLowerCase().includes('<!doctype html'),
    hasMainLandmark: $('main').length > 0 || $('[role="main"]').length > 0,
    viewport: $('meta[name="viewport"]').attr('content')?.trim(),
    elementIds,
  }
}

/**
 * Scan all HTML files in the dist folder - PARALLEL VERSION
 */
export async function scanDistFolder(config: SEOCheckerConfig): Promise<SiteData> {
  const distPath = config.distPath
  const pages = new Map<string, PageData>()
  const titles = new Map<string, string[]>()
  const descriptions = new Map<string, string[]>()
  const h1s = new Map<string, string[]>()
  const canonicals = new Map<string, string[]>()
  const imageFiles = new Map<string, { path: string, size: number }>()

  const MIN_FILE_SIZE = 500
  const MAX_REDIRECT_SIZE = 1000

  // Find all files in parallel
  const [htmlFiles, allImageFiles] = await Promise.all([
    findFilesParallel(distPath, '.html'),
    findFilesParallel(distPath, /\.(jpg|jpeg|png|gif|webp|svg|avif)$/i),
  ])

  // Get file stats in parallel batches
  const BATCH_SIZE = 500
  const htmlFilesWithStats: { path: string, size: number, content?: string }[] = []

  for (let i = 0; i < htmlFiles.length; i += BATCH_SIZE) {
    const batch = htmlFiles.slice(i, i + BATCH_SIZE)
    const statsPromises = batch.map(async (filePath) => {
      try {
        const stats = await fsp.stat(filePath)
        if (stats.size < MIN_FILE_SIZE)
          return null

        // Read content for small files to check for redirects
        if (stats.size < MAX_REDIRECT_SIZE) {
          const content = await fsp.readFile(filePath, 'utf-8')
          if (content.includes('http-equiv="refresh"') || content.includes('http-equiv=\'refresh\'')) {
            return null
          }
          return { path: filePath, size: stats.size, content }
        }

        return { path: filePath, size: stats.size }
      }
      catch {
        return null
      }
    })

    const results = await Promise.all(statsPromises)
    htmlFilesWithStats.push(...results.filter((r): r is NonNullable<typeof r> => r !== null))
  }

  // Parse HTML files in parallel batches
  const PARSE_BATCH_SIZE = 200

  for (let i = 0; i < htmlFilesWithStats.length; i += PARSE_BATCH_SIZE) {
    const batch = htmlFilesWithStats.slice(i, i + PARSE_BATCH_SIZE)

    const parsePromises = batch.map(async (file) => {
      try {
        const html = file.content || await fsp.readFile(file.path, 'utf-8')
        return parseHtmlFile(file.path, html, distPath, config)
      }
      catch {
        return null
      }
    })

    const parsedPages = await Promise.all(parsePromises)

    for (const pageData of parsedPages) {
      if (!pageData)
        continue

      pages.set(pageData.relativePath, pageData)

      // Track duplicates
      if (pageData.title) {
        const existing = titles.get(pageData.title) || []
        existing.push(pageData.relativePath)
        titles.set(pageData.title, existing)
      }

      if (pageData.metaDescription) {
        const existing = descriptions.get(pageData.metaDescription) || []
        existing.push(pageData.relativePath)
        descriptions.set(pageData.metaDescription, existing)
      }

      for (const h1 of pageData.h1s) {
        const existing = h1s.get(h1) || []
        existing.push(pageData.relativePath)
        h1s.set(h1, existing)
      }

      if (pageData.canonical) {
        const existing = canonicals.get(pageData.canonical) || []
        existing.push(pageData.relativePath)
        canonicals.set(pageData.canonical, existing)
      }
    }
  }

  // Process image files in parallel
  for (let i = 0; i < allImageFiles.length; i += BATCH_SIZE) {
    const batch = allImageFiles.slice(i, i + BATCH_SIZE)
    const statsPromises = batch.map(async (filePath) => {
      try {
        const stats = await fsp.stat(filePath)
        const relativePath = path.relative(distPath, filePath)
        return { relativePath, path: filePath, size: stats.size }
      }
      catch {
        return null
      }
    })

    const results = await Promise.all(statsPromises)
    for (const result of results) {
      if (result) {
        imageFiles.set(result.relativePath, { path: result.path, size: result.size })
      }
    }
  }

  return {
    pages,
    titles,
    descriptions,
    h1s,
    canonicals,
    imageFiles,
  }
}

/**
 * Find files matching a pattern - parallel directory traversal
 */
async function findFilesParallel(dir: string, pattern: string | RegExp): Promise<string[]> {
  const files: string[] = []
  const isRegex = pattern instanceof RegExp
  const ext = typeof pattern === 'string' ? pattern : null

  async function walk(currentDir: string): Promise<void> {
    let entries: fs.Dirent[]
    try {
      entries = await fsp.readdir(currentDir, { withFileTypes: true })
    }
    catch {
      return
    }

    const subdirs: Promise<void>[] = []

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory()) {
        subdirs.push(walk(fullPath))
      }
      else if (entry.isFile()) {
        const matches = isRegex
          ? (pattern as RegExp).test(entry.name)
          : entry.name.endsWith(ext!)

        if (matches) {
          files.push(fullPath)
        }
      }
    }

    // Process subdirectories in parallel
    await Promise.all(subdirs)
  }

  await walk(dir)
  return files
}

// File existence cache for performance
const fileExistsCache = new Map<string, boolean>()

/**
 * Check if a file exists at the given path (cached)
 */
export function fileExists(filePath: string): boolean {
  const cached = fileExistsCache.get(filePath)
  if (cached !== undefined)
    return cached

  try {
    fs.accessSync(filePath, fs.constants.F_OK)
    fileExistsCache.set(filePath, true)
    return true
  }
  catch {
    fileExistsCache.set(filePath, false)
    return false
  }
}

/**
 * Clear file exists cache (useful between runs)
 */
export function clearFileExistsCache(): void {
  fileExistsCache.clear()
}

/**
 * Clear domain hostname cache (useful between runs or when config changes)
 */
export function clearDomainCache(): void {
  baseHostname = null
  mainDomain = null
}

/**
 * Resolve a relative URL to a file path
 */
export function resolveToFilePath(
  href: string,
  currentPagePath: string,
  distPath: string,
): string | null {
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
    return null
  }

  // Remove query string and fragment
  const cleanHref = href.split('?')[0].split('#')[0]

  if (cleanHref.startsWith('/')) {
    const targetPath = path.join(distPath, cleanHref)
    if (fileExists(targetPath))
      return targetPath
    if (fileExists(path.join(targetPath, 'index.html')))
      return path.join(targetPath, 'index.html')
    if (fileExists(`${targetPath}.html`))
      return `${targetPath}.html`
    return targetPath
  }

  const currentDir = path.dirname(path.join(distPath, currentPagePath))
  const targetPath = path.resolve(currentDir, cleanHref)

  if (fileExists(targetPath))
    return targetPath
  if (fileExists(path.join(targetPath, 'index.html')))
    return path.join(targetPath, 'index.html')
  if (fileExists(`${targetPath}.html`))
    return `${targetPath}.html`

  return targetPath
}
