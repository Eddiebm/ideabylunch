/**
 * PROJECT GALILEO — Controlled Creative Comparison
 * Generates websites from 5 candidates using identical brief.
 * Run: node galileo_generate.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const OUT = '/Users/eddiebannerman-menson/Documents/ideabylunch/galileo_output'
mkdirSync(OUT, { recursive: true })

// ── Load API key ─────────────────────────────────────────────────────────────
const envFile = readFileSync('/Users/eddiebannerman-menson/Documents/ideabylunch/.env.local', 'utf8')
// Parse env file properly: strip quotes, handle CRLF
const parseEnv = (src) => {
  const env = {}
  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=["']?([^"'\r\n]*)["']?/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}
const env = parseEnv(envFile)
const OPENROUTER_KEY = env['OPENROUTER_API_KEY']
if (!OPENROUTER_KEY) { console.error('OPENROUTER_API_KEY not found'); process.exit(1) }
console.log(`Key prefix: ${OPENROUTER_KEY.slice(0, 10)}... (length ${OPENROUTER_KEY.length})`)

// ── Test brief ────────────────────────────────────────────────────────────────
// Verified against IdeaByLunch product: generates a complete HTML website from a founder brief.
// Pricing: Starter from GHS 300 / USD $29. Product delivers a hosted website, not a template.
const PRODUCT_NAME = 'Quarry Roast'
const BRIEF = `
Quarry Roast is a specialty coffee roastery in Bristol, UK.

Founded in 2019 by Priya Nair, a former UK Barista Champion, after she spent three years visiting farms
in Ethiopia, Colombia, and Guatemala to understand what makes truly exceptional coffee.

What we do:
- Direct-trade sourcing from 12 smallholder farms
- Small-batch roasting (max 20kg per batch) in our Bristol railway arch
- Coffee subscription from £15/month (single origin, blends, or espresso)
- Wholesale supply to 40+ independent cafes across the UK
- Tasting room and brew bar open Wednesday–Sunday, 9am–5pm
- Barista training courses (beginner to professional level)

Our values: exceptional quality, transparent sourcing, long-term farmer relationships.
No investor pressure. We're growing deliberately and sustainably.

Target customers: coffee enthusiasts aged 25–45, home baristas, independent cafe owners.
`.trim()

// ── Baseline prompt (current IdeaByLunch production) ─────────────────────────
const BASELINE_SYSTEM = `You are a world-class frontend designer and art director — top 0.1% of your craft. You build sites that look like they cost $100,000.

VISUAL STANDARD:
- Stripe-level polish. Modern premium SaaS aesthetic.
- Inter or Geist font via Google Fonts @import. Tight typographic hierarchy: 88px hero → 48px section → 20px body.
- Generous whitespace. 1440px max-width. Precise 8pt grid.
- Monochrome base palette with ONE vivid accent color derived from the product's industry/personality.
- Soft shadows (0 10px 40px rgba(0,0,0,0.08)). Rounded-xl cards. Subtle gradients.
- Micro-interactions: hover lifts (transform: translateY(-2px)), fade-in on scroll (IntersectionObserver), smooth button transitions (0.2s ease).

OUTPUT RULES:
- Start DIRECTLY with <!DOCTYPE html>. No markdown. No backticks. No explanation before or after.
- Inline ALL CSS in <style> and ALL JS in <script>. Zero external dependencies except Google Fonts.
- Write specific, compelling copy — zero lorem ipsum. Every word must reflect the actual product.

REQUIRED PAGE SECTIONS (build every single one):
1. NAVIGATION — logo + 4 nav links + primary CTA button. Sticky, with backdrop-filter blur on scroll.
2. HERO — full-bleed gradient. H1 ≤ 8 words. Subheadline 1–2 sentences. Two CTA buttons (primary + secondary). Trust signal row (3–4 stats or logos).
3. PROBLEM — "Why this exists." 2–3 sentences of pain. 3 pain point cards.
4. SOLUTION / HOW IT WORKS — 3-step process with numbered steps, icons, and short descriptions.
5. FEATURES — 6-card grid. Each card: icon + bold label + 2-sentence description.
6. SOCIAL PROOF — 3 placeholder testimonial cards clearly marked [PLACEHOLDER]. Do not fabricate.
7. PRICING — 2–3 tier cards. Highlight the recommended tier. Include feature lists and CTA per tier.
8. FAQ — 5–6 accordion-style questions with answers. Use <details>/<summary>.
9. FINAL CTA — dark background section. Bold closing headline. Single primary CTA button.
10. FOOTER — brand name + tagline, 3–4 link columns, social icons (SVG), copyright line.`

// ── Visual-first prompt (OpenAI GPT-4o candidate with visual intelligence) ───
const VISUAL_FIRST_SYSTEM = `You are a world-class creative director and frontend engineer. Your brief: build a website that stops people from scrolling. Not a template. A specific, deeply considered visual identity for this exact brand.

CREATIVE MANDATE:
- Choose a color palette that feels true to THIS brand — not generic "premium". Coffee: think roast warmth, terroir, harvest light.
- Typography: pick faces that express the brand's character. Load from Google Fonts. Pair a display face with a body face.
- Build expressive SVG illustrations inline — a roastery scene, coffee bean cross-sections, a world map showing farm origins, a roast dial. Original, specific, beautiful.
- Design the hero as a full-screen immersive moment, not a headline + button on a gradient.
- Use CSS animation to bring the page to life: a roasting drum that spins slowly, beans falling, steam rising from a cup.
- Every section should feel designed for Quarry Roast specifically. Zero generic SaaS patterns.

TECHNICAL REQUIREMENTS:
- Complete, self-contained HTML. All CSS in <style>. All JS in <script>. All SVG inline.
- Google Fonts only for external resources.
- Fully responsive. Mobile-first. Works at 320px and 1440px.
- Start DIRECTLY with <!DOCTYPE html>. No markdown, no code fences, no explanation.

SECTIONS:
1. Hero — full viewport, immersive. Brand statement, not just a headline.
2. Origin story — Priya's journey, the farms. Personal, specific.
3. The coffee — what makes it different. Sensory language.
4. Subscription — pricing tiers with personality.
5. Wholesale — for cafe owners.
6. Tasting room — visit us, hours, location feel.
7. Footer — minimal, deliberate.`

const VISUAL_FIRST_USER = `Brand: Quarry Roast
${BRIEF}

Build the most visually distinctive, brand-true website you can. Make every pixel earn its place.`

// ── Candidates ────────────────────────────────────────────────────────────────
const CANDIDATES = [
  {
    id: 'A',
    label: 'Baseline (Gemini 2.5 Flash)',
    model: 'google/gemini-2.5-flash',
    temperature: 0.2,
    system: BASELINE_SYSTEM,
    user: `PRODUCT NAME: ${PRODUCT_NAME}\nPLAN TIER: starter\nPHOTOS:\n(no photos provided — use a bold gradient hero and SVG illustrations throughout)\n\nFOUNDER BRIEF:\n${BRIEF}\n\nBuild the complete, production-ready website now. Include every required section. Do not stop early.`,
  },
  {
    id: 'B',
    label: 'Claude Fable 5.2',
    model: 'anthropic/claude-fable-5-2',
    temperature: 0.6,
    system: BASELINE_SYSTEM,
    user: `PRODUCT NAME: ${PRODUCT_NAME}\nPLAN TIER: starter\nPHOTOS:\n(no photos provided — use a bold gradient hero and SVG illustrations throughout)\n\nFOUNDER BRIEF:\n${BRIEF}\n\nBuild the complete, production-ready website now. Include every required section. Do not stop early.`,
  },
  {
    id: 'C',
    label: 'GPT-4o (standard prompt)',
    model: 'openai/gpt-4o',
    temperature: 0.6,
    system: BASELINE_SYSTEM,
    user: `PRODUCT NAME: ${PRODUCT_NAME}\nPLAN TIER: starter\nPHOTOS:\n(no photos provided — use a bold gradient hero and SVG illustrations throughout)\n\nFOUNDER BRIEF:\n${BRIEF}\n\nBuild the complete, production-ready website now. Include every required section. Do not stop early.`,
  },
  {
    id: 'D',
    label: 'Gemini 2.5 Pro',
    model: 'google/gemini-2.5-pro',
    temperature: 0.4,
    system: BASELINE_SYSTEM,
    user: `PRODUCT NAME: ${PRODUCT_NAME}\nPLAN TIER: starter\nPHOTOS:\n(no photos provided — use a bold gradient hero and SVG illustrations throughout)\n\nFOUNDER BRIEF:\n${BRIEF}\n\nBuild the complete, production-ready website now. Include every required section. Do not stop early.`,
  },
  {
    id: 'E',
    label: 'GPT-4o Visual-first',
    model: 'openai/gpt-4o',
    temperature: 0.9,
    system: VISUAL_FIRST_SYSTEM,
    user: VISUAL_FIRST_USER,
  },
]

// ── Generation function ────────────────────────────────────────────────────────
async function generate(candidate, run) {
  const startMs = Date.now()
  console.log(`→ Generating ${candidate.id}${run} [${candidate.model}]...`)

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://ideabylunch.com',
      'X-Title': 'PROJECT GALILEO',
    },
    body: JSON.stringify({
      model: candidate.model,
      max_tokens: 32000,
      temperature: candidate.temperature,
      messages: [
        { role: 'system', content: candidate.system },
        { role: 'user', content: candidate.user },
      ],
    }),
  })

  const elapsedMs = Date.now() - startMs

  if (!res.ok) {
    const err = await res.text()
    console.error(`✗ ${candidate.id}${run} failed (${res.status}):`, err.slice(0, 300))
    return { id: `${candidate.id}${run}`, error: err, elapsedMs, model: candidate.model }
  }

  const data = await res.json()
  const usage = data.usage || {}
  let html = data?.choices?.[0]?.message?.content || ''
  html = html.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim()

  // Cost tracking (OpenRouter reported usage)
  const inputTokens = usage.prompt_tokens || 0
  const outputTokens = usage.completion_tokens || 0

  // Approximate cost (USD per 1M tokens — conservative estimates for budget tracking)
  const COST_PER_M = {
    'google/gemini-2.5-flash': { in: 0.075, out: 0.30 },
    'anthropic/claude-fable-5-2': { in: 3.0, out: 15.0 },
    'openai/gpt-4o': { in: 2.5, out: 10.0 },
    'google/gemini-2.5-pro': { in: 1.25, out: 10.0 },
  }
  const rates = COST_PER_M[candidate.model] || { in: 5, out: 15 }
  const costUSD = (inputTokens * rates.in + outputTokens * rates.out) / 1_000_000

  const hasDoctype = html.includes('<!DOCTYPE')
  const filename = `${candidate.id}${run}.html`
  const path = join(OUT, filename)

  if (hasDoctype) {
    writeFileSync(path, html)
    console.log(`✓ ${candidate.id}${run}: ${(html.length / 1024).toFixed(0)}KB | ${outputTokens} tokens | $${costUSD.toFixed(4)} | ${(elapsedMs/1000).toFixed(1)}s`)
  } else {
    console.error(`✗ ${candidate.id}${run}: no <!DOCTYPE in output — writing raw for inspection`)
    writeFileSync(path + '.raw.txt', html)
  }

  return {
    id: `${candidate.id}${run}`,
    candidateId: candidate.id,
    label: candidate.label,
    model: candidate.model,
    temperature: candidate.temperature,
    run,
    hasDoctype,
    htmlBytes: html.length,
    outputTokens,
    inputTokens,
    costUSD,
    elapsedMs,
    filename: hasDoctype ? filename : null,
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('PROJECT GALILEO — Controlled Creative Comparison')
  console.log('Brief: Quarry Roast (specialty coffee roastery, Bristol UK)')
  console.log('Candidates:', CANDIDATES.map(c => `${c.id}:${c.model}`).join(', '))
  console.log()

  // Run all candidates, 2 generations each, in parallel (batched to avoid rate limits)
  const batch1 = CANDIDATES.map(c => generate(c, '1'))
  const results1 = await Promise.all(batch1)

  console.log('\n--- Run 2 starting ---\n')
  // Small delay between batches
  await new Promise(r => setTimeout(r, 2000))

  const batch2 = CANDIDATES.map(c => generate(c, '2'))
  const results2 = await Promise.all(batch2)

  const all = [...results1, ...results2]

  // Summary
  const successful = all.filter(r => r.filename)
  const failed = all.filter(r => !r.filename)
  const totalCost = all.reduce((s, r) => s + (r.costUSD || 0), 0)

  console.log('\n═══ RESULTS ═══')
  console.log(`Generated: ${successful.length}/${all.length}`)
  console.log(`Failed: ${failed.length}`)
  console.log(`Total cost: $${totalCost.toFixed(4)}`)
  if (failed.length) {
    console.log('Failed IDs:', failed.map(f => f.id).join(', '))
  }

  // Write manifest
  const manifest = {
    generatedAt: new Date().toISOString(),
    brief: BRIEF.slice(0, 200) + '...',
    productName: PRODUCT_NAME,
    totalCostUSD: totalCost,
    results: all,
  }
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`\nManifest written to ${OUT}/manifest.json`)
  console.log(`HTML files in ${OUT}/`)
}

main().catch(err => { console.error(err); process.exit(1) })
