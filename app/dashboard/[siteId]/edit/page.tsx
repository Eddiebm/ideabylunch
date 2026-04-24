export const runtime = 'edge'
import { headers } from 'next/headers'
import { Redis } from '@upstash/redis'
import EditForm from './form'

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export default async function EditPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params
  const hdrs = await headers()
  const token = hdrs.get('x-dashboard-token') || ''

  const redis = getRedis()
  if (!redis) {
    return (
      <div style={{ padding: '40px', fontFamily: 'system-ui', color: '#666' }}>
        <h1>Service unavailable</h1>
      </div>
    )
  }

  // Validate auth token
  const authRaw = await redis.get(`dashboard:token:${token}`)
  const auth: any = authRaw ? (typeof authRaw === 'string' ? JSON.parse(authRaw) : authRaw) : null
  if (!auth || auth.siteId !== siteId || (auth.expiresAt && Date.now() > auth.expiresAt)) {
    return (
      <div style={{ padding: '40px', fontFamily: 'system-ui', color: '#666' }}>
        <h1>Unauthorized</h1>
        <p>Token invalid or expired. Check your email for the edit link.</p>
      </div>
    )
  }

  // Fetch site data
  const orderRaw = await redis.get(`order:${siteId}`)
  const order: any = orderRaw ? (typeof orderRaw === 'string' ? JSON.parse(orderRaw) : orderRaw) : null
  if (!order) {
    return (
      <div style={{ padding: '40px', fontFamily: 'system-ui', color: '#666' }}>
        <h1>Site not found</h1>
      </div>
    )
  }

  const content = order.content || {}
  const editCount = order.editCount || 0
  const editsRemaining = Math.max(0, 3 - editCount)

  return (
    <div style={{ minHeight: '100vh', background: '#F2F2F7', fontFamily: 'system-ui', padding: '20px' }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: '#1D1D1F', marginBottom: 8 }}>
          Edit {order.productName}
        </h1>
        <p style={{ fontSize: 15, color: '#6E6E73', marginBottom: 24 }}>
          {editsRemaining > 0
            ? `You have ${editsRemaining} free edit${editsRemaining !== 1 ? 's' : ''} remaining`
            : "You've used all free edits. Pay $7.99 to continue editing."}
        </p>

        <EditForm
          siteId={siteId}
          token={token}
          initialContent={content}
          editCount={editCount}
          productName={order.productName}
        />

        {order.liveUrl && (
          <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid rgba(0,0,0,.1)' }}>
            <a
              href={`https://${order.liveUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#0066CC', fontSize: 15, fontWeight: 500, textDecoration: 'none' }}
            >
              → View your live site
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
