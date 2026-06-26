export const runtime = 'edge'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'id required' }, { status: 400 })

  const apiKey = process.env.CREATOMATE_API_KEY
  if (!apiKey) return Response.json({ error: 'Not configured' }, { status: 503 })

  const res = await fetch(`https://api.creatomate.com/v1/renders/${id}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })

  if (!res.ok) return Response.json({ error: 'Render not found' }, { status: 404 })

  const render = await res.json() as {
    id: string
    status: 'planned' | 'waiting' | 'transcribing' | 'rendering' | 'succeeded' | 'failed'
    url: string | null
    error_message: string | null
  }

  return Response.json({ status: render.status, url: render.url, error: render.error_message })
}
