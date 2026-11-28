/**
 * Seed the observatory_generations table from Project Galileo output.
 * Run: node scripts/seed-observatory.mjs
 * Requires DATABASE_URL in .env.local
 */

import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { neon } from '@neondatabase/serverless'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')

// Load DATABASE_URL from .env.local
const envFile = readFileSync(join(ROOT, '.env.local'), 'utf8')
const parseEnv = (src) => {
  const env = {}
  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=["']?([^"'\r\n]*)["']?/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}
const env = parseEnv(envFile)
const DATABASE_URL = process.env.DATABASE_URL || env['DATABASE_URL']
if (!DATABASE_URL) { console.error('DATABASE_URL not found (set env var or add to .env.local)'); process.exit(1) }

const sql = neon(DATABASE_URL)

// Load manifest
const manifestPath = join(ROOT, 'galileo_output', 'manifest.json')
if (!existsSync(manifestPath)) { console.error('manifest.json not found'); process.exit(1) }
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

const BRIEF_FULL = `Quarry Roast is a specialty coffee roastery in Bristol, UK.

Founded in 2019 by Priya Nair, a former UK Barista Champion, after she spent three years visiting farms in Ethiopia, Colombia, and Guatemala to understand what makes truly exceptional coffee.

What we do:
- Direct-trade sourcing from 12 smallholder farms
- Small-batch roasting (max 20kg per batch) in our Bristol railway arch
- Coffee subscription from £15/month (single origin, blends, or espresso)
- Wholesale supply to 40+ independent cafes across the UK
- Tasting room and brew bar open Wednesday–Sunday, 9am–5pm
- Barista training courses (beginner to professional level)

Our values: exceptional quality, transparent sourcing, long-term farmer relationships.
No investor pressure. We're growing deliberately and sustainably.

Target customers: coffee enthusiasts aged 25–45, home baristas, independent cafe owners.`

let seeded = 0
let skipped = 0

for (const result of manifest.results) {
  if (!result.filename) {
    console.log(`Skipping ${result.id} — no filename (failed generation)`)
    skipped++
    continue
  }

  const htmlPath = join(ROOT, 'galileo_output', result.filename)
  if (!existsSync(htmlPath)) {
    console.log(`Skipping ${result.id} — file not found: ${htmlPath}`)
    skipped++
    continue
  }

  const html = readFileSync(htmlPath, 'utf8')
  const id = `galileo-ws2-${result.id.toLowerCase()}`

  try {
    await sql`
      INSERT INTO observatory_generations (
        id, source, comparison_set, candidate_id, candidate_label, run_number,
        product_name, brief_text, model, temperature,
        input_tokens, output_tokens, cost_usd, elapsed_ms, html_bytes,
        html_content, generated_at
      ) VALUES (
        ${id}, 'galileo', 'galileo-ws2',
        ${result.candidateId}, ${result.label}, ${result.run},
        ${manifest.productName}, ${BRIEF_FULL}, ${result.model}, ${result.temperature ?? null},
        ${result.inputTokens ?? null}, ${result.outputTokens ?? null},
        ${result.costUSD ?? null}, ${result.elapsedMs ?? null}, ${html.length},
        ${html}, ${manifest.generatedAt}
      )
      ON CONFLICT (id) DO NOTHING
    `
    console.log(`✓ ${id}: ${result.label} run ${result.run} — ${(html.length / 1024).toFixed(0)}KB`)
    seeded++
  } catch (err) {
    console.error(`✗ ${id}: ${err.message}`)
    skipped++
  }
}

console.log(`\nSeeded ${seeded} generations, skipped ${skipped}`)
process.exit(0)
