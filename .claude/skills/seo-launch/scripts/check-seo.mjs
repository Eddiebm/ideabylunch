#!/usr/bin/env node
// Usage: node check-seo.mjs <baseUrl> [path ...]
// Checks the rendered SEO tags on each path plus robots.txt, sitemap.xml and the OG image.
// With no paths, checks every URL listed in <baseUrl>/sitemap.xml.
// Exits 1 if anything FAILs. No dependencies.

const [base, ...argPaths] = process.argv.slice(2)
if (!base) {
  console.error('Usage: node check-seo.mjs <baseUrl> [path ...]')
  process.exit(2)
}
let failed = 0

const ok = (msg) => console.log(`  ok    ${msg}`)
const warn = (msg) => console.log(`  WARN  ${msg}`)
const fail = (msg) => { failed++; console.log(`  FAIL  ${msg}`) }

const attr = (html, re) => {
  const m = html.match(re)
  return m ? m[1].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'") : null
}
const meta = (html, key, by = 'name') =>
  attr(html, new RegExp(`<meta[^>]*${by}="${key}"[^>]*content="([^"]*)"`, 'i')) ??
  attr(html, new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${by}="${key}"`, 'i'))

async function get(url) {
  const res = await fetch(url, { redirect: 'follow' })
  return { res, body: res.headers.get('content-type')?.startsWith('image/') ? '' : await res.text() }
}

let paths = argPaths
if (!paths.length) {
  try {
    const xml = await (await fetch(new URL('/sitemap.xml', base))).text()
    paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)
  } catch {}
  if (!paths.length) paths = ['/']
}

const titles = new Map()
let ogImageUrl = null
let verificationSeen = false

for (const path of paths) {
  const url = new URL(path, base).toString()
  console.log(`\n${url}`)
  let html
  try {
    const { res, body } = await get(url)
    if (!res.ok) { fail(`HTTP ${res.status}`); continue }
    html = body
  } catch (e) { fail(`fetch failed: ${e.message}`); continue }

  const title = attr(html, /<title[^>]*>([^<]*)<\/title>/i)
  if (!title) fail('no <title>')
  else if (title.length > 65) warn(`title ${title.length} chars (aim ≤ 60): ${title}`)
  else ok(`title: ${title}`)
  if (title) {
    const brand = title.split(/\s[—|–-]\s/).pop()
    if (brand && brand.length > 2 && title.split(brand).length > 2) fail(`brand repeated in title: ${title}`)
    if (titles.has(title)) fail(`same title as ${titles.get(title)}`)
    else titles.set(title, path)
  }

  const desc = meta(html, 'description')
  if (!desc) fail('no meta description')
  else if (desc.length > 160) warn(`description ${desc.length} chars (aim ≤ 155)`)
  else ok(`description (${desc.length} chars)`)

  const canonical = attr(html, /<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i)
  if (!canonical) warn('no canonical link')
  else {
    const cPath = new URL(canonical, base).pathname.replace(/\/$/, '') || '/'
    const pPath = new URL(url).pathname.replace(/\/$/, '') || '/'
    // A canonical pointing elsewhere tells Google this page is a duplicate of that one —
    // usually a root-layout `alternates.canonical: '/'` inherited by a page that never set its own.
    cPath !== pPath ? fail(`canonical points to ${canonical}, not this page`) : ok(`canonical: ${canonical}`)
  }

  const og = meta(html, 'og:image', 'property')
  if (!og) fail('no og:image')
  else {
    if (!/^https?:\/\//.test(og)) fail(`og:image is not absolute (set metadataBase): ${og}`)
    else ok(`og:image: ${og}`)
    ogImageUrl ??= og
  }
  meta(html, 'og:title', 'property') ? ok('og:title') : warn('no og:title')
  meta(html, 'twitter:card') ? ok(`twitter:card: ${meta(html, 'twitter:card')}`) : warn('no twitter:card')

  const robots = meta(html, 'robots')
  if (robots && /noindex/i.test(robots)) warn(`page is noindex (${robots})`)

  if (meta(html, 'google-site-verification')) verificationSeen = true

  const ld = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
  if (ld) {
    for (const block of ld) {
      try {
        const data = JSON.parse(block.replace(/^<script[^>]*>|<\/script>$/gi, ''))
        const items = data['@graph'] ?? [data]
        ok(`JSON-LD: ${items.map((i) => i['@type']).join(', ')}`)
      } catch { fail('JSON-LD block is not valid JSON') }
    }
  }
}

console.log('\nSite-wide')
verificationSeen
  ? ok('google-site-verification meta present')
  : warn('no google-site-verification meta (fine if verifying via DNS, or env var not set here)')

try {
  const { res, body } = await get(new URL('/robots.txt', base))
  if (!res.ok) fail(`robots.txt HTTP ${res.status}`)
  else {
    ok('robots.txt')
    if (/^Disallow:\s*\/\s*$/m.test(body) && !/^Allow:\s*\/\s*$/m.test(body)) fail('robots.txt disallows everything')
    const sm = body.match(/^Sitemap:\s*(\S+)/mi)
    sm ? ok(`robots.txt points to ${sm[1]}`) : warn('robots.txt has no Sitemap: line')
  }
} catch (e) { fail(`robots.txt: ${e.message}`) }

try {
  const { res, body } = await get(new URL('/sitemap.xml', base))
  if (!res.ok) fail(`sitemap.xml HTTP ${res.status}`)
  else {
    const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    locs.length ? ok(`sitemap.xml: ${locs.length} URLs`) : fail('sitemap.xml has no <loc> entries')
    for (const path of paths) {
      const p = new URL(path, base).pathname.replace(/\/$/, '') || '/'
      if (!locs.some((l) => (new URL(l).pathname.replace(/\/$/, '') || '/') === p)) warn(`${p} not in sitemap`)
    }
  }
} catch (e) { fail(`sitemap.xml: ${e.message}`) }

if (ogImageUrl) {
  // og:image is absolute on the production domain; fetch the same path from the base under test.
  const u = new URL(ogImageUrl)
  const local = new URL(u.pathname + u.search, base)
  try {
    const res = await fetch(local)
    const type = res.headers.get('content-type') || ''
    res.ok && type.startsWith('image/') ? ok(`OG image renders (${type})`) : fail(`OG image ${res.status} ${type}`)
  } catch (e) { fail(`OG image: ${e.message}`) }
}

console.log(failed ? `\n${failed} FAIL(s)` : '\nAll checks passed')
process.exit(failed ? 1 : 0)
