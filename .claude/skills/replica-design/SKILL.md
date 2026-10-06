---
name: replica-design
description: Replica step 4. Create an original identity for the rebuild — a new name, palette, type and component style that is clearly distinct from the original app — and record it so later steps never borrow the original's brand. Use for /replica-design, "name my clone", "design system for the rebuild".
---

# replica-design — your own name and look

**Job:** write `replica/design.md` (and design tokens in code if a project exists).

Read `.claude/skills/_replica/GUARDRAILS.md` and `replica/brand-blocklist.json`.

## 1. Name
Propose 5 names that are **not** confusingly similar to anything in
`names`/`terms` (different sound, spelling, meaning; no shared distinctive
root). For each, note: available-looking `.com` (say "unverified"), and any
obvious existing products with that name you noticed. The user picks one.
Remind them `/replica-legal` runs the real trademark checks.

## 2. Palette
Pick a primary, accent, neutrals, success/warn/error. Each brand color must
differ from every `colors` entry in the blocklist by more than `colorTolerance`
(RGB Euclidean distance) — compute it and show the numbers. Choose a different
hue family for the primary than the original's primary. Check text contrast
meets WCAG AA (4.5:1 body, 3:1 large).

## 3. Type, shape, voice
- Free-licensed fonts only (e.g. Google Fonts); note the license.
- Radius, spacing scale, shadow style — pick deliberately different from the
  original's distinctive look.
- Voice: 3 adjectives and 5 sample microcopy lines written fresh — never adapt
  the original's copy.

## 4. Logo
A simple wordmark or geometric mark you design (SVG). No resemblance to the
original's logo shape or icon. No AI images trained to mimic it.

## 5. Output
`replica/design.md` with name, tokens table, fonts + licenses, voice, logo SVG.
If a project exists, write tokens to its theme file (CSS variables / Tailwind
config). Tick the design item in `replica/progress.md`. Next: `/replica-scaffold`.
