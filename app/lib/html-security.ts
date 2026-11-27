const ALLOWED_SCRIPT_HOSTS = new Set([
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdn.jsdelivr.net',
  'cdnjs.cloudflare.com',
  'unpkg.com',
])

const MIN_HTML_BYTES = 5_000
const MAX_HTML_BYTES = 2_000_000

export interface HtmlValidationResult {
  valid: boolean
  error?: string
}

export function validateHtml(html: string): HtmlValidationResult {
  if (!html || typeof html !== 'string') {
    return { valid: false, error: 'HTML is empty or not a string' }
  }

  const bytes = new TextEncoder().encode(html).length

  if (bytes < MIN_HTML_BYTES) {
    return { valid: false, error: `HTML too small (${bytes} bytes, minimum ${MIN_HTML_BYTES})` }
  }
  if (bytes > MAX_HTML_BYTES) {
    return { valid: false, error: `HTML too large (${bytes} bytes, maximum ${MAX_HTML_BYTES})` }
  }

  if (!html.trim().toLowerCase().startsWith('<!doctype html')) {
    return { valid: false, error: 'HTML must begin with <!DOCTYPE html>' }
  }

  // Block eval() usage
  if (/\beval\s*\(/.test(html)) {
    return { valid: false, error: 'HTML contains eval() which is not allowed' }
  }

  // Block window.location redirects
  if (/window\s*\.\s*location\s*(?:\.href\s*=|\.replace\s*\(|\.assign\s*\()/.test(html)) {
    return { valid: false, error: 'HTML contains window.location redirect which is not allowed' }
  }

  // Check external script sources against allowlist
  const scriptSrcRegex = /<script[^>]+src=["']([^"']+)["']/gi
  let match: RegExpExecArray | null
  while ((match = scriptSrcRegex.exec(html)) !== null) {
    try {
      const url = new URL(match[1])
      if (!ALLOWED_SCRIPT_HOSTS.has(url.hostname)) {
        return { valid: false, error: `External script from disallowed host: ${url.hostname}` }
      }
    } catch {
      // relative path — allowed
    }
  }

  return { valid: true }
}
