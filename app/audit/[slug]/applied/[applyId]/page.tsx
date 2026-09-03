export const runtime = 'nodejs'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getRedis } from '@/app/lib/redis'
import type { ApplyRecord } from '@/app/api/audit/apply/route'
import PromoteButtons from './PromoteButtons'

async function getApply(applyId: string): Promise<ApplyRecord | null> {
  const redis = getRedis()
  if (!redis) return null
  const raw = await redis.get<ApplyRecord | string>(`apply:${applyId}`)
  if (!raw) return null
  return typeof raw === 'string' ? (JSON.parse(raw) as ApplyRecord) : raw
}

export default async function AppliedPreviewPage({ params }: { params: Promise<{ slug: string; applyId: string }> }) {
  const { slug, applyId } = await params
  const record = await getApply(applyId)
  if (!record || record.slug !== slug) notFound()

  const redis = getRedis()
  const orderRaw = redis ? await redis.get(`order:${record.siteId}`) : null
  const order: any = orderRaw ? (typeof orderRaw === 'string' ? JSON.parse(orderRaw) : orderRaw) : null
  const productionUrl = order?.liveUrl || ''

  return (
    <>
      <style>{`
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        html, body { margin: 0; padding: 0; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif; }
        a { text-decoration: none; }
      `}</style>

      <nav style={{ background: 'rgba(242,242,247,0.85)', backdropFilter: 'blur(20px)', borderBottom: '0.5px solid rgba(0,0,0,.08)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F' }}>IdeaByLunch</Link>
          <Link href={`/audit/${slug}`} style={{ background: '#1D1D1F', color: '#FFFFFF', borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 500 }}>Back to audit</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '48px 24px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#6E6E73', marginBottom: 10 }}>Preview — not live yet</div>
        <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 800, color: '#1D1D1F', letterSpacing: '-1px', lineHeight: 1.1, margin: '0 0 12px' }}>
          Review the rewrite before it ships
        </h1>
        <p style={{ fontSize: 15, color: '#6E6E73', margin: '0 auto 12px', maxWidth: 560, lineHeight: 1.5 }}>
          Applied: {record.applied.join(', ')}. This is a preview deployment — your live site is untouched until you click "Ship to production."
        </p>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto 32px', padding: '0 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 28 }}>
          <div style={{ background: '#F2F2F7', borderRadius: 14, padding: 20, border: '0.5px dashed rgba(0,0,0,.15)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#AEAEB2', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>Before</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#6E6E73', lineHeight: 1.3 }}>{record.before.h1 || '(no H1 detected)'}</div>
          </div>
          <div style={{ background: '#1D1D1F', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#30D158', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>After (preview)</div>
            <a href={record.previewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: '#0066CC', fontWeight: 500 }}>{record.previewUrl} ↗</a>
          </div>
        </div>

        <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.06), 0 0 0 0.5px rgba(0,0,0,.08)', marginBottom: 32, background: '#fff' }}>
          <iframe
            src={record.previewUrl}
            title="Preview"
            style={{ width: '100%', height: 640, border: 'none', display: 'block' }}
          />
        </div>

        <div style={{ background: '#fff', borderRadius: 20, padding: '32px 24px', boxShadow: '0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)' }}>
          {record.status !== 'preview' ? (
            <p style={{ textAlign: 'center', fontSize: 15, color: '#6E6E73', margin: 0 }}>
              This apply is already {record.status === 'shipped' ? 'shipped' : 'rolled back'}.
            </p>
          ) : (
            <PromoteButtons applyId={applyId} productionUrl={productionUrl} />
          )}
        </div>
      </div>
    </>
  )
}
