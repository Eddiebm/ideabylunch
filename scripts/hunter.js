#!/usr/bin/env node
/**
 * ideaByLunch Lead Hunter
 * Runs nightly on Hetzner. Finds businesses without websites,
 * builds a free preview site for each, stores in Redis.
 *
 * Usage: node scripts/hunter.js --query "plumber" --city "Austin TX" --limit 20
 * Cron:  0 2 * * * cd /opt/ideabylunch && node scripts/hunter.js >> logs/hunter.log 2>&1
 */

const BASE_URL = process.env.APP_URL || 'https://ideabylunch.com'
const API_KEY  = process.env.HUNTER_SECRET || process.env.CRON_SECRET || ''

// Default targets — rotate these to avoid SerpAPI quota limits
const TARGETS = [
  // US — has domains, Hunter.io finds emails
  { query: 'plumber',            city: 'Austin TX' },
  { query: 'electrician',        city: 'Austin TX' },
  { query: 'hair salon',         city: 'Austin TX' },
  { query: 'auto repair',        city: 'Austin TX' },
  { query: 'cleaning service',   city: 'Austin TX' },
  // Ghana — primary market, high conversion expected
  { query: 'restaurant',         city: 'Accra Ghana' },
  { query: 'hair salon',         city: 'Accra Ghana' },
  { query: 'pharmacy',           city: 'Accra Ghana' },
  { query: 'tailoring',          city: 'Accra Ghana' },
  { query: 'auto repair',        city: 'Accra Ghana' },
  // Nigeria
  { query: 'restaurant',         city: 'Lagos Nigeria' },
  { query: 'hair salon',         city: 'Lagos Nigeria' },
  { query: 'fashion designer',   city: 'Lagos Nigeria' },
]

// Parse CLI args
const args = process.argv.slice(2)
const getArg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null }
const cliQuery  = getArg('--query')
const cliCity   = getArg('--city')
const cliLimit  = parseInt(getArg('--limit') || '5', 10)
const dryRun    = args.includes('--dry-run')

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`) }

async function scrapeLeads(query, city) {
  log(`Scraping: "${query}" in ${city}`)
  const res = await fetch(`${BASE_URL}/api/hunt/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-cron-secret': API_KEY },
    body: JSON.stringify({ industry: query, city, limit: 20 }),
  })
  if (!res.ok) {
    log(`Scrape failed: ${res.status} ${await res.text()}`)
    return []
  }
  const data = await res.json()
  // Include no-site, high (score<40), and medium (score<60) — medium has a domain so Hunter.io can find email
  const all = data.all || data.prospects || []
  return all.filter(b => b.priority === 'no-site' || b.priority === 'high' || b.priority === 'medium')
}

async function buildPreview(business) {
  log(`Building preview for: ${business.name}`)
  if (dryRun) { log(`[DRY RUN] Would build: ${business.name}`); return null }

  const res = await fetch(`${BASE_URL}/api/hunt/build`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-cron-secret': API_KEY },
    body: JSON.stringify({
      businessName: business.name,
      phone: business.phone,
      address: business.address,
      city: business.address?.split(',').slice(-2).join(',').trim() || '',
      category: business.category,
      industry: business.category,
    }),
  })
  if (!res.ok) {
    log(`Build failed for ${business.name}: ${res.status}`)
    return null
  }
  const data = await res.json()
  return data
}

async function storeOutreachJob(business, preview) {
  // Store in Redis via a lightweight API call so the outreach agent picks it up
  const res = await fetch(`${BASE_URL}/api/hunt/outreach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-cron-secret': API_KEY },
    body: JSON.stringify({
      action: 'queue',
      businessName: business.name,
      phone: business.phone,
      address: business.address,
      website: business.website || null,
      category: business.category,
      priority: business.priority,
      previewUrl: preview.previewUrl,
      token: preview.token,
      scheduledFor: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(), // 7am local
    }),
  })
  if (!res.ok) log(`Queue failed for ${business.name}: ${await res.text()}`)
}

async function run() {
  log('=== ideaByLunch Hunter starting ===')

  const targets = cliQuery
    ? [{ query: cliQuery, city: cliCity || 'Austin TX' }]
    : TARGETS.slice(0, Math.ceil(cliLimit / 5))

  let built = 0
  let failed = 0

  for (const target of targets) {
    try {
      const leads = await scrapeLeads(target.query, target.city)
      log(`Found ${leads.length} prospects for "${target.query}" in ${target.city}`)

      const toProcess = leads.slice(0, cliLimit || 5)

      for (const biz of toProcess) {
        try {
          const preview = await buildPreview(biz)
          if (preview?.previewUrl) {
            log(`✓ Preview ready: ${preview.previewUrl}`)
            await storeOutreachJob(biz, preview)
            built++
          } else {
            failed++
          }
          // Rate limit — don't hammer OpenRouter
          await new Promise(r => setTimeout(r, 3000))
        } catch (e) {
          log(`Error building ${biz.name}: ${e.message}`)
          failed++
        }
      }
    } catch (e) {
      log(`Error scraping ${target.query}: ${e.message}`)
    }

    // Pause between queries
    await new Promise(r => setTimeout(r, 5000))
  }

  log(`=== Done. Built: ${built}, Failed: ${failed} ===`)
}

run().catch(e => { log(`Fatal: ${e.message}`); process.exit(1) })
