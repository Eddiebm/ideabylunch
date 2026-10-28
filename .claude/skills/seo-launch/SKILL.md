---
name: seo-launch
description: Make a live Next.js (App Router) website findable on Google. Covers the five post-launch SEO steps — Google Search Console verification, sitemap.xml (+ robots.txt), Open Graph share image, Google Business Profile readiness (LocalBusiness JSON-LD), and per-page meta titles/descriptions — then verifies the rendered tags and hands the user a checklist for the steps only they can do in Google's dashboards. Use when the user says "set up SEO", "get my site on Google", "submit to Search Console", "add a sitemap", "add an OG image", "my link preview looks boring", "set up meta tags", or "after my website is live, what now".
---

# SEO launch

Five things every site needs after it goes live. Three are code (do them), two are dashboard
clicks only the owner can do (hand them a checklist). Work in this order, audit first —
most sites already have some of this, and the job is to fill gaps, not rewrite what works.

This repo is Next.js 15+ App Router. Per `AGENTS.md`, check `node_modules/next/dist/docs/`
if present before using an API you're unsure of. All metadata here uses the file conventions
(`app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx`) and the `Metadata` export.

## 0. Audit

Find what exists before changing anything:

```bash
ls app/sitemap.* app/robots.* app/opengraph-image.* app/twitter-image.* public/sitemap.xml public/robots.txt 2>/dev/null
grep -n "metadataBase\|verification\|openGraph\|twitter" app/layout.tsx
grep -rln "ld+json" app
```

List every public route (`find app -name page.tsx -not -path "*/api/*"`). For each, note whether
it has a title/description: a `metadata`/`generateMetadata` export in the page, or a `layout.tsx`
beside it. **`'use client'` pages cannot export metadata** — they need a sibling `layout.tsx`.

Find the canonical domain (look for `metadataBase`, `NEXT_PUBLIC_SITE_URL`, existing robots/sitemap,
`vercel.json`). If there is none, ask the user — don't guess a domain.

## 1. Google Search Console verification

In the root `app/layout.tsx` metadata, render the verification tag from an env var so the
token never lives in code and the tag is absent until set:

```ts
verification: process.env.GOOGLE_SITE_VERIFICATION
  ? { google: process.env.GOOGLE_SITE_VERIFICATION }
  : undefined,
```

Also make sure `metadataBase: new URL(SITE)` is set — without it OG image and canonical URLs are
relative and social cards break.

Tell the user the **Domain property + DNS TXT** method needs no code at all and is preferred;
the env var is for the URL-prefix "HTML tag" method.

## 2. sitemap.xml + robots.txt

`app/sitemap.ts` returning `MetadataRoute.Sitemap`: every indexable route with absolute URLs.
For dynamic routes (`[slug]`), generate entries from the same source of truth the page uses
(the slug map/array or `generateStaticParams`) — don't hand-maintain a second list if you can
import one. Exclude anything private: api, admin, dashboard, login, previews, per-user pages.

`app/robots.ts`: allow `/`, disallow the private paths, and set `sitemap: '<SITE>/sitemap.xml'`.

Cross-check: every public route from the audit is either in the sitemap or deliberately excluded.

## 3. Open Graph image

`app/opengraph-image.tsx` with `ImageResponse` from `next/og`, `size = { width: 1200, height: 630 }`,
`alt`, `contentType = 'image/png'`. It is inherited by every route, so one root image covers the site;
add route-level `opengraph-image.tsx` only for pages that deserve their own card (a product, a niche
landing page). Design: brand name, one big headline (the site's actual value prop, read from the
homepage hero), a short subline, the domain. Only flexbox layouts work in `ImageResponse`
(every multi-child `div` needs `display: 'flex'`).

Root `openGraph` and `twitter` (`card: 'summary_large_image'`) blocks should carry title,
description, siteName, url, locale.

## 4. Google Business Profile readiness

GBP is a dashboard listing, not code — but it only applies to businesses that **meet customers in
person** (storefront or service area: plumber, salon, clinic, cafe). Decide which case you're in:

