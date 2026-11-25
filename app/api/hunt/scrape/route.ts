// ── Types ─────────────────────────────────────────────────────────────────────
export interface Business {
  name: string
  phone: string | null
  address: string | null
  website: string | null
  rating: number | null
  reviews: number | null
  category: string | null
  placeId: string | null
  mapsUrl: string | null
}

// ── Score a website's quality (0-100, lower = worse = better prospect) ────────
async function scoreWebsite(url: string): Promise<{
  score: number
  reasons: string[]
  screenshotable: boolean
}> {
  if (!url) return { score: 0, reasons: ['No website'], screenshotable: false }

  try {
    // Use Google PageSpeed Insights API (free, no key needed for basic)
    const psUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&category=performance&category=seo&category=best-practices`
    const res = await fetch(psUrl)

    if (!res.ok) {
      // Site exists but can't be scored — still a prospect
      return { score: 30, reasons: ['Site exists but could not be analyzed'], screenshotable: true }
    }

    const data = await res.json()
    const cats = data.lighthouseResult?.categories || {}
    const perf = Math.round((cats.performance?.score || 0) * 100)
    const seo = Math.round((cats.seo?.score || 0) * 100)
    const bp = Math.round((cats['best-practices']?.score || 0) * 100)
    const overall = Math.round((perf + seo + bp) / 3)

    const reasons: string[] = []
    if (perf < 50) reasons.push(`Slow load speed (${perf}/100)`)
    if (seo < 60) reasons.push(`Poor SEO (${seo}/100)`)
    if (bp < 60) reasons.push(`Outdated practices (${bp}/100)`)

    // Check for mobile friendliness
    const viewport = data.lighthouseResult?.audits?.['viewport']?.score
    if (viewport === 0) reasons.push('Not mobile-friendly')

    // Check for HTTPS
    const https = data.lighthouseResult?.audits?.['is-on-https']?.score
    if (https === 0) reasons.push('No HTTPS')

    return { score: overall, reasons, screenshotable: true }
  } catch {
    return { score: 25, reasons: ['Unable to analyze — likely outdated'], screenshotable: false }
  }
}

// ── Main scrape handler ───────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { city, industry, limit = 50 } = await req.json()
    const serpKey = process.env.SERPAPI_KEY

    if (!serpKey) {
      return Response.json({ error: 'SERPAPI_KEY not configured' }, { status: 500 })
    }

    if (!city || !industry) {
      return Response.json({ error: 'city and industry required' }, { status: 400 })
    }

    const query = `${industry} in ${city}`
    console.log(`Scraping: "${query}"`)

    // ── Step 1: Search Google Maps via SerpAPI ────────────────────────────────
    const serpUrl = new URL('https://serpapi.com/search.json')
    serpUrl.searchParams.set('engine', 'google_maps')
    serpUrl.searchParams.set('q', query)
    serpUrl.searchParams.set('type', 'search')
    serpUrl.searchParams.set('api_key', serpKey)
    serpUrl.searchParams.set('num', String(Math.min(limit, 60)))

    const serpRes = await fetch(serpUrl.toString())
    if (!serpRes.ok) {
      const err = await serpRes.text()
      return Response.json({ error: `SerpAPI error: ${err}` }, { status: 500 })
    }

    const serpData = await serpRes.json()
    const results = serpData.local_results || []

    if (!results.length) {
      return Response.json({ error: 'No results found', businesses: [] })
    }

    // ── Step 2: Extract business data ─────────────────────────────────────────
    const businesses: Business[] = results.map((r: any) => ({
      name: r.title || '',
      phone: r.phone || null,
      address: r.address || null,
      website: r.website || null,
      rating: r.rating || null,
      reviews: r.reviews || null,
      category: r.type || industry,
      placeId: r.place_id || null,
      mapsUrl: r.links?.directions || null,
    }))

    // ── Step 3: Filter — only businesses WITH a website (we need to rebuild it)
    // AND businesses WITHOUT a website (we build them one from scratch)
    // Priority: has website but it's bad
    const withWebsite = businesses.filter(b => b.website)
    const withoutWebsite = businesses.filter(b => !b.website)

    // ── Step 4: Score websites in parallel (max 10 at a time to avoid timeouts)
    const scored: (Business & { score: number; reasons: string[]; priority: 'high' | 'medium' | 'low' | 'no-site' })[] = []

    // Score businesses with websites in batches of 5
    const batchSize = 5
    for (let i = 0; i < withWebsite.length && i < 30; i += batchSize) {
      const batch = withWebsite.slice(i, i + batchSize)
      const scores = await Promise.all(batch.map(b => scoreWebsite(b.website!)))
      batch.forEach((b, j) => {
        const { score, reasons } = scores[j]
        scored.push({
          ...b,
          score,
          reasons,
          priority: score < 40 ? 'high' : score < 60 ? 'medium' : 'low'
        })
      })
    }

    // Businesses without websites are automatic high priority
    withoutWebsite.slice(0, 20).forEach(b => {
      scored.push({
        ...b,
        score: 0,
        reasons: ['No website'],
        priority: 'no-site'
      })
    })

    // Sort by priority: no-site and high first
    scored.sort((a, b) => {
      const order = { 'no-site': 0, 'high': 1, 'medium': 2, 'low': 3 }
      return order[a.priority] - order[b.priority]
    })

    // ── Step 5: Return results ────────────────────────────────────────────────
    return Response.json({
      query,
      total: businesses.length,
      withWebsite: withWebsite.length,
      withoutWebsite: withoutWebsite.length,
      scored: scored.length,
      prospects: scored.filter(b => b.priority === 'high' || b.priority === 'no-site'),
      all: scored,
    })

  } catch (err: any) {
    console.error('Scrape error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
