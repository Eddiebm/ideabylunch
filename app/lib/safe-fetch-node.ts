// The Node-only half of safe-fetch: a GET whose connection is made to an
// address that was checked at connect time. Resolving the name once to check
// it and letting fetch resolve it again would leave a gap: a hostile DNS
// server can answer the check with a public address and the connection with
// 127.0.0.1. Here the lookup that's checked is the one the socket uses.

import { lookup, type LookupAddress } from 'node:dns'
import http from 'node:http'
import https from 'node:https'
import type { LookupFunction } from 'node:net'
import { isBlockedAddress, publicUrl } from './safe-fetch'

const MAX_BODY_BYTES = 2_000_000

const checkedLookup: LookupFunction = (hostname, options, callback) => {
  lookup(hostname, { ...options, all: true }, (err, addresses: LookupAddress[]) => {
    if (err) return callback(err, '', 0)
    if (!addresses.length || addresses.some((a) => isBlockedAddress(a.address))) {
      return callback(Object.assign(new Error(`${hostname} resolves to a blocked address`), { code: 'EBLOCKED' }), '', 0)
    }
    if (options.all) return (callback as unknown as (e: null, a: LookupAddress[]) => void)(null, addresses)
    callback(null, addresses[0].address, addresses[0].family)
  })
}

function getOnce(url: URL, signal: AbortSignal): Promise<{ status: number; location: string | null; body: string }> {
  const client = url.protocol === 'https:' ? https : http
  return new Promise((resolve, reject) => {
    const req = client.get(url, { lookup: checkedLookup, signal, headers: { 'User-Agent': 'IdeaByLunchBot/1.0 (+https://ideabylunch.com)' } }, (res) => {
      const status = res.statusCode ?? 0
      const location = typeof res.headers.location === 'string' ? res.headers.location : null
      if (status >= 300 && status < 400) {
        res.resume()
        return resolve({ status, location, body: '' })
      }
      const chunks: Buffer[] = []
      let size = 0
      res.on('data', (chunk: Buffer) => {
        size += chunk.length
        if (size > MAX_BODY_BYTES) return res.destroy()
        chunks.push(chunk)
      })
      res.on('close', () => resolve({ status, location, body: Buffer.concat(chunks).toString('utf8') }))
      res.on('error', reject)
    })
    req.on('error', reject)
  })
}

/**
 * GET a visitor-supplied URL on Node: the page's status and text, or null
 * when the address, a redirect target, or anything the name resolves to at
 * connect time isn't public.
 */
export async function fetchPublicPage(raw: string, init: { signal: AbortSignal; maxRedirects?: number }): Promise<{ ok: boolean; status: number; text: string } | null> {
  let url = await publicUrl(raw)
  for (let hop = 0; url && hop <= (init.maxRedirects ?? 3); hop++) {
    let res
    try {
      res = await getOnce(url, init.signal)
    } catch (err) {
      if ((err as { code?: string }).code === 'EBLOCKED') return null
      throw err
    }
    if (res.status < 300 || res.status >= 400 || !res.location) {
      return { ok: res.status >= 200 && res.status < 300, status: res.status, text: res.body }
    }
    url = await publicUrl(res.location, url.toString())
  }
  return null
}
