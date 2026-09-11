#!/usr/bin/env npx tsx
// Pre-deploy environment validation — run as step 0 before every build.
// Exits non-zero on any missing, empty, or REPLACE_ME var.
// In preview/production, also warns when keys look like test/sandbox credentials
// that shouldn't be hitting production.

const IS_PROD = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production'
const IS_PREVIEW = process.env.VERCEL_ENV === 'preview'

// Required in all environments
const REQUIRED: string[] = [
  'OPENROUTER_API_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'CRON_SECRET',
  'JWT_SECRET',
  'NEXT_PUBLIC_APP_URL',
]

// Required only in production
const REQUIRED_PROD: string[] = [
  'ADMIN_SECRET',
  'ADMIN_EMAIL',
  'PLATFORM_TOKENS_KEY',
  'SENTRY_DSN',
]

// These vars must NOT contain test/sandbox values in production
const NO_TEST_IN_PROD: Array<{ key: string; testPatterns: RegExp[] }> = [
  { key: 'STRIPE_SECRET_KEY', testPatterns: [/^sk_test_/] },
  { key: 'STRIPE_PUBLISHABLE_KEY', testPatterns: [/^pk_test_/] },
]

let errors = 0
let warnings = 0

function fail(msg: string) {
  console.error(`❌  ${msg}`)
  errors++
}

function warn(msg: string) {
  console.warn(`⚠️   ${msg}`)
  warnings++
}

function checkVar(key: string, required = true) {
  const val = process.env[key]
  if (!val || val.trim() === '' || val === 'REPLACE_ME') {
    if (required) fail(`${key} is missing or set to REPLACE_ME`)
    return
  }
}

console.log(`\n🔍  Checking environment (${process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'local'})...\n`)

for (const key of REQUIRED) checkVar(key)

if (IS_PROD || IS_PREVIEW) {
  for (const key of REQUIRED_PROD) checkVar(key)
}

if (IS_PROD) {
  for (const { key, testPatterns } of NO_TEST_IN_PROD) {
    const val = process.env[key]
    if (val && testPatterns.some(p => p.test(val))) {
      fail(`${key} is a test/sandbox key — must use live key in production`)
    }
  }
}

// Warn if UPSTASH URL looks like a shared/default instance in preview
if (IS_PREVIEW && process.env.UPSTASH_REDIS_REST_URL === process.env.UPSTASH_REDIS_REST_URL_PROD) {
  warn('Preview is using the same Upstash instance as production — consider separate preview DB')
}

// Check for secrets accidentally exposed to browser
const BROWSER_SAFE_PREFIXES = ['NEXT_PUBLIC_']
const SENSITIVE_PATTERNS = [/SECRET/i, /PRIVATE/i, /TOKEN/i, /PASSWORD/i, /API_KEY/i]
for (const [key, val] of Object.entries(process.env)) {
  if (!BROWSER_SAFE_PREFIXES.some(p => key.startsWith(p))) continue
  if (SENSITIVE_PATTERNS.some(p => p.test(key)) && val) {
    warn(`${key} looks like a secret but is exposed to the browser via NEXT_PUBLIC_ prefix`)
  }
}

console.log('')
if (errors > 0) {
  console.error(`❌  ${errors} error(s) — deploy blocked\n`)
  process.exit(1)
} else if (warnings > 0) {
  console.warn(`✅  All required vars present (${warnings} warning(s))\n`)
} else {
  console.log(`✅  All required vars present\n`)
}
