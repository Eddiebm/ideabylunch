// @ts-ignore `.open-next/worker.js` is generated at build time
import { default as handler } from './.open-next/worker.js'

const ORIGIN = 'https://ideabylunch.com'

// Keys must match `triggers.crons` in wrangler.jsonc exactly.
const CRON_ROUTES: Record<string, string> = {
  '0 7 * * *': '/api/cron/admin-digest',
  '0 9 * * *': '/api/cron/email-sequence',
  '0 12 * * *': '/api/cron/publish-hooks',
  '0 8 1 * *': '/api/cron/monthly-delivery',
}

type Env = CloudflareEnv & { CRON_SECRET?: string }

export default {
  fetch: handler.fetch,

  async scheduled(controller, env, ctx) {
    const path = CRON_ROUTES[controller.cron]
    if (!path) throw new Error(`No route mapped for cron "${controller.cron}"`)
    const secret = env.CRON_SECRET
    if (!secret) throw new Error('CRON_SECRET is not set')

    const res: Response = await handler.fetch(
      new Request(new URL(path, ORIGIN), { headers: { authorization: `Bearer ${secret}` } }),
      env,
      ctx,
    )
    if (!res.ok) throw new Error(`${path} responded ${res.status}`)
  },
} satisfies ExportedHandler<Env>
