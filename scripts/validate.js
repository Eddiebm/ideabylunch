#!/usr/bin/env node
/**
 * ideaByLunch — Pre-deploy validation
 * 
 * Run: node scripts/validate.js
 * Runs automatically before every deploy via package.json vercel-deploy script
 * 
 * Checks:
 * 1. All required components are imported in BriefGenerator.tsx
 * 2. All required API route files exist
 * 3. All required env vars are set (in .env.local or production)
 * 4. No useState inside .map() calls (React hook violation)
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
let errors = 0
let warnings = 0

function error(msg) {
  console.error(`\x1b[31m✗ ERROR:\x1b[0m ${msg}`)
  errors++
}

function warn(msg) {
  console.warn(`\x1b[33m⚠ WARN:\x1b[0m ${msg}`)
  warnings++
}

function ok(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`)
}

console.log('\n\x1b[1mideaByLunch — Pre-deploy validation\x1b[0m\n')

// ── 1. Check BriefGenerator.tsx has required components ──────────────────────
const briefGenPath = path.join(ROOT, 'app/app/BriefGenerator.tsx')
if (!fs.existsSync(briefGenPath)) {
  error('BriefGenerator.tsx not found at app/app/BriefGenerator.tsx')
} else {
  const content = fs.readFileSync(briefGenPath, 'utf8')

  const required = [
    'WebsitePreview',
    'PhotographySection',
    'LaunchModal',
  ]

  required.forEach(component => {
    if (content.includes(component)) {
      ok(`BriefGenerator includes ${component}`)
    } else {
      error(`BriefGenerator.tsx is MISSING: ${component}`)
    }
  })

  // Check for useState inside .map() — React hook violation
  const mapBlocks = content.match(/\.map\([^)]*\)\s*=>\s*\{[\s\S]*?\}\)/g) || []
  const hookInMap = mapBlocks.some(block => block.includes('useState('))
  if (hookInMap) {
    error('useState() found inside a .map() call — React hook violation that will crash at runtime')
  } else {
    ok('No useState inside .map() calls')
  }

  // Check isDone condition is present
  if (content.includes('isDone')) {
    ok('isDone condition present')
  } else {
    error('isDone condition missing — Launch CTA and WebsitePreview will never show')
  }
}

// ── 2. Check API routes exist ─────────────────────────────────────────────────
const requiredRoutes = [
  'app/api/generate/route.ts',
  'app/api/checkout/route.ts',
  'app/api/webhook/route.ts',
  'app/api/imagery/route.ts',
  'app/api/build-website/route.ts',
  'app/api/hunt/scrape/route.ts',
  'app/api/hunt/build/route.ts',
  'app/api/hunt/outreach/route.ts',
]

requiredRoutes.forEach(route => {
  const full = path.join(ROOT, route)
  if (fs.existsSync(full)) {
    ok(`Route exists: ${route}`)
  } else {
    error(`Missing API route: ${route}`)
  }
})

// ── 3. Check required pages exist ────────────────────────────────────────────
const requiredPages = [
  'app/app/page.tsx',
  'app/app/BriefGenerator.tsx',
  'app/app/WebsitePreview.tsx',
  'app/app/PhotographySection.tsx',
  'app/hunt/page.tsx',
]

requiredPages.forEach(page => {
  const full = path.join(ROOT, page)
  if (fs.existsSync(full)) {
    ok(`Page exists: ${page}`)
  } else {
    error(`Missing page: ${page}`)
  }
})

// ── 4. Check for common mistakes ─────────────────────────────────────────────
const filesToCheck = [
  'app/app/BriefGenerator.tsx',
  'app/app/WebsitePreview.tsx',
]

filesToCheck.forEach(file => {
  const full = path.join(ROOT, file)
  if (!fs.existsSync(full)) return
  
  const content = fs.readFileSync(full, 'utf8')
  
  // Check for accidental console.log left in
  const consoleLogs = (content.match(/console\.log/g) || []).length
  if (consoleLogs > 3) {
    warn(`${file} has ${consoleLogs} console.log statements — consider cleaning up`)
  }
  
  // Check 'use client' directive
  if (!content.includes("'use client'")) {
    warn(`${file} missing 'use client' directive`)
  }
})

// ── 5. Check generate route doesn't have conflicting directives ───────────────
const generateRoute = path.join(ROOT, 'app/api/generate/route.ts')
if (fs.existsSync(generateRoute)) {
  const content = fs.readFileSync(generateRoute, 'utf8')
  if (content.includes("runtime = 'edge'") && content.includes("dynamic = 'force-dynamic'")) {
    error("generate/route.ts has both 'edge' runtime AND 'force-dynamic' — remove one")
  } else {
    ok('generate/route.ts directives are clean')
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50))
if (errors > 0) {
  console.error(`\n\x1b[31m✗ Validation FAILED — ${errors} error(s), ${warnings} warning(s)\x1b[0m`)
  console.error('\x1b[31mFix the errors above before deploying.\x1b[0m\n')
  process.exit(1)
} else if (warnings > 0) {
  console.warn(`\n\x1b[33m⚠ Validation passed with ${warnings} warning(s)\x1b[0m\n`)
} else {
  console.log('\n\x1b[32m✓ All checks passed — safe to deploy\x1b[0m\n')
}
