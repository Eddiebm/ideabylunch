export function extractProductName(brief: string): string {
  const m = brief.match(/(?:PRODUCT VISION|^)\s*([A-Z][A-Za-z0-9]+(?:\s+[A-Z][A-Za-z0-9]+)?)\s+is/)
  return m?.[1] || 'Your Product'
}

export async function generateHtmlFromBrief(
  brief: string,
  productName: string,
  plan: string,
  photos: string[] = [],
): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return null

  const system = `You are a world-class frontend designer and art director — top 0.1% of your craft. You build sites that look like they cost $100,000.

VISUAL STANDARD:
- Stripe-level polish. Modern premium SaaS aesthetic.
- Inter or Geist font via Google Fonts @import. Tight typographic hierarchy: 88px hero → 48px section → 20px body.
- Generous whitespace. 1440px max-width. Precise 8pt grid.
- Monochrome base palette with ONE vivid accent color derived from the product's industry/personality.
- Soft shadows (0 10px 40px rgba(0,0,0,0.08)). Rounded-xl cards. Subtle gradients.
- Micro-interactions: hover lifts (transform: translateY(-2px)), fade-in on scroll (IntersectionObserver), smooth button transitions (0.2s ease).
- Photos used as full-bleed hero background (dark overlay 0.4 opacity + white text on top) AND in a 3-column feature gallery with object-fit: cover.

OUTPUT RULES:
- Start DIRECTLY with <!DOCTYPE html>. No markdown. No backticks. No explanation before or after.
- Inline ALL CSS in <style> and ALL JS in <script>. Zero external dependencies except Google Fonts.
- Use provided photo URLs exactly as-is. Never invent placeholder URLs.
- Every image: object-fit: cover, proper alt text.
- Write specific, compelling copy — zero lorem ipsum. Every word must reflect the actual product.

REQUIRED PAGE SECTIONS (build every single one):
1. NAVIGATION — logo + 4 nav links + primary CTA button. Sticky, with backdrop-filter blur on scroll.
2. HERO — full-bleed photo background or bold gradient. H1 ≤ 8 words. Subheadline 1–2 sentences. Two CTA buttons (primary + secondary). Trust signal row (3–4 stats or logos).
3. PROBLEM — "Why this exists." 2–3 sentences of pain. 3 pain point cards.
4. SOLUTION / HOW IT WORKS — 3-step process with numbered steps, icons, and short descriptions.
5. FEATURES — 6-card grid. Each card: icon + bold label + 2-sentence description.
6. SOCIAL PROOF — 3 testimonial cards with name, role, company, avatar initial, and quote. Make them feel real and specific.
7. PRICING — 2–3 tier cards. Highlight the recommended tier. Include feature lists and CTA per tier.
8. FAQ — 5–6 accordion-style questions with answers. Use <details>/<summary>.
9. FINAL CTA — dark background section. Bold closing headline. Single primary CTA button.
10. FOOTER — brand name + tagline, 3–4 link columns, social icons (SVG), copyright line.`

  const photoLines = photos.length
    ? photos.map((u, i) => `Photo ${i + 1}: ${u}`).join('\n')
    : '(no photos provided — use a bold gradient hero and SVG illustrations throughout)'

  const user = `PRODUCT NAME: ${productName}
PLAN TIER: ${plan}
PHOTOS:
${photoLines}

FOUNDER BRIEF:
${brief}

Build the complete, production-ready website now. Include every required section. Do not stop early.`

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 32000,
        temperature: 0.2,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    })
    if (!res.ok) {
      console.error('generateHtmlFromBrief failed', res.status, await res.text())
      return null
    }
    const data: any = await res.json()
    let html: string = data?.choices?.[0]?.message?.content || ''
    html = html.replace(/^```(?:html)?\s*/i, '').replace(/```\s*$/i, '').trim()

    if (!html.includes('<!DOCTYPE')) return null

    // Quality gate — verify key sections are present
    const required = ['<nav', '<footer', 'pricing', 'faq', 'how it works']
    const htmlLower = html.toLowerCase()
    const missing = required.filter(s => !htmlLower.includes(s))
    if (missing.length > 2) {
      console.error('generateHtmlFromBrief: incomplete output, missing:', missing)
      return null
    }

    return html
  } catch (e) {
    console.error('generateHtmlFromBrief error', e)
    return null
  }
}
