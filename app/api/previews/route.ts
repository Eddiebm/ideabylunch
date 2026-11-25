import OpenAI from 'openai'

const STYLES = {
  editorial: {
    name: 'Editorial',
    directive: `EDITORIAL style — Kinfolk magazine meets The New York Times.
- Serif headings (Playfair Display, Cormorant Garamond, or Libre Baskerville)
- Serif body (Lora, Crimson Pro, or EB Garamond)
- Generous whitespace, asymmetric editorial layouts
- Muted, paper-like palette: off-white (#FBF8F3), deep black (#1a1a1a), sepia/accent (#8B6F47)
- Drop caps, pull quotes, small caps labels, hairline rules
- Full-bleed photography with caption-style overlays`,
  },
  minimal: {
    name: 'Modern Minimal',
    directive: `MODERN MINIMAL style — Linear, Vercel, Stripe aesthetic.
- Sans-serif throughout (Inter, Geist, or Söhne)
- Lots of whitespace, tight grids, precise alignment
- Neutral palette: pure white (#FFFFFF), soft gray (#F5F5F7), black (#0A0A0A), one subtle accent
- Minimal ornament, no gradients, crisp 1px borders
- Subtle micro-interactions, small type, precise spacing`,
  },
  bold: {
    name: 'Bold & Vibrant',
    directive: `BOLD & VIBRANT style — Gumroad, Awwwards-winner, brutalist-inspired.
- MASSIVE display typography (100px+ headings using Archivo Black, Anton, or Space Grotesk)
- Saturated, unexpected colors and dramatic gradients (magenta→orange, cyan→purple)
- Blocky sections with sharp color transitions
- Oversized buttons, chunky borders, playful micro-animations
- Confident, attention-grabbing, feels alive`,
  },
} as const

type StyleKey = keyof typeof STYLES

const BASE_SYSTEM = `You are a world-class frontend designer. Output a COMPLETE, BEAUTIFUL, PRODUCTION-READY single-page HTML document.
REQUIRED SECTIONS: fixed nav · hero (with photo background if provided) · how it works (3 steps) · features · pricing (3 tiers) · CTA · footer.
Import Google Fonts via @import in <style>. Inline ALL CSS and JS. Use provided photo URLs as CSS backgrounds with object-fit: cover; if a URL is null use a CSS gradient matching the palette.
Start directly with <!DOCTYPE html>. No explanation before or after.`

async function generateOne(style: StyleKey, ctx: any, apiKey: string): Promise<string> {
  const openai = new OpenAI({ apiKey, baseURL: 'https://openrouter.ai/api/v1' })
  const s = STYLES[style]
  const user = `PRODUCT: ${ctx.productName}
TAGLINE: ${ctx.tagline || ''}
VISION: ${(ctx.vision || '').slice(0, 500)}
BRIEF: ${(ctx.brief || '').slice(0, 1500)}

PHOTOS:
hero: ${ctx.photos?.hero || 'null'}
feature: ${ctx.photos?.feature || 'null'}
atmosphere: ${ctx.photos?.atmosphere || 'null'}

DESIGN STYLE — ${s.name.toUpperCase()}:
${s.directive}

Build the complete website NOW in this exact style. Be fearless and distinctive.`

  const res = await openai.chat.completions.create({
    model: 'google/gemini-2.5-flash',
    max_tokens: 6000,
    messages: [
      { role: 'system', content: BASE_SYSTEM },
      { role: 'user', content: user },
    ],
  })
  return res.choices[0]?.message?.content || ''
}

export async function POST(req: Request) {
  try {
    const ctx = await req.json()
    const apiKey = process.env.OPENROUTER_API_KEY!
    const keys: StyleKey[] = ['editorial', 'minimal', 'bold']
    const results = await Promise.all(keys.map(k => generateOne(k, ctx, apiKey).catch(e => `<!-- error: ${e.message} -->`)))
    return Response.json({
      previews: keys.map((k, i) => ({
        key: k,
        name: STYLES[k].name,
        html: results[i],
      })),
    })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