- **Local business:** add `LocalBusiness` (or the specific subtype: `Plumber`, `HairSalon`,
  `Restaurant`, …) JSON-LD on the homepage with `name`, `url`, `telephone`, `address`
  (`PostalAddress`), `geo`, `openingHoursSpecification`, `areaServed`, `image`, and `sameAs`
  (include the GBP/Maps URL once it exists). Make the NAP (name, address, phone) on the page match
  the GBP listing **exactly** — Google cross-checks it. Ask the user for any value you don't have;
  never invent an address, phone, or hours.
- **Online-only product/SaaS:** not eligible for GBP — say so and skip it. Instead make sure there is
  `Organization` + `WebSite` JSON-LD with `logo` and `sameAs` (social profiles).

Render JSON-LD as `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />`
in a server component.

## 5. Meta titles and descriptions

Root layout: `title: { default: '<Brand> — <value prop>', template: '%s — <Brand>' }` plus a default
description. Then every public route gets its own:

- server page → `export const metadata` or `generateMetadata` (dynamic routes)
- client page → sibling `layout.tsx` exporting `metadata` and returning `children`

Each needs `title` (≤ ~60 chars, the template adds the brand), `description` (≤ ~155 chars, says what
the visitor gets), and `alternates: { canonical: '/path' }`. Write copy from what the page actually
does — read its headings and UI text; don't claim "free" or features the page doesn't have.
Pages that shouldn't be indexed get `robots: { index: false, follow: false }`.

Three traps that look fine in code review but break in the rendered HTML (all found on this repo):

- **Inherited canonical.** A root `alternates: { canonical: '/' }` is inherited by every page that
  doesn't set its own, so those pages tell Google they're duplicates of the homepage and drop out of
  search. Every page — especially `generateMetadata` on `[slug]` routes — sets its own canonical.
- **Brand twice.** With a `%s — Brand` template, a page title of `'Pricing — Brand'` or
  `'Pricing | Brand'` renders as `Pricing — Brand — Brand`. Page titles never include the brand;
  `openGraph.title` (no template) does.
- **Lost share image.** A *page* that exports its own `openGraph` object replaces the parent's and can
  drop the inherited `opengraph-image`. Add `images: '/opengraph-image'` to any page-level `openGraph`.

## 6. Verify

Typecheck and build (`npx tsc --noEmit`, `npx next build`; install deps with `npm install` first if
`node_modules` is missing, then restore any lockfile churn with `git checkout package-lock.json`).
Then run the production server with a dummy token and check the rendered output:

```bash
GOOGLE_SITE_VERIFICATION=test123 npx next start -p 3456 > /dev/null 2>&1 &
node .claude/skills/seo-launch/scripts/check-seo.mjs http://localhost:3456          # every sitemap URL
node .claude/skills/seo-launch/scripts/check-seo.mjs http://localhost:3456 /grow    # or specific paths
```

Stop the server by PID afterwards (`ps aux | grep next-server`, then `kill <pid>`) — `pkill -f` with
a pattern that matches your own command line kills your shell, and a stale server left on the port
will serve the *old* build to your next check.

With no paths it checks every URL in the sitemap. Per page: title (missing, too long, brand repeated,
duplicate across pages), description, canonical (missing or pointing at another page), og:image
(missing or relative), og:title, twitter:card, noindex, JSON-LD validity. Site-wide: verification tag,
robots.txt (and that it doesn't block everything), sitemap.xml, and that the OG image renders.
Fix every FAIL before committing; fix WARNs where the copy allows. The same script works against the
live domain after deploy.

## 7. Hand off the manual steps

Write (or update) `SEO_LAUNCH.md` at the repo root with what's done and what the owner must do, then
summarize it in chat:

1. **Search Console:** search.google.com/search-console → Add property → Domain → add the DNS TXT
   record at the registrar → Verify. (Or URL-prefix + HTML tag → set `GOOGLE_SITE_VERIFICATION` in
   the host's production env → redeploy → Verify.)
2. **Submit sitemap:** Search Console → Sitemaps → `sitemap.xml` → Submit. Then URL Inspection →
   Request indexing for the homepage and top pages.
3. **Google Business Profile** (local businesses only): business.google.com → add business, same
   name/address/phone as the site, website URL, hours, category, photos → verify (postcard, phone,
   or video). Then add the Maps URL to the JSON-LD `sameAs`.
4. **Preview the share card** after deploy: opengraph.xyz, LinkedIn Post Inspector, or paste the
   link into a chat app.

Be clear in the final summary about which steps are done in code and which still need the user.
