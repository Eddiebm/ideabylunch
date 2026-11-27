export const runtime = 'edge'

import { runStructuralGates, mergeAIGates, scoreGates } from '@/app/lib/acceptanceGates'

/**
 * POST /api/ai/critique
 * Scores generated HTML against the 10 acceptance gates.
 * Runs G-01–G-03, G-06–G-10 structurally (instant).
 * Runs G-04 and G-05 via a lightweight AI judge call.
 *
 * Body: { html: string, brief: string, productName: string }
 * Returns: { score: number, pass: boolean, gates: GateResult[], issues: string[] }
 */
export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) return Response.json({ error: 'Critique not available' }, { status: 503 })

  let html: string, brief: string, productName: string
  try {
    ;({ html, brief, productName } = await req.json() as { html: string; brief: string; productName: string })
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!html || typeof html !== 'string') {
    return Response.json({ error: 'html is required' }, { status: 400 })
  }

  // Run structural gates immediately
  const structural = runStructuralGates(html, brief)

  // Run AI gates (G-04, G-05) via OpenRouter
  let noFabricatedTestimonials = false
  let noUnsupportedClaims = false
  const aiIssues: string[] = []

  try {
    const judgePrompt = `You are auditing an AI-generated marketing website for quality issues.

PRODUCT: ${productName || 'Unknown'}
BRIEF EXCERPT: ${(brief || '').slice(0, 500)}

WEBSITE HTML (first 8000 chars):
${html.slice(0, 8000)}

Answer ONLY with valid JSON in this exact shape:
{
  "noFabricatedTestimonials": true|false,
  "noUnsupportedClaims": true|false,
  "testimonialIssue": "describe problem or null",
  "claimsIssue": "describe problem or null"
}

noFabricatedTestimonials = true if:
- All testimonial cards show "[Placeholder" text, OR
- All testimonials are verbatim from the brief, OR
- There are no testimonials at all.
noFabricatedTestimonials = false if the page contains specific invented names (e.g. "Sarah Johnson"), fake companies, or fabricated quotes not in the brief.

noUnsupportedClaims = true if the page does not make specific measurable claims (e.g. "10x faster", "Save $50,000/year") that are not in the brief.
noUnsupportedClaims = false if the page invents specific metrics or results not found in the brief.`

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 300,
        temperature: 0,
        messages: [{ role: 'user', content: judgePrompt }],
      }),
    })

    if (res.ok) {
      const data = await res.json() as { choices?: { message?: { content?: string } }[] }
      const content = data.choices?.[0]?.message?.content ?? ''
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          noFabricatedTestimonials?: boolean
          noUnsupportedClaims?: boolean
          testimonialIssue?: string | null
          claimsIssue?: string | null
        }
        noFabricatedTestimonials = parsed.noFabricatedTestimonials ?? false
        noUnsupportedClaims = parsed.noUnsupportedClaims ?? false
        if (!noFabricatedTestimonials && parsed.testimonialIssue) aiIssues.push(`G-04: ${parsed.testimonialIssue}`)
        if (!noUnsupportedClaims && parsed.claimsIssue) aiIssues.push(`G-05: ${parsed.claimsIssue}`)
      }
    }
  } catch {
    // AI judge failed — leave G-04/G-05 as false (conservative)
    aiIssues.push('G-04/G-05: AI judge unavailable — treating as failed')
  }

  const finalGates = mergeAIGates(structural, { noFabricatedTestimonials, noUnsupportedClaims, issues: aiIssues })
  const { score, pass, issues } = scoreGates(finalGates)

  return Response.json({ score, pass, gates: finalGates, issues: [...issues, ...aiIssues] })
}
