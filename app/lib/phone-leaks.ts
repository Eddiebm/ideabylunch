// Phone "leak" checks for local-service sites (plumbers, HVAC, roofers, med spas...).
// Deterministic, read from raw HTML — no headless browser on the edge, so "screens"
// are an estimate from visible text and images in document order.

export type LeakStatus = 'pass' | 'fail' | 'skipped' | 'unknown'

export type LeakCheck = {
  id: 'ad-promise' | 'google-rating' | 'call-button' | 'book-depth'
  label: string
  status: LeakStatus
  detail: string
}

export type PhoneLeaks = {
  checks: LeakCheck[]
  // Kept so the ad-promise check can be re-run on a cached audit
  firstScreenText: string
  adPromise: string | null
}

// Roughly what fits on one ~390x700 phone screen once headers, padding and line
// height are accounted for. An image block takes about half a screen.
const SCREEN_CHARS = 500
const IMAGE_CHARS = 250
const MIN_READABLE_CHARS = 200

const BOOK_TEXT = /\b(book|schedule|reserve|request\s+(service|an?\s+appointment|a\s+quote|an?\s+estimate)|get\s+(a\s+)?(free\s+)?(quote|estimate)|free\s+(quote|estimate)|appointment)\b/i
const BOOK_HREF = /housecallpro|servicetitan|scheduleengine|getjobber|jobber\.com|calendly|acuityscheduling|booksy|vagaro|zocdoc|square\.site\/book|\/book|\/schedule|\/appointment/i
const RATING_TEXT = /\b[345]\.\d\s*(\/\s*5|out of 5|stars?|★)|★{4,}|\bgoogle\s+(reviews?|rating)|\b\d[\d,]*\+?\s+(five[- ]star|5[- ]star|google)\s+reviews?/i
const RATING_WIDGET = /elfsight|trustindex|birdeye|podium|embedsocial|reviewsonmywebsite|grade\.us|nicejob|sociablekit|trustmary|widget\.reviews/i
const PHONE_TEXT = /\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/

const STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'to', 'of', 'in', 'on', 'for', 'with', 'your', 'you', 'our', 'we',
  'is', 'are', 'at', 'by', 'or', 'from', 'it', 'us', 'call', 'now', 'today', 'get', 'near', 'me',
])

function decode(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function visibleText(html: string): string {
  return decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim()
}

type Token =
  | { kind: 'text'; text: string }
  | { kind: 'img' }
  | { kind: 'link'; href: string; text: string }

// Walk the body in order, turning it into text runs, images and links/buttons.
function tokenize(html: string): Token[] {
  const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? html)
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')

  const tokens: Token[] = []
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a>|<button\b[^>]*>([\s\S]*?)<\/button>|<img\b[^>]*>/gi
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(body))) {
    const before = visibleText(body.slice(last, m.index))
    if (before) tokens.push({ kind: 'text', text: before })
    if (m[0].toLowerCase().startsWith('<img')) {
      tokens.push({ kind: 'img' })
    } else if (m[1] !== undefined) {
      const href = m[1].match(/href\s*=\s*["']([^"']*)["']/i)?.[1] ?? ''
      tokens.push({ kind: 'link', href: decode(href), text: visibleText(m[2]) })
    } else {
      tokens.push({ kind: 'link', href: '', text: visibleText(m[3] ?? '') })
    }
    last = re.lastIndex
  }
  const rest = visibleText(body.slice(last))
  if (rest) tokens.push({ kind: 'text', text: rest })
  return tokens
}

function tokenCost(t: Token): number {
  if (t.kind === 'img') return IMAGE_CHARS
  return t.text.length + 1
}

function screenAt(offset: number): number {
  return Math.floor(offset / SCREEN_CHARS) + 1
}

function significantWords(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9$%\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
}

export function checkAdPromise(adPromise: string | null, firstScreenText: string): LeakCheck {
  const base = { id: 'ad-promise' as const, label: "Repeats the ad's promise on the first screen" }
  const words = adPromise ? significantWords(adPromise) : []
  if (!adPromise || words.length === 0) {
    return { ...base, status: 'skipped', detail: 'Paste your Google ad headline when you run the audit to check this.' }
  }
  const screen = ` ${significantWords(firstScreenText).join(' ')} `
  const hits = words.filter((w) => screen.includes(` ${w} `))
  const ratio = hits.length / words.length
  if (ratio >= 0.6) {
    return { ...base, status: 'pass', detail: `The first screen echoes the ad (${hits.length} of ${words.length} key words).` }
  }
  const missing = words.filter((w) => !hits.includes(w))
  return {
    ...base,
    status: 'fail',
    detail: `The ad says "${adPromise}", but the first screen doesn't. Missing: ${missing.slice(0, 5).join(', ')}.`,
  }
}

