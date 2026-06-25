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

  const directive = `Aim for a site that looks like it cost $100,000 — Stripe-level polish. Modern premium SaaS aesthetic. Inter or Geist font, tight typographic hierarchy (88px hero → 48px section → 20px body). Generous whitespace, 1440px max-width, precise 8pt grid. Photos MUST be used as full-bleed hero background (with 0.4 dark overlay + white text) and in a 3-column feature gallery. Subtle gradients, soft shadows (0 10px 40px rgba(0,0,0,0.08)), rounded-xl cards. Monochrome palette with ONE vivid accent color derived from the product. Micro-interactions: hover lifts, fade-in on scroll (IntersectionObserver), smooth button transitions.`

  const system = `You are a world-class frontend designer and art director in the top 0.1% of your craft.
Output a COMPLETE, PRODUCTION-READY single-page HTML document.

${directive}

HARD REQUIREMENTS:
- Start directly with <!DOCTYPE html>. No markdown fences, no preamble, no explanation.
- Import Google Fonts via @import in <style>. Inline ALL CSS and JS.
- Use the provided photo URLs as <img src="..."> and CSS background-image exactly — do NOT invent placeholder URLs.
- Every image must have object-fit: cover; and proper alt text.
- Build a REAL navigation bar with logo + 4 links + primary CTA button.
- Build a REAL footer with brand, 3-4 link columns, social icons, and copyright.
- Write compelling, specific copy — no lorem ipsum. Every headline, subhead, and button label must speak to the product's actual value.
- Use the product name consistently throughout.
- Make it feel ALIVE: subtle animations, hover states, scroll behaviors.`

  const photoLines = photos.length
    ? photos.map((u, i) => `photo_${i + 1}: ${u}`).join('\n')
    : '(use gradients/SVG illustrations)'

  const user = `PRODUCT NAME: ${productName}\nPHOTOS:\n${photoLines}\n\nBRIEF:\n${brief.slice(0, 3500)}\n\nBuild the complete website now.`

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 8000,
        temperature: 0.85,
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
    return html.includes('<!DOCTYPE') ? html : null
  } catch (e) {
    console.error('generateHtmlFromBrief error', e)
    return null
  }
}
