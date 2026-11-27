/**
 * Acceptance gates for generated website HTML.
 * G-01 through G-07, G-09, G-10 are structural (no AI call needed).
 * G-04 and G-05 require AI critique (scored by /api/ai/critique).
 */

export interface GateResult {
  id: string
  name: string
  pass: boolean
  detail?: string
}

export interface CritiqueResult {
  score: number          // 0–100
  pass: boolean          // score >= 70 AND all critical gates pass
  gates: GateResult[]
  issues: string[]       // human-readable failure reasons
}

/** Gates that, if failed, block delivery regardless of overall score. */
export const CRITICAL_GATE_IDS = new Set(['G-04', 'G-05', 'G-06'])

const REQUIRED_SECTIONS = [
  'nav', 'hero', 'how', 'feature', 'pricing', 'footer',
]

const BANNED_CSS_PATTERNS = [
  // gradient text
  /background-clip\s*:\s*text/i,
  // glassmorphism
  /backdrop-filter\s*:/i,
  // neon glow on decorative elements
  /text-shadow\s*:[^;]*neon/i,
  // elastic easing
  /cubic-bezier\s*\(\s*0\.[0-9]+\s*,\s*-/i,
  // excessive shadow alpha (> 0.15)
  /box-shadow\s*:[^;]*rgba\s*\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\.(1[6-9]|[2-9])/i,
]

const PLACEHOLDER_URL_PATTERNS = [
  /lorempixel/i,
  /via\.placeholder/i,
  /example\.com\/image/i,
  /placehold\.it/i,
  /dummyimage/i,
]

/** Run all structural gates synchronously. AI gates (G-04, G-05) return pass:false to be filled in by the critique route. */
export function runStructuralGates(html: string, brief = ''): GateResult[] {
  const lower = html.toLowerCase()

  const gates: GateResult[] = []

  // G-01: DOCTYPE present
  gates.push({
    id: 'G-01',
    name: 'Valid HTML document',
    pass: html.trimStart().toLowerCase().startsWith('<!doctype html'),
  })

  // G-02: Required sections present
  const missingSections = REQUIRED_SECTIONS.filter(s => !lower.includes(s))
  gates.push({
    id: 'G-02',
    name: 'Required sections present',
    pass: missingSections.length === 0,
    detail: missingSections.length > 0 ? `Missing: ${missingSections.join(', ')}` : undefined,
  })

  // G-03: No banned CSS patterns
  const bannedHits = BANNED_CSS_PATTERNS.filter(p => p.test(html))
  gates.push({
    id: 'G-03',
    name: 'No banned CSS patterns',
    pass: bannedHits.length === 0,
    detail: bannedHits.length > 0 ? `Patterns found: ${bannedHits.map(p => p.source.slice(0, 40)).join('; ')}` : undefined,
  })

  // G-04: No fabricated testimonials (AI-critiqued — structural placeholder)
  gates.push({
    id: 'G-04',
    name: 'No fabricated testimonials',
    pass: false,
    detail: 'Requires AI critique',
  })

  // G-05: No unsupported claims (AI-critiqued — structural placeholder)
  gates.push({
    id: 'G-05',
    name: 'No unsupported business claims',
    pass: false,
    detail: 'Requires AI critique',
  })

  // G-06: HTML length >= 15,000 chars (not truncated)
  gates.push({
    id: 'G-06',
    name: 'HTML not truncated',
    pass: html.length >= 15000,
    detail: html.length < 15000 ? `Only ${html.length} chars (min 15,000)` : undefined,
  })

  // G-07: Google Fonts @import present
  gates.push({
    id: 'G-07',
    name: 'Google Fonts imported',
    pass: lower.includes('@import') && lower.includes('fonts.googleapis.com'),
  })

  // G-08: No placeholder image URLs
  const placeholderHits = PLACEHOLDER_URL_PATTERNS.filter(p => p.test(html))
  gates.push({
    id: 'G-08',
    name: 'No placeholder image URLs',
    pass: placeholderHits.length === 0,
    detail: placeholderHits.length > 0 ? `Placeholder URLs found` : undefined,
  })

  // G-09: Inline CSS present (heuristic: <style> tag with content)
  const styleMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i)
  const styleContent = styleMatch?.[1] ?? ''
  gates.push({
    id: 'G-09',
    name: 'Inline CSS present',
    pass: styleContent.trim().length > 200,
    detail: styleContent.trim().length <= 200 ? 'Insufficient inline CSS' : undefined,
  })

  // G-10: Responsive (viewport meta or @media)
  gates.push({
    id: 'G-10',
    name: 'Responsive layout',
    pass: lower.includes('@media') || lower.includes('viewport'),
  })

  return gates
}

/** Merge structural results with AI critique results for G-04 and G-05. */
export function mergeAIGates(
  structural: GateResult[],
  aiResults: { noFabricatedTestimonials: boolean; noUnsupportedClaims: boolean; issues: string[] },
): GateResult[] {
  return structural.map(g => {
    if (g.id === 'G-04') return { ...g, pass: aiResults.noFabricatedTestimonials, detail: undefined }
    if (g.id === 'G-05') return { ...g, pass: aiResults.noUnsupportedClaims, detail: undefined }
    return g
  })
}

/** Compute final score and pass/fail from gate results. */
export function scoreGates(gates: GateResult[]): { score: number; pass: boolean; issues: string[] } {
  const passed = gates.filter(g => g.pass).length
  const score = Math.round((passed / gates.length) * 100)
  const issues = gates.filter(g => !g.pass).map(g => `${g.id} ${g.name}${g.detail ? `: ${g.detail}` : ''}`)
  const criticalFailed = gates.some(g => CRITICAL_GATE_IDS.has(g.id) && !g.pass)
  const pass = score >= 70 && !criticalFailed
  return { score, pass, issues }
}
