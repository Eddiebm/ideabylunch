export const runtime = 'edge'
import { Redis } from '@upstash/redis'
import { notFound } from 'next/navigation'

interface PreviewData {
  token: string
  businessName: string
  phone: string | null
  address: string | null
  city: string | null
  category: string | null
  html: string
  createdAt: number
  status: string
}

async function getPreview(slug: string): Promise<PreviewData | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  const redis = new Redis({ url, token })
  const raw = await redis.get(`preview:${slug}`)
  if (!raw) return null
  return typeof raw === 'string' ? JSON.parse(raw) : raw as PreviewData
}

export default async function PreviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getPreview(slug)

  if (!data) notFound()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://idea2lunch.com'
  const checkoutUrl = `${appUrl}/app?preview=${slug}&business=${encodeURIComponent(data.businessName)}`

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif; }
        @keyframes slideDown { from { transform: translateY(-100%); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .7 } }
      `}</style>

      {/* Sticky conversion banner */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999999,
        background: 'linear-gradient(135deg, #0D1117 0%, #1a2236 100%)',
        borderBottom: '1px solid rgba(255,255,255,.08)',
        animation: 'slideDown .4s ease',
        boxShadow: '0 4px 24px rgba(0,0,0,.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#30D158', flexShrink: 0, animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {data.businessName} — your free website is ready
            </span>
            {data.city && (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', flexShrink: 0 }}>· {data.city}</span>
            )}
          </div>
          <a
            href={checkoutUrl}
            style={{
              background: 'linear-gradient(135deg, #0066CC, #0052A3)',
              color: '#fff', borderRadius: 10, padding: '10px 20px',
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              boxShadow: '0 2px 12px rgba(0,102,204,.4)', whiteSpace: 'nowrap',
            }}
          >
            Go live — $299 →
          </a>
        </div>
        <div style={{
          background: 'rgba(0,0,0,.3)', padding: '7px 20px',
          display: 'flex', gap: 20, alignItems: 'center',
          fontSize: 11, color: 'rgba(255,255,255,.45)',
          borderTop: '1px solid rgba(255,255,255,.04)', flexWrap: 'wrap',
        }}>
          <span>✦ Built in 60 seconds by idea2Lunch AI</span>
          <span>✦ Custom domain included</span>
          <span>✦ Live in 48 hours</span>
          <span>✦ You own all the code</span>
          {data.phone && <span style={{ marginLeft: 'auto' }}>📞 {data.phone}</span>}
        </div>
      </div>

      <div style={{ height: 88 }} />

      {/* Full site rendered inline — no iframe needed since this is server-rendered */}
      <div
        style={{ width: '100%', minHeight: 'calc(100vh - 88px - 72px)', overflow: 'hidden' }}
        dangerouslySetInnerHTML={{ __html: data.html }}
      />

      {/* Bottom CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'linear-gradient(135deg, #0D1117 0%, #1a2236 100%)',
        borderTop: '1px solid rgba(255,255,255,.08)',
        padding: '14px 20px', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between',
        gap: 12, zIndex: 999998, boxShadow: '0 -4px 24px rgba(0,0,0,.3)',
      }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 2 }}>
            Ready to go live?
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>
            $299 one-time · $97/mo hosting · Your domain in 48 hrs
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
          <a
            href={`mailto:hello@idea2lunch.com?subject=Question about my preview — ${encodeURIComponent(data.businessName)}`}
            style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', textDecoration: 'none', padding: '8px 14px' }}
          >
            Ask a question
          </a>
          <a
            href={checkoutUrl}
            style={{
              background: 'linear-gradient(135deg, #0066CC, #0052A3)',
              color: '#fff', borderRadius: 10, padding: '12px 24px',
              fontSize: 15, fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 2px 16px rgba(0,102,204,.5)', whiteSpace: 'nowrap',
            }}
          >
            Launch my site →
          </a>
        </div>
      </div>
    </>
  )
}
