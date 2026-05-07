import OpenAI from 'openai'
import { Redis } from '@upstash/redis'

export const runtime = 'edge'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const PALETTES = [
  { primary: '#1C1C1C', secondary: '#FF6B35', bg: '#FFFFFF', text: '#1C1C1C' },
  { primary: '#1B3A2D', secondary: '#C9A84C', bg: '#F7F4EE', text: '#2C1810' },
  { primary: '#0077B6', secondary: '#00B4D8', bg: '#F8FBFF', text: '#012A3A' },
  { primary: '#2D4A3E', secondary: '#F4A259', bg: '#F9F5EF', text: '#2D4A3E' },
]

const FONTS = [
  { display: "'Bebas Neue', Impact, sans-serif", body: "'Inter', system-ui, sans-serif", google: "Bebas+Neue&family=Inter:wght@300;400;500;600" },
  { display: "'Playfair Display', Georgia, serif", body: "'Lora', Georgia, serif", google: "Playfair+Display:ital,wght@0,400;0,700;1,400&family=Lora:wght@400;500" },
  { display: "'DM Serif Display', serif", body: "'DM Sans', system-ui, sans-serif", google: "DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500" },
]

async function fetchPhoto(query: string): Promise<string | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&content_filter=high`,
      { headers: { Authorization: `Client-ID ${key}` } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const results = data.results || []
    if (!results.length) return null
    return results[Math.floor(Math.random() * Math.min(results.length, 4))]?.urls?.regular || null
  } catch { return null }
}

export async function POST(req: Request) {
  const openai = new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1',
  })
  try {
    const { businessName, website, phone, address, city, industry, brief, category } = await req.json()

    if (!businessName) {
      return Response.json({ error: 'businessName required' }, { status: 400 })
    }

    const h = hashStr(businessName + city)
    const palette = PALETTES[h % PALETTES.length]
    const fonts = FONTS[h % FONTS.length]

    // Fetch photos in parallel
    const [heroPhoto, workPhoto] = await Promise.all([
      fetchPhoto(`${category || industry} professional work ${city}`),
      fetchPhoto(`${category || industry} service detail`),
    ])

    // Generate website HTML
    const completion = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      max_tokens: 3500,
      temperature: 0.8,
      messages: [
        {
          role: 'system',
          content: `You are a world-class web designer. Build a COMPLETE single-page HTML website for a local ${category || industry} business.

DESIGN:
- Primary: ${palette.primary} | Accent: ${palette.secondary} | BG: ${palette.bg} | Text: ${palette.text}
- Fonts: @import url('https://fonts.googleapis.com/css2?family=${fonts.google}&display=swap');
- Display: ${fonts.display} | Body: ${fonts.body}

REQUIRED SECTIONS:
1. Fixed nav — business name left, phone right as large clickable tel: link
2. Full-viewport hero — ${heroPhoto ? 'hero photo as CSS background-image with dark overlay' : 'gradient using palette colors'} + large headline + subheadline + "Call Now" and "Get Free Quote" buttons
3. Services — 4 service cards with Unicode icons (✓ ★ ⚡ 🔧 etc)
4. Trust badges — Licensed & Insured · Local & Family Owned · Fast Response · Free Quotes
5. ${workPhoto ? `<img src="${workPhoto}" style="width:100%;height:400px;object-fit:cover"> with overlay text` : 'Statistics section with 3 key numbers'}
6. Service area — "Proudly serving ${city} and surrounding areas"
7. Contact — large phone number displayed prominently, address, simple HTML form
8. Footer — name, phone, address, © ${new Date().getFullYear()}

CRITICAL:
- Business name: "${businessName}"
- Phone: ${phone || '(314) 555-0100'}
- Address: ${address || city}
- ${heroPhoto ? `Hero background: background-image: url('${heroPhoto}')` : 'Use CSS gradient for hero'}
- Fully mobile responsive with media queries
- Output ONLY the complete HTML starting with <!DOCTYPE html>
- No markdown fences, no explanation`
        },
        {
          role: 'user',
          content: `Build the website for ${businessName}, a ${category || industry} business in ${city}.`
        }
      ]
    })

    let html = completion.choices[0]?.message?.content || ''
    html = html.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim()

    if (!html || html.length < 500 || !html.includes('<!DOCTYPE')) {
      return Response.json({ error: 'Failed to generate valid HTML' }, { status: 500 })
    }

    // Add preview banner to HTML
    const banner = `<div style="position:fixed;top:0;left:0;right:0;z-index:99999;background:#1B3A2D;color:#C9A84C;padding:10px 20px;display:flex;align-items:center;justify-content:space-between;font-family:monospace;font-size:12px;box-shadow:0 2px 12px rgba(0,0,0,.4);">
  <span>✦ Preview built by IdeaByLunch — like what you see?</span>
  <a href="mailto:hello@ideabylunch.com?subject=Keep my new website - ${encodeURIComponent(businessName)}&body=Hi Eddie, I'd like to keep the preview site you built for ${encodeURIComponent(businessName)}. Please set it up on our domain." style="background:#C9A84C;color:#1B3A2D;padding:6px 16px;border-radius:3px;text-decoration:none;font-weight:700;font-size:11px;letter-spacing:.08em;white-space:nowrap;margin-left:16px;">Keep This Site — $299 →</a>
</div>
<div style="height:46px"></div>`

    const htmlWithBanner = html.replace(/<body([^>]*)>/i, `<body$1>${banner}`)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ideabylunch.com'
    const token = `${businessName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15)}-${Date.now().toString(36)}`
    const previewUrl = `${appUrl}/preview/${token}`

    // Persist to Redis — preview page reads this
    const redis = getRedis()
    if (redis) {
      await redis.set(`preview:${token}`, JSON.stringify({
        token,
        businessName,
        phone: phone || null,
        address: address || null,
        city: city || null,
        category: category || industry || null,
        html: htmlWithBanner,
        createdAt: Date.now(),
        status: 'pending', // → 'converted' after payment
      }), { ex: 60 * 60 * 24 * 30 }) // 30 days
    }

    return Response.json({
      success: true,
      businessName,
      previewUrl,
      token,
      htmlLength: htmlWithBanner.length,
    })

  } catch (err: any) {
    console.error('Hunt build error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
