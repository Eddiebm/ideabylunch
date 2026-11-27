export const runtime = 'edge'

import { validateHtml } from '../../lib/html-security'
import { createSiteVersion } from '../../lib/site-versions'

export async function POST(req: Request): Promise<Response> {
  let body: {
    html: string
    brief?: Record<string, unknown>
    selectedStyle?: string
    generationModel?: string
    generationConfig?: Record<string, unknown>
    customerEmail?: string
  }

  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { html, brief = {}, selectedStyle = 'default', generationModel = 'google/gemini-2.5-flash', generationConfig = {}, customerEmail } = body

  if (!html || typeof html !== 'string') {
    return Response.json({ error: 'html is required' }, { status: 400 })
  }

  const validation = validateHtml(html)
  if (!validation.valid) {
    return Response.json({ error: validation.error }, { status: 422 })
  }

  // Generate a 32-byte session token — this is what the client holds as proof of ownership
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32))
  const sessionToken = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('')

  try {
    const { id: versionId } = await createSiteVersion({
      html,
      customerEmail: customerEmail ?? null,
      sessionToken,
      brief,
      selectedStyle,
      generationModel,
      generationConfig,
    })

    return Response.json({ versionId, sessionToken })
  } catch (err) {
    console.error('[persist-site] DB write failed:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