export function analyzePhoneLeaks(html: string, adPromise: string | null): PhoneLeaks {
  const tokens = tokenize(html)
  const totalText = tokens.reduce((n, t) => n + (t.kind === 'img' ? 0 : t.text.length), 0)

  // First screen = everything that starts within the first SCREEN_CHARS of layout
  let offset = 0
  const firstScreen: Token[] = []
  let bookScreen: number | null = null
  let bookLabel = ''
  for (const t of tokens) {
    if (offset < SCREEN_CHARS) firstScreen.push(t)
    if (bookScreen === null && t.kind === 'link' && !/^tel:/i.test(t.href)) {
      if (BOOK_TEXT.test(t.text) || BOOK_HREF.test(t.href)) {
        bookScreen = screenAt(offset)
        bookLabel = t.text || t.href
      }
    }
    offset += tokenCost(t)
  }
  const firstScreenText = firstScreen
    .map((t) => (t.kind === 'img' ? '' : t.text))
    .filter(Boolean)
    .join(' ')
    .slice(0, 1000)

  if (totalText < MIN_READABLE_CHARS) {
    const unreadable = 'This page builds itself with JavaScript, so we could not read what a phone shows.'
    return {
      firstScreenText,
      adPromise,
      checks: [
        { ...checkAdPromise(adPromise, ''), status: 'unknown', detail: unreadable },
        { id: 'google-rating', label: 'Shows the Google rating', status: 'unknown', detail: unreadable },
        { id: 'call-button', label: 'Real call button on the first screen', status: 'unknown', detail: unreadable },
        { id: 'book-depth', label: 'Can book within 3 screens', status: 'unknown', detail: unreadable },
      ],
    }
  }

  // Google rating
  const allText = tokens.map((t) => (t.kind === 'img' ? '' : t.text)).join(' ')
  const hasSchemaRating = /"aggregateRating"/i.test(html)
  let rating: LeakCheck
  if (RATING_TEXT.test(allText)) {
    rating = { id: 'google-rating', label: 'Shows the Google rating', status: 'pass', detail: 'A star rating or review count is visible on the page.' }
  } else if (RATING_WIDGET.test(html)) {
    rating = { id: 'google-rating', label: 'Shows the Google rating', status: 'pass', detail: 'A review widget loads on the page (it appears only after scripts run).' }
  } else {
    rating = {
      id: 'google-rating',
      label: 'Shows the Google rating',
      status: 'fail',
      detail: hasSchemaRating
        ? 'The rating sits in hidden structured data only. Visitors never see it.'
        : 'No star rating or review count anywhere on the page.',
    }
  }

  // Call button
  const firstTel = firstScreen.find((t) => t.kind === 'link' && /^tel:/i.test(t.href))
  const anyTel = tokens.some((t) => t.kind === 'link' && /^tel:/i.test(t.href))
  let call: LeakCheck
  if (firstTel) {
    call = { id: 'call-button', label: 'Real call button on the first screen', status: 'pass', detail: 'A tap-to-call link is on the first screen.' }
  } else {
    call = {
      id: 'call-button',
      label: 'Real call button on the first screen',
      status: 'fail',
      detail: anyTel
        ? 'There is a tap-to-call link, but not on the first screen.'
        : PHONE_TEXT.test(firstScreenText)
        ? 'The phone number is plain text. On a phone it is not tappable.'
        : 'No tap-to-call link on the first screen.',
    }
  }

  // Booking depth
  let book: LeakCheck
  if (bookScreen === null) {
    book = { id: 'book-depth', label: 'Can book within 3 screens', status: 'fail', detail: 'No booking or quote button found anywhere on the page.' }
  } else if (bookScreen > 3) {
    book = { id: 'book-depth', label: 'Can book within 3 screens', status: 'fail', detail: `The first "${bookLabel.slice(0, 40)}" button is about ${bookScreen} screens down.` }
  } else {
    book = { id: 'book-depth', label: 'Can book within 3 screens', status: 'pass', detail: `"${bookLabel.slice(0, 40)}" shows up by screen ${bookScreen}.` }
  }

  return {
    firstScreenText,
    adPromise,
    checks: [checkAdPromise(adPromise, firstScreenText), rating, call, book],
  }
}
