import OpenAI from 'openai'
import { NextRequest } from 'next/server'
import { getRedis } from '@/app/lib/redis'

export const runtime = 'edge'

const FREE_AUDITS_PER_IP_PER_DAY = 10

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown'
}

function normaliseUrl(input: string): string | null {
  try {
    const trimmed = input.trim()
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const u = new URL(withScheme)
    if (!/^https?:$/i.test(u.protocol)) return null
    return u.toString()
  } catch {
    return null
  }
}

function slugFromUrl(url: string): string {
  const u = new URL(url)
  return u.hostname.replace(/^www\./, '').replace(/\./g, '-').toLowerCase()
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function pick(html: string, regex: RegExp): string | null {
  const m = html.match(regex)
  return m ? m[1].trim() : null
}

export type Stack = 'nextjs' | 'wix' | 'squarespace' | 'webflow' | 'wordpress' | 'shopify' | 'framer' | 'astro' | 'react' | 'unknown'

function detectStack(html: string): Stack {
  // Order matters — most specific first
  if (/_next\/static|__NEXT_DATA__|<meta\s+name=["']next-head-count["']/i.test(html)) return 'nextjs'
  if (/wixstatic\.com|<meta\s+name=["']generator["']\s+content=["']Wix\.com/i.test(html)) return 'wix'
  if (/static1\.squarespace\.com|<meta\s+name=["']generator["']\s+content=["']Squarespace/i.test(html)) return 'squarespace'
  if (/webflow\.com\/?[^"]*?\.js|<meta\s+name=["']generator["']\s+content=["']Webflow|webflow\.io/i.test(html)) return 'webflow'
  if (/wp-content\/|wp-includes\/|<meta\s+name=["']generator["']\s+content=["']WordPress/i.test(html)) return 'wordpress'
  if (/cdn\.shopify\.com|\.myshopify\.com|Shopify\.theme/i.test(html)) return 'shopify'
  if (/framer\.com\/m\/|<meta\s+name=["']generator["']\s+content=["']Framer/i.test(html)) return 'framer'
  if (/astro-island|<astro-|astro:[a-z]+/i.test(html)) return 'astro'
  if (/react-dom|reactroot|data-reactid/i.test(html)) return 'react'
  return 'unknown'
}

function extractContext(html: string) {
  const title = pick(html, /<title[^>]*>([^<]*)<\/title>/i)
  const description = pick(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
  const ogTitle = pick(html, /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)
  const ogImage = pick(html, /<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)
  const h1 = pick(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const hasJsonLd = /<script[^>]*type=["']application\/ld\+json["'][^>]*>/i.test(html)
  const stack = detectStack(html)
  const text = stripTags(html).slice(0, 6000)
  return {
    title,
    description,
    ogTitle,
    ogImage,
    h1: h1 ? stripTags(h1) : null,
    hasJsonLd,
    stack,
    bodyExcerpt: text,
  }
}

const SYSTEM_PROMPT = `You are a brutal, founder-obsessed growth strategist who audits and rewrites SaaS/product landing pages. You output ONLY valid JSON matching the schema given. No prose outside JSON. No markdown fences.

Audit framework — 10 leverage-ranked problems to look for:
1. Identity collapse (tool/service/platform confusion)
2. Tagline is descriptive, not transformative
3. Wrong competitive axis
4. Agency framing ("we build/we deliver")
5. Tier names are SaaS templates (Starter/Pro/Premium)
6. No live energy (static, no motion, no recent activity)
7. Wow gated behind email
8. Programmatic SEO surfaces dark
9. Orphan pages
10. No founder/customer identity proof

Voice for rewrites: outcomes not features. Identity transformation. Time compression. Brutal clarity. Closer to Lovable / Bolt / Granola / Linear than to HubSpot / Mailchimp.`

const USER_PROMPT_TEMPLATE = (ctx: ReturnType<typeof extractContext>, url: string) => `Audit this site: ${url}

Title: ${ctx.title || '(none)'}
Meta description: ${ctx.description || '(none)'}
OG title: ${ctx.ogTitle || '(none)'}
H1: ${ctx.h1 || '(none)'}
Has JSON-LD: ${ctx.hasJsonLd}
Has OG image: ${!!ctx.ogImage}

Body excerpt (first ~6k chars):
"""
${ctx.bodyExcerpt}
"""

Output strictly this JSON shape (no other keys, no extra prose):

{
  "summary": "<one sentence: what this product is and who it's for, in YOUR words>",
  "convictionScore": <integer 0-100, where 100 = converts strangers, 0 = converts no one>,
  "problems": [
    { "rank": 1, "title": "<problem from the 10-point framework>", "severity": "high|medium|low", "evidence": "<exact quote or specific observation from the site>", "fix": "<one-sentence concrete fix>" }
  ],
  "rewrite": {
    "h1": "<new H1 — transformation promise, time-compressed if relevant>",
    "sub": "<new subhead — what user does/becomes, max 25 words>",
    "primaryCta": "<2-4 word action verb CTA>",
    "secondaryCta": "<short secondary CTA>",
    "microcopy": "<1-line under-CTA: what user does NOT need>"
  },
  "tierRename": [
    { "from": "<current tier name if pricing detected>", "to": "<outcome-based new name>", "tag": "<timeline tag>", "desc": "<one-line outcome>" }
  ],
  "faqs": [
    { "q": "<conviction-blocking question>", "a": "<honest answer>" }
  ],
  "top3Fixes": [
    "<single highest-leverage fix>",
    "<second fix>",
    "<third fix>"
  ],
  "oneSentenceVerdict": "<the brutal one-sentence summary the founder needs to hear>"
}

Rules:
- problems: 5-8 items, ranked by leverage, severity honest
- faqs: exactly 6 items
- tierRename: only if pricing tiers were detected (Starter/Pro/etc); otherwise empty array
- evidence MUST quote or describe specifics from the actual site, not generic
- rewrite must be punchy, not corporate`

type AuditResult = {
  summary: string
  convictionScore: number
  problems: Array<{ rank: number; title: string; severity: string; evidence: string; fix: string }>
  rewrite: { h1: string; sub: string; primaryCta: string; secondaryCta: string; microcopy: string }
  tierRename: Array<{ from: string; to: string; tag: string; desc: string }>
  faqs: Array<{ q: string; a: string }>
  top3Fixes: string[]
  oneSentenceVerdict: string
}

export type StoredAudit = {
  url: string
  domain: string
  scrapedAt: number
  current: ReturnType<typeof extractContext>
  audit: AuditResult
}

const CACHE_FRESH_MS = 60 * 60 * 24 * 1000 // 24h — same URL returns same audit

export async function POST(req: NextRequest) {
  let body: { url?: string; force?: boolean }
  try { body = await req.json() } catch { return Response.json({ error: 'invalid_json' }, { status: 400 }) }

  const url = body.url ? normaliseUrl(body.url) : null
  if (!url) return Response.json({ error: 'invalid_url' }, { status: 400 })

  const slug = slugFromUrl(url)
  const redis = getRedis()
  const ip = getIp(req)

  // Cache check — return existing audit if fresh and not forced
  if (redis && !body.force) {
    const raw = await redis.get<StoredAudit | string>(`audit:${slug}`)
    if (raw) {
      const cached: StoredAudit = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (Date.now() - cached.scrapedAt < CACHE_FRESH_MS) {
        return Response.json({
          slug,
          audit: cached.audit,
          current: cached.current,
          domain: cached.domain,
          cached: true,
        })
      }
    }
  }

  if (redis) {
    const rateKey = `audit:rate:${ip}`
    const count = Number(await redis.get(rateKey)) || 0
    if (count >= FREE_AUDITS_PER_IP_PER_DAY) {
      return Response.json({ error: 'rate_limited', limit: FREE_AUDITS_PER_IP_PER_DAY }, { status: 429 })
    }
    await redis.incr(rateKey)
    await redis.expire(rateKey, 60 * 60 * 24)
  }

  let html: string
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'IdeaByLunchAuditBot/1.0 (+https://ideabylunch.com/audit)' },
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) return Response.json({ error: 'fetch_failed', status: res.status }, { status: 502 })
    html = (await res.text()).slice(0, 200_000)
  } catch (err) {
    return Response.json({ error: 'fetch_error', detail: String(err) }, { status: 502 })
  }

  const current = extractContext(html)

  const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  })

  let audit: AuditResult
  try {
    const completion = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: USER_PROMPT_TEMPLATE(current, url) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
    })
    const text = completion.choices[0]?.message?.content || ''
    // Defensive: strip markdown fences and find the JSON object
    let cleaned = text.trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/i, '')
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1)
    }
    audit = JSON.parse(cleaned) as AuditResult
  } catch (err) {
    return Response.json({ error: 'analysis_failed', detail: String(err) }, { status: 500 })
  }

  const stored: StoredAudit = {
    url,
    domain: new URL(url).hostname.replace(/^www\./, ''),
    scrapedAt: Date.now(),
    current,
    audit,
  }

  if (redis) {
    await redis.set(`audit:${slug}`, JSON.stringify(stored), { ex: 60 * 60 * 24 * 90 })
    await redis.lpush('audit:recent', JSON.stringify({ slug, domain: stored.domain, scrapedAt: stored.scrapedAt, score: audit.convictionScore }))
    await redis.ltrim('audit:recent', 0, 99)
  }

  return Response.json({ slug, audit, current, domain: stored.domain })
}
