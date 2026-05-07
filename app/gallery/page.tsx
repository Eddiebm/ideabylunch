export const runtime = 'edge'
import { getRedis } from '@/app/lib/redis'

export const revalidate = 300

interface SiteCard {
  productName: string
  liveUrl: string
  deployedAt: number
  industry?: string
}

async function getGallerySites(): Promise<SiteCard[]> {
  try {
    const redis = getRedis()
    if (!redis) return []
    const keys = await redis.keys('order:*')
    const sites: SiteCard[] = []
    for (const key of keys.slice(0, 50)) {
      const raw = await redis.get(key)
      if (!raw) continue
      const order: any = typeof raw === 'string' ? JSON.parse(raw) : raw
      if (order.liveUrl && order.productName) {
        sites.push({
          productName: order.productName,
          liveUrl: order.liveUrl,
          deployedAt: order.deployedAt || 0,
          industry: order.industry || '',
        })
      }
    }
    return sites.sort((a, b) => b.deployedAt - a.deployedAt)
  } catch { return [] }
}

export default async function GalleryPage() {
  const sites = await getGallerySites()

  return (
    <>
      <style>{`* { box-sizing: border-box; } body { margin: 0; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }`}</style>
      <nav style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,.08)', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', textDecoration: 'none' }}>IdeaByLunch</a>
        <a href="/app" style={{ background: '#0066CC', color: '#fff', borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Build my site →</a>
      </nav>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '48px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: 40, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', margin: '0 0 12px' }}>Sites built with IdeaByLunch</h1>
          <p style={{ fontSize: 17, color: '#6E6E73', margin: 0 }}>{sites.length} live sites and counting — yours could be next.</p>
        </div>

        {sites.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <p style={{ color: '#AEAEB2', fontSize: 15 }}>No sites yet — be the first.</p>
            <a href="/app" style={{ color: '#0066CC', fontSize: 15 }}>Build yours now →</a>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {sites.map((site, i) => (
              <a
                key={i}
                href={site.liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,.08)', textDecoration: 'none', display: 'block', transition: 'box-shadow .2s' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F2F2F7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {site.productName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: '#1D1D1F', margin: 0 }}>{site.productName}</p>
                    {site.industry && <p style={{ fontSize: 12, color: '#AEAEB2', margin: 0 }}>{site.industry}</p>}
                  </div>
                </div>
                <div style={{ background: '#F2F2F7', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#6E6E73', wordBreak: 'break-all' }}>
                  {site.liveUrl.replace('https://', '')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#30D158' }} />
                    <span style={{ fontSize: 12, color: '#6E6E73' }}>Live</span>
                  </div>
                  <span style={{ fontSize: 12, color: '#AEAEB2' }}>{new Date(site.deployedAt).toLocaleDateString()}</span>
                </div>
              </a>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 60, padding: '40px 32px', background: '#fff', borderRadius: 20, boxShadow: '0 1px 3px rgba(0,0,0,.08)' }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1px', margin: '0 0 12px' }}>Ready to join them?</h2>
          <p style={{ fontSize: 15, color: '#6E6E73', margin: '0 0 24px' }}>Your professional site, live in 48 hours. Starts at $149.</p>
          <a href="/app" style={{ background: '#0066CC', color: '#fff', borderRadius: 12, padding: '14px 32px', fontSize: 17, fontWeight: 600, textDecoration: 'none' }}>Build my site — free brief →</a>
        </div>
      </div>
    </>
  )
}
