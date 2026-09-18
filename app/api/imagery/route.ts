import OpenAI from 'openai'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'

export const runtime = 'edge'

// Imagery calls GPT-4o (via OpenRouter) twice per request — same rate-limit
// mechanism as /api/generate.
const FREE_LIMIT = 5
const EMAIL_LIMIT = 15

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

// Fetch royalty-free photo — randomized from top 5 results
async function fetchPhoto(query: string, key: string, seed = 0): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=8&orientation=landscape&content_filter=high&order_by=relevant`,
      { headers: { Authorization: `Client-ID ${key}` } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const results = data.results || []
    if (!results.length) return null
    // Pick different photos for each slot using seed offset
    const idx = seed % results.length
    return results[idx]?.urls?.regular || null
  } catch {
    return null
  }
}

// Use GPT-4o to extract precise industry and photo search queries from the brief
async function extractPhotoQueries(openai: OpenAI, brief: string, productName: string): Promise<{
  industry: string
  heroQuery: string
  featureQuery: string
  teamQuery: string
  atmosphereQuery: string
  ctaQuery: string
}> {
  try {
    const res = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      max_tokens: 400,
      messages: [{
        role: 'system',
        content: `You are a photo research director at a Madison Avenue agency. 
Given a product brief, generate 5 specific Unsplash search queries for royalty-free photography.
Each query must be highly specific to the exact trade, industry, or product described.
Never use generic queries like "business professional" or "office worker".
Be specific: "roofer installing shingles" not "construction worker", "plumber fixing copper pipes" not "tradesperson".

Output ONLY valid JSON, no other text:
{
  "industry": "one-word industry label",
  "heroQuery": "specific hero image query",
  "featureQuery": "specific feature/work-in-progress query", 
  "teamQuery": "specific person/people query for this trade",
  "atmosphereQuery": "specific mood/atmosphere query",
  "ctaQuery": "specific call-to-action background query"
}`
      }, {
        role: 'user',
        content: `Product: ${productName}\n\nBrief excerpt:\n${(brief || '').slice(0, 800)}`
      }]
    })

    const raw = res.choices[0]?.message?.content || ''
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(clean)
  } catch {
    // Fallback: derive from product name
    const name = productName.toLowerCase()
    return {
      industry: name,
      heroQuery: `${name} professional work`,
      featureQuery: `${name} service detail`,
      teamQuery: `${name} worker portrait`,
      atmosphereQuery: `${name} workplace atmosphere`,
      ctaQuery: `${name} completed project`
    }
  }
}

export async function POST(req: NextRequest) {
  const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  })
  try {
    const { brief, productName, tagline, vision, email: bodyEmail } = await req.json()

    const redis = getRedis()
    const ip = getIp(req)

    // Check session cookie for logged-in customers (unlimited)
    let isPayingSession = false
    const cookie = req.headers.get('cookie') || ''
    const sessionMatch = cookie.match(/i2l_session=([a-f0-9]+)/)
    if (sessionMatch && redis) {
      const sessionEmail = await redis.get(`session:${sessionMatch[1]}`)
      if (sessionEmail) isPayingSession = true
    }

    if (!isPayingSession && redis) {
      const key = bodyEmail
        ? `imagery:email:${bodyEmail.toLowerCase()}`
        : `imagery:ip:${ip}`
      const limit = bodyEmail ? EMAIL_LIMIT : FREE_LIMIT
      const count = Number(await redis.get(key)) || 0

      if (count >= limit) {
        return Response.json(
          { error: 'limit_reached', limit, email: !!bodyEmail },
          { status: 429 }
        )
      }

      await redis.incr(key)
      await redis.expire(key, 60 * 60 * 24 * 30) // 30-day rolling window

      if (bodyEmail) {
        await redis.set(`lead:${bodyEmail.toLowerCase()}`, JSON.stringify({
          email: bodyEmail,
          capturedAt: Date.now(),
          source: 'imagery_generator',
        }), { ex: 60 * 60 * 24 * 365 })
      }
    }

    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY

    // Step 1: GPT-4o extracts precise photo queries for this specific product
    const queries = await extractPhotoQueries(openai, brief || '', productName || '')

    // Step 2: Fetch photos with different seed offsets so each slot gets a different image
    // even if the queries are similar
    const [heroPhoto, featurePhoto, teamPhoto, atmospherePhoto, ctaPhoto] = await Promise.all([
      unsplashKey ? fetchPhoto(queries.heroQuery, unsplashKey, 0) : null,
      unsplashKey ? fetchPhoto(queries.featureQuery, unsplashKey, 1) : null,
      unsplashKey ? fetchPhoto(queries.teamQuery, unsplashKey, 2) : null,
      unsplashKey ? fetchPhoto(queries.atmosphereQuery, unsplashKey, 3) : null,
      unsplashKey ? fetchPhoto(queries.ctaQuery, unsplashKey, 0) : null,
    ])

    // Step 3: Generate AI image prompts for custom photography
    let aiPrompts = { hero: '', feature: '', atmosphere: '' }
    try {
      const promptRes = await openai.chat.completions.create({
        model: 'google/gemini-2.5-flash',
        max_tokens: 800,
        messages: [{
          role: 'system',
          content: `You are a Madison Avenue art director. Write 3 photorealistic image prompts for this specific product.
Output ONLY valid JSON: {"hero": "prompt", "feature": "prompt", "atmosphere": "prompt"}
Each prompt must be hyper-specific to this exact trade/industry. Specify: lighting, camera lens, color temperature, mood.
End each with "Shot for a luxury brand campaign. Not stock photography."
No other text.`
        }, {
          role: 'user',
          content: `Product: ${productName}\nIndustry: ${queries.industry}\nTagline: ${tagline || ''}\nVision: ${(vision || '').slice(0, 300)}`
        }]
      })
      const raw = promptRes.choices[0]?.message?.content || ''
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      aiPrompts = JSON.parse(clean)
    } catch {}

    return Response.json({
      photos: {
        hero: heroPhoto,
        feature: featurePhoto,
        team: teamPhoto,
        atmosphere: atmospherePhoto,
        cta: ctaPhoto
      },
      queries, // Return queries for debugging/transparency
      aiPrompts,
      industry: queries.industry,
      unsplashConfigured: !!unsplashKey
    })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
