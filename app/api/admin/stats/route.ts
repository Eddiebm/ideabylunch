import { getRedis } from '@/app/lib/redis'

export const runtime = 'edge'

function auth(req: Request) {
  const secret = req.headers.get('x-admin-secret')
    || new URL(req.url).searchParams.get('secret')
  return secret === process.env.ADMIN_SECRET
}

export async function GET(req: Request) {
  if (!auth(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const redis = getRedis()
  if (!redis) return Response.json({ error: 'unavailable' }, { status: 503 })

  // Orders
  const orderKeys = await redis.keys('order:*')
  const orders: any[] = []
  for (const key of orderKeys) {
    const raw = await redis.get(key)
    if (!raw) continue
    const o: any = typeof raw === 'string' ? JSON.parse(raw) : raw
    orders.push({ ...o, _key: key })
  }

  // Revenue by plan
  const revenue: Record<string, number> = {}
  let totalRevenue = 0
  let expressRevenue = 0
  for (const o of orders) {
    const plan = o.plan || 'unknown'
    const amount = o.amountPaid || 0
    revenue[plan] = (revenue[plan] || 0) + amount
    totalRevenue += amount
    if (o.express) expressRevenue += o.expressFeePaid || 0
  }

  // Leads
  const leadKeys = await redis.keys('lead:*')
  const leads: any[] = []
  for (const key of leadKeys) {
    const raw = await redis.get(key)
    if (!raw) continue
    leads.push(typeof raw === 'string' ? JSON.parse(raw) : raw)
  }

  // Sessions (active customers)
  const sessionKeys = await redis.keys('session:*')

  // Deploys
  const deploys = Number(await redis.get('stats:deploys')) || 0

  // Weekly edits per customer (Pro vs free usage)
  const editKeys = await redis.keys('edits:*')
  const totalEdits = editKeys.length

  // Resellers
  const resellerKeys = await redis.keys('reseller:*')
  const resellers: any[] = []
  for (const key of resellerKeys) {
    if (key.includes(':sales:') || key.includes(':revenue:')) continue
    const raw = await redis.get(key)
    if (!raw) continue
    const r: any = typeof raw === 'string' ? JSON.parse(raw) : raw
    const code = r.code
    const sales = Number(await redis.get(`reseller:sales:${code}`)) || 0
    const rev = Number(await redis.get(`reseller:revenue:${code}`)) || 0
    resellers.push({ ...r, sales, revenue: rev / 100, commission: Math.round(rev * r.commissionRate) / 100 })
  }

  // Pro customers
  const proKeys = await redis.keys('pro:*')

  // Costs (estimated — OpenRouter Gemini 2.5 Flash ~$0.003/brief)
  const briefCount = orders.length + leads.length
  const estimatedAiCost = briefCount * 0.003
  const estimatedInfraCost = 20 // Vercel + Upstash monthly estimate
  const estimatedTotalCost = estimatedAiCost + estimatedInfraCost
  const estimatedProfit = totalRevenue - estimatedTotalCost

  return Response.json({
    overview: {
      totalRevenue,
      expressRevenue,
      estimatedCost: estimatedTotalCost,
      estimatedProfit,
      margin: totalRevenue > 0 ? Math.round((estimatedProfit / totalRevenue) * 100) : 0,
    },
    orders: {
      total: orders.length,
      deployed: orders.filter(o => o.status === 'deployed').length,
      failed: orders.filter(o => o.status === 'deploy_failed').length,
      byPlan: revenue,
      recent: orders
        .sort((a, b) => (b.deployedAt || 0) - (a.deployedAt || 0))
        .slice(0, 20)
        .map(o => ({
          id: o._key,
          productName: o.productName,
          email: o.lastEditedBy || 'unknown',
          plan: o.plan,
          amount: o.amountPaid,
          express: !!o.express,
          status: o.status,
          liveUrl: o.liveUrl,
          deployedAt: o.deployedAt,
        })),
    },
    leads: {
      total: leads.length,
      recent: leads
        .sort((a, b) => (b.capturedAt || 0) - (a.capturedAt || 0))
        .slice(0, 20),
    },
    customers: {
      total: orderKeys.length,
      pro: proKeys.length,
      activeSessions: sessionKeys.length,
    },
    content: {
      deploys,
      totalEdits,
    },
    resellers,
    costs: {
      aiPerBrief: 0.003,
      estimatedMonthlyCost: estimatedTotalCost,
      breakdown: {
        ai: estimatedAiCost.toFixed(2),
        infra: estimatedInfraCost,
      },
    },
  })
}
