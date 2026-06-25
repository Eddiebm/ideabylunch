# IdeaByLunch — Penpot Design Handoff
<!-- Fill this from Penpot. Claude Code reads this file and implements exactly what's here. -->
<!-- Sections marked [FILL] need your input. Sections marked [CURRENT] show the live values. -->

---

## 1. Colours
<!-- Copy hex values from Penpot colour library -->

```css
/* Brand */
--ibl-brand:          [FILL]   /* current: #0066CC — primary CTA, links */
--ibl-brand-hover:    [FILL]   /* current: #0055AA */
--ibl-brand-glow:     [FILL]   /* current: rgba(0,102,204,.25) */

/* Backgrounds */
--ibl-bg:             [FILL]   /* current: #F2F2F7 — page background */
--ibl-surface:        [FILL]   /* current: #FFFFFF — cards */
--ibl-surface-alt:    [FILL]   /* current: #F2F2F7 — inner card backgrounds */
--ibl-dark:           [FILL]   /* current: #1D1D1F — dark sections, nav CTA */

/* Text */
--ibl-text-primary:   [FILL]   /* current: #1D1D1F */
--ibl-text-secondary: [FILL]   /* current: #6E6E73 */
--ibl-text-tertiary:  [FILL]   /* current: #AEAEB2 */
--ibl-text-inverse:   [FILL]   /* current: #FFFFFF */

/* Status */
--ibl-green:          [FILL]   /* current: #30D158 — live dot, success */
--ibl-border:         [FILL]   /* current: rgba(0,0,0,.08) */
```

---

## 2. Typography
<!-- Copy from Penpot text styles -->

```css
/* Font families */
--ibl-font-display:   [FILL]   /* current: -apple-system, BlinkMacSystemFont, "SF Pro Display" */
--ibl-font-body:      [FILL]   /* current: -apple-system, BlinkMacSystemFont, "SF Pro Text" */

/* Scale — fill sizes and weights from Penpot */
--ibl-text-hero:      [FILL]   /* current: clamp(44px, 8.5vw, 84px) / weight 800 */
--ibl-text-h2:        [FILL]   /* current: 40px / weight 700 */
--ibl-text-h3:        [FILL]   /* current: 22px / weight 700 */
--ibl-text-body-lg:   [FILL]   /* current: 20px / weight 400 */
--ibl-text-body:      [FILL]   /* current: 15px / weight 400 */
--ibl-text-small:     [FILL]   /* current: 13px / weight 500 */
--ibl-text-label:     [FILL]   /* current: 11px / weight 600 / 0.04em tracking / uppercase */

/* Letter spacing */
--ibl-tracking-tight: [FILL]   /* current: -0.03em (headings) */
--ibl-tracking-label: [FILL]   /* current: 0.04em (eyebrows/labels) */
```

---

## 3. Spacing & Radius
<!-- Copy spacing scale from Penpot -->

```css
/* Spacing (fill from Penpot grid/spacing panel) */
--ibl-space-xs:   [FILL]   /* current: 8px */
--ibl-space-sm:   [FILL]   /* current: 12px */
--ibl-space-md:   [FILL]   /* current: 24px */
--ibl-space-lg:   [FILL]   /* current: 40px */
--ibl-space-xl:   [FILL]   /* current: 64px */
--ibl-space-2xl:  [FILL]   /* current: 96px */

/* Border radius */
--ibl-radius-sm:  [FILL]   /* current: 8px — nav CTA, tags */
--ibl-radius-md:  [FILL]   /* current: 12px — hero CTA */
--ibl-radius-lg:  [FILL]   /* current: 16px — cards */
--ibl-radius-xl:  [FILL]   /* current: 20px — large cards, sections */
--ibl-radius-pill:[FILL]   /* current: 100px — badge/pill */

/* Max widths */
--ibl-max-page:   [FILL]   /* current: 980px */
--ibl-max-content:[FILL]   /* current: 780px */
--ibl-max-text:   [FILL]   /* current: 580px — hero paragraph */
```

---

## 4. Shadow
```css
--ibl-shadow-card:    [FILL]   /* current: 0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06) */
--ibl-shadow-card-lg: [FILL]   /* current: 0 24px 80px rgba(0,0,0,.12) */
--ibl-shadow-cta:     [FILL]   /* current: 0 4px 16px rgba(0,102,204,.25) */
--ibl-shadow-hero:    [FILL]   /* current: 0 16px 48px rgba(0,0,0,.22) — featured card */
```

---

## 5. Sections — scope of this trial
<!-- For each section: describe layout, copy, any token overrides, mobile behaviour -->

### NAV
- Height: [FILL] (current: 52px)
- Background: [FILL] (current: rgba(242,242,247,0.92) + blur)
- Logo text: [FILL] (current: "IdeaByLunch" — 17px/600)
- Links: How it works · Pricing · FAQ · Free audit
- Primary CTA label: [FILL] (current: "Get your brief →")
- Mobile: hamburger at [FILL]px breakpoint (current: 680px)

### HERO
- Eyebrow badge: [FILL] (current: "The founder factory · {N} founders launched")
- H1 line 1: [FILL] (current: "Become a founder.")
- H1 line 2 (accent colour): [FILL] (current: "By lunch." in #0066CC)
- Body copy: [FILL] (current: "Your raw idea becomes a live, revenue-ready business…")
- Primary CTA label: [FILL] (current: "Get your free brief →")
- Secondary CTA label: [FILL] (current: "See a founder launch →")
- Subtext below CTAs: [FILL] (current: "No email. No card. Your brief is free — always.")
- Background: [FILL] (current: #F2F2F7)
- Layout: [FILL] (current: centred, max-width 820px)

### SECTION BELOW HERO
<!-- Tell me which section to include — pick one: -->
<!-- A. App preview card (the browser mockup with brief output) -->
<!-- B. Live launches feed (3 founder cards) -->
<!-- C. "Built on itself" dark proof block -->
<!-- D. Testimonials (3 cards) -->
<!-- E. How it works (3 steps) -->
- Section choice: [FILL — pick A/B/C/D/E above]
- Heading: [FILL]
- Layout: [FILL]
- Any copy changes: [FILL]

### FOOTER
- Links to include: [FILL] (current: Free Site Audit · The Empire · Idea Generator · Tagline Generator · Logo Generator · Built by Lunch · Terms · Privacy)
- Copyright line: [FILL] (current: "© 2026 IdeaByLunch · The fastest way to become a founder.")
- Layout: [FILL] (current: centred, flex-wrap)

---

## 6. Component notes
<!-- Any new components Penpot defines that don't exist yet -->

| Component | Exists? | Notes |
|-----------|---------|-------|
| NavBar | ✓ `app/components/NavBar.tsx` | May need token updates |
| Button (primary) | ✗ | Inline styles only — create if Penpot defines it |
| Button (secondary) | ✗ | Inline styles only |
| Card | ✗ | Inline styles only |
| Badge/eyebrow label | ✗ | Inline styles only |

---

## 7. What stays the same
- Edge runtime (`export const runtime = 'edge'` on homepage) — do not remove
- `/app` route for the brief generator — no changes
- All API routes — no changes
- Pricing logic (`app/lib/pricing.ts`) — no changes

---

## 8. Reference files
<!-- Drop files in design/reference/ -->
- `design/reference/v0-homepage.tsx` — v0 export (reference only, not final)
- `design/reference/v0-screenshot.png` — optional screenshot
- `design/reference/penpot-export.json` — optional Penpot export

---
*Claude Code implements from this file. Last section wins if anything conflicts: **Penpot overrides v0 overrides current.**
