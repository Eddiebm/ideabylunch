// Fetching a URL a visitor typed in, without letting it reach places it
// shouldn't: only http(s) on the standard ports, never localhost or a
// private/link-local/cloud-metadata address, and every redirect hop is checked
// the same way (a public page can redirect to 169.254.169.254).
//
// No imports, so it runs on the Edge runtime too. Edge has no DNS lookup, so
// there a public hostname that resolves to a private address isn't caught. On
// Node use fetchPublicPage from safe-fetch-node, which checks the address the
// connection actually uses.

export type Resolve = (hostname: string) => Promise<Array<{ address: string }>>

function ipv4Blocked(ip: string): boolean {
  const [a, b, c] = ip.split('.').map(Number)
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
    (a === 169 && b === 254) || // link-local, cloud metadata
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) || // IETF special-purpose
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224 // multicast and reserved
  )
}

function ipv6Blocked(ip: string): boolean {
  const lower = ip.toLowerCase()
  if (lower === '::' || lower === '::1') return true
  if (/^f[cd]/.test(lower) || /^fe[89ab]/.test(lower)) return true // unique local, link-local
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower)
  if (mapped) return ipv4Blocked(mapped[1])
  const mappedHex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(lower)
  if (mappedHex) {
    const hi = parseInt(mappedHex[1], 16)
    const lo = parseInt(mappedHex[2], 16)
    return ipv4Blocked(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`)
  }
  return false
}

const isIPv4 = (host: string) => /^\d+\.\d+\.\d+\.\d+$/.test(host)

export function isBlockedAddress(ip: string): boolean {
  if (isIPv4(ip)) return ipv4Blocked(ip)
  if (ip.includes(':')) return ipv6Blocked(ip)
  return true
}

/** The URL if it may be requested, otherwise null. */
export async function publicUrl(raw: string, base?: string, resolve?: Resolve): Promise<URL | null> {
  let url: URL
  try {
    url = base ? new URL(raw, base) : new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  if (url.username || url.password) return null
  if (url.port && url.port !== '80' && url.port !== '443') return null
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase().replace(/\.+$/, '') // 'localhost.' is localhost to DNS
  if (host === 'localhost' || /\.(localhost|local|internal)$/.test(host)) return null
  // URL parsing already turns 2130706433 or 0x7f.1 into 127.0.0.1, so literals arrive dotted.
  if (isIPv4(host) || host.includes(':')) return isBlockedAddress(host) ? null : url
  if (!host.includes('.')) return null // single-label names only make sense on a private network
  if (resolve) {
    try {
      const records = await resolve(host)
      if (!records.length || records.some((r) => isBlockedAddress(r.address))) return null
    } catch {
      return null
    }
  }
  return url
}

/**
 * GET a visitor-supplied URL, following at most a few redirects, each
 * re-checked. Null when the address (or a redirect target) isn't allowed.
 */
export async function fetchPublicUrl(
  raw: string,
  init: { headers?: Record<string, string>; signal?: AbortSignal; resolve?: Resolve; maxRedirects?: number },
): Promise<Response | null> {
  let url = await publicUrl(raw, undefined, init.resolve)
  for (let hop = 0; url && hop <= (init.maxRedirects ?? 3); hop++) {
    const res = await fetch(url, { headers: init.headers, signal: init.signal, redirect: 'manual' })
    const location = res.headers.get('location')
    if (res.status < 300 || res.status >= 400 || !location) return res
    url = await publicUrl(location, url.toString(), init.resolve)
  }
  return null
}
