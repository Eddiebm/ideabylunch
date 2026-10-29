# SEO launch checklist

The five "after your site is live" steps, and where each one stands.

To redo or re-check all of this, run the `seo-launch` skill (`.claude/skills/seo-launch/`), or just the checker:
`node .claude/skills/seo-launch/scripts/check-seo.mjs https://ideabylunch.com`

It also runs automatically: on every pull request (`.github/workflows/ci.yml`), and against the live site
daily and after each production deploy (`.github/workflows/seo-live.yml`). A failing scheduled run emails the repo owner.

## 1. Submit to Google Search Console — manual
1. https://search.google.com/search-console → **Add property**.
2. Prefer the **Domain** property (`ideabylunch.com`) and verify with the DNS TXT record at the registrar — this covers every subdomain and http/https.
3. Or use a **URL prefix** property (`https://ideabylunch.com/`) with the **HTML tag** method:
   copy the `content="..."` value, set it as `GOOGLE_SITE_VERIFICATION` in Vercel (Production), redeploy, then click **Verify**.
   `app/layout.tsx` renders `<meta name="google-site-verification">` only when that env var is set.

## 2. Submit sitemap.xml — manual (sitemap is already generated)
- `app/sitemap.ts` serves https://ideabylunch.com/sitemap.xml (home, tools, niche and alternative pages).
- `app/robots.ts` points crawlers at it.
- In Search Console → **Sitemaps** → enter `sitemap.xml` → **Submit**.
- Then use **URL Inspection** → **Request indexing** on `/`, `/audit`, `/idea-generator`.
- When adding a new public page, add it to `app/sitemap.ts`.

## 3. OG image — done
- `app/opengraph-image.tsx` renders a 1200×630 card and is inherited by every page.
- Check it with https://www.opengraph.xyz or the LinkedIn Post Inspector after deploy.

## 4. Google Business Profile — manual, only if eligible
Google Business Profile is for businesses that meet customers in person (storefront or service area).
An online-only product like IdeaByLunch is generally not eligible, so skip this unless there is a real address.
If one is created later, add its URL to `sameAs` in the Organization JSON-LD in `app/page.tsx`
(along with X/LinkedIn/etc. profiles).

## 5. Meta title & description — done
- Defaults + `%s — IdeaByLunch` title template in `app/layout.tsx`.
- Per-page titles/descriptions via `metadata` / `generateMetadata` or a `layout.tsx` next to client pages
  (`grow`, `app`, `distribute`, `hunt`, `logo`, `refer`, `taglines`).
- Keep titles under ~60 characters and descriptions under ~155.
