export const runtime = 'edge'

import OpenAI from 'openai'
import { Redis } from '@upstash/redis'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

async function generateStarterLogos(businessName: string, industry: string): Promise<string[]> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const styles = [
    `minimalist wordmark logo for "${businessName}", ${industry} business, clean sans-serif typography, single color, white background, professional`,
    `bold modern logo for "${businessName}", ${industry} business, geometric icon + text, strong contrast, white background`,
    `elegant logo for "${businessName}", ${industry} business, refined serif typography, subtle icon, premium feel, white background`,
  ]

  const urls: string[] = []
  for (const prompt of styles) {
    const res = await client.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    })
    const url = res.data?.[0]?.url
    if (url) urls.push(url)
  }
  return urls
}

async function generateProLogos(businessName: string, industry: string): Promise<string[]> {
  const key = process.env.RECRAFT_API_KEY
  if (!key) throw new Error('RECRAFT_API_KEY not configured')

  const styles = [
    { style: 'vector_illustration', prompt: `minimalist logo for "${businessName}", ${industry}, clean lines, scalable vector` },
    { style: 'vector_illustration', prompt: `bold geometric logo for "${businessName}", ${industry}, modern iconmark + wordmark` },
    { style: 'vector_illustration', prompt: `elegant emblem logo for "${businessName}", ${industry}, premium brand identity` },
  ]

  const urls: string[] = []
  for (const { style, prompt } of styles) {
    const res = await fetch('https://external.api.recraft.ai/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, style, n: 1, size: '1024x1024' }),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Recraft error ${res.status}: ${err.slice(0, 200)}`)
    }
    const data: any = await res.json()
    const url = data?.data?.[0]?.url
    if (url) urls.push(url)
  }
  return urls
}

export async function POST(req: Request) {
  try {
    const { businessName, industry, tier } = await req.json()
    if (!businessName || !industry || !tier) {
      return Response.json({ error: 'businessName, industry, tier required' }, { status: 400 })
    }
    if (!['starter', 'pro'].includes(tier)) {
      return Response.json({ error: 'tier must be starter or pro' }, { status: 400 })
    }

    const urls = tier === 'pro'
      ? await generateProLogos(businessName, industry)
      : await generateStarterLogos(businessName, industry)

    if (!urls.length) {
      return Response.json({ error: 'Logo generation failed' }, { status: 500 })
    }

    // Cache for 7 days so customer can download after payment
    const cacheKey = `logos:${businessName.toLowerCase().replace(/\s+/g, '-')}:${tier}:${Date.now()}`
    const redis = getRedis()
    if (redis) {
      await redis.set(cacheKey, JSON.stringify({ urls, businessName, industry, tier }), { ex: 60 * 60 * 24 * 7 })
    }

    return Response.json({ urls, cacheKey, tier, count: urls.length })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cacheKey = searchParams.get('key')
  if (!cacheKey) return Response.json({ error: 'key required' }, { status: 400 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'Redis unavailable' }, { status: 500 })

  const raw = await redis.get(cacheKey)
  if (!raw) return Response.json({ error: 'Expired or not found' }, { status: 404 })

  return Response.json(typeof raw === 'string' ? JSON.parse(raw) : raw)
}
