// app/api/video/status/route.ts
export const runtime = 'edge'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const task_id = searchParams.get('task_id')
  if (!task_id) return Response.json({ error: 'task_id required' }, { status: 400 })
  const apiKey = process.env.PIAPI_KEY
  if (!apiKey) return Response.json({ error: 'Not configured' }, { status: 503 })
  try {
    const res = await fetch(`https://api.piapi.ai/api/v1/task/${task_id}`, {
      headers: { 'x-api-key': apiKey },
    })
    if (!res.ok) return Response.json({ error: `Poll failed: ${res.status}` }, { status: 502 })
    const data = await res.json()
    if (data.code !== 200) return Response.json({ error: 'Poll error' }, { status: 502 })
    const piStatus: string = data.data?.status
    let video_url: string | null = null
    let status: 'pending' | 'processing' | 'complete' | 'failed' = 'pending'
    if (piStatus === 'completed') {
      video_url = data.data?.output?.works?.[0]?.resource?.resource || null
      status = video_url ? 'complete' : 'failed'
    } else if (piStatus === 'failed') {
      status = 'failed'
    } else if (piStatus === 'processing') {
      status = 'processing'
    } else {
      status = 'pending'
    }
    return Response.json({ task_id, status, video_url })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
