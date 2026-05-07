#!/usr/bin/env node
/**
 * ideaByLunch Outreach Runner
 * Runs at 9am nightly on Hetzner. Reads queued leads from Redis,
 * sends email + SMS outreach with their preview URL.
 *
 * Cron: 0 9 * * * cd /opt/ideabylunch && node --env-file=.env scripts/outreach.js >> logs/outreach.log 2>&1
 */

const BASE_URL = process.env.APP_URL || 'https://ideabylunch.com'
const BATCH    = parseInt(process.env.OUTREACH_BATCH || '20', 10)  // max per run
const DELAY_MS = parseInt(process.env.OUTREACH_DELAY || '4000', 10) // between sends

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`) }

async function popQueue(count) {
  // Read up to `count` jobs from Redis list via Upstash REST API
  const url  = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) { log('No Redis configured — skipping'); return [] }

  const jobs = []
  for (let i = 0; i < count; i++) {
    const res = await fetch(`${url}/rpop/outreach:queue`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!data.result) break
    try { jobs.push(JSON.parse(data.result)) } catch {}
  }
  return jobs
}

async function sendOutreach(job) {
  const res = await fetch(`${BASE_URL}/api/hunt/outreach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessName: job.businessName,
      website:      job.website || null,
      phone:        job.phone || null,
      address:      job.address || null,
      city:         job.city || '',
      industry:     job.category || job.industry || '',
      previewUrl:   job.previewUrl,
      token:        job.token,
    }),
  })
  const data = await res.json()
  return data
}

async function run() {
  log('=== ideaByLunch Outreach starting ===')

  const jobs = await popQueue(BATCH)
  log(`Pulled ${jobs.length} jobs from queue`)

  let sent = 0, skipped = 0, failed = 0

  for (const job of jobs) {
    try {
      const result = await sendOutreach(job)
      if (result.status === 'sent' || result.status === 'sent_sms') {
        log(`✓ Sent to ${job.businessName} via ${result.status === 'sent_sms' ? 'SMS' : `email (${result.email})`}`)
        sent++
      } else if (result.status === 'skipped') {
        log(`⊘ Skipped ${job.businessName} — already contacted`)
        skipped++
      } else {
        log(`✗ No channel for ${job.businessName}: ${result.message || result.status}`)
        failed++
      }
    } catch (e) {
      log(`Error sending to ${job.businessName}: ${e.message}`)
      failed++
    }

    await new Promise(r => setTimeout(r, DELAY_MS))
  }

  log(`=== Done. Sent: ${sent}, Skipped: ${skipped}, No channel: ${failed} ===`)
}

run().catch(e => { log(`Fatal: ${e.message}`); process.exit(1) })
