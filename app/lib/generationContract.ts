/**
 * Shared generation contract constants.
 *
 * Every style prompt in build-website/route.ts must include TESTIMONIALS_GUARD.
 * MINIMAL and BOLD also include IMPECCABLE_CRAFT_RULES (via template literals already present).
 * DEFAULT and IMPECCABLE must add IMPECCABLE_CRAFT_RULES explicitly (D-002 fix).
 * BESPOKE has an inline equivalent but must still add TESTIMONIALS_GUARD (D-003 fix).
 */

/**
 * D-003: Prevents AI from fabricating testimonial names, companies, and quotes.
 * Append to every style prompt.
 */
export const TESTIMONIALS_GUARD = `
SOCIAL PROOF — TESTIMONIALS RULE (non-negotiable):
If the brief does not include real customer testimonials, you MUST include exactly 3 placeholder testimonial cards.
Each placeholder card MUST:
- Display "[Placeholder — replace with real customer quote before publishing]" as visible text inside the card
- Use generic names like "Customer A", "Customer B", "Customer C" — never invent specific names like "Sarah Johnson at Acme Corp"
- Never fabricate specific companies, job titles, or endorsement quotes
- Never invent results or metrics attributed to named individuals
If the brief provides real testimonials, use them verbatim. Otherwise, placeholder cards only — no fabrication.`

/**
 * D-002: Shared quality floor rules — single source of truth for every prompt.
 * Keeps typography/shadow rules consistent across styles.
 */
export const QUALITY_FLOOR = `
QUALITY FLOOR — NON-NEGOTIABLE FOR ALL DESIGNS:

BANNED PATTERNS (immediate tells of AI-generated slop):
- No gradient text (background-clip: text is banned)
- No glassmorphism — no blurred translucent cards, no frosted glass backgrounds
- No colored border-left/right stripes on cards or list items
- No identical card grids: same-size cards with icon + heading + paragraph repeated 3–6 times
- No hero-metric layouts: big number + small label + supporting stats + gradient accent
- No bounce or elastic CSS easing — use cubic-bezier(0.16, 1, 0.3, 1) only
- No neon glow effects as decoration
- No "could be any startup" purple/blue gradient hero sections

TYPOGRAPHY QUALITY:
- Body line-height must be 1.6 minimum — never 1.4 or 1.5
- Headings use fluid clamp() sizing, body uses fixed rem values
- Limit to 2 font families maximum — one display, one body
- Body prose capped at 65–75ch via max-width

LAYOUT & ELEVATION QUALITY:
- Flat surfaces at rest — shadows only appear on hover/elevation, never decorative
- Shadow alpha must not exceed 0.15 — higher reads as 2014 Material Design
- Do not nest cards inside cards
- Section rhythm: 80–120px between major sections`
