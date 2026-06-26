export const runtime = 'edge'
import { NextRequest } from 'next/server'

function buildComposition(hook: string, body: string, cta: string, caption: string) {
  const hookWords = hook.split(/\s+/).length
  const hookReveal = Math.min(hookWords * 0.35 + 1, 11)
  const hookTotal = hookReveal + 2
  const bodyDur = Math.max(15, Math.ceil(body.split(/\s+/).length / 2.5))
  const ctaDur = 6
  const total = Math.ceil(hookTotal + bodyDur + ctaDur)

  const elements: object[] = [
    // Background
    { type: 'shape', fill_color: '#0A0A0A', width: '100%', height: '100%' },

    // Red accent bar alongside hook
    {
      type: 'shape', fill_color: '#FF0050',
      width: 6, height: '55%',
      x: 80, y: '50%', y_alignment: '50%',
      time: 0, duration: hookTotal,
      animations: [{ type: 'scale-in', x_anchor: '0%', y_anchor: '50%', duration: 0.4 }],
    },

    // "HOOK" label
    {
      type: 'text', text: 'HOOK',
      font_family: 'Montserrat', font_weight: '800', font_size: '26px',
      fill_color: '#FF0050',
      x: 90, y: '21%', y_alignment: '50%',
      time: 0, duration: hookTotal,
      animations: [{ type: 'fade', duration: 0.5 }],
    },

    // Hook text — word-by-word reveal
    {
      type: 'text', text: hook,
      font_family: 'Montserrat', font_weight: '800', font_size: '66px',
      fill_color: '#FFFFFF',
      width: '72%', height: '55%',
      x: '57%', y: '48%', x_alignment: '0%', y_alignment: '50%',
      text_alignment: 'left', line_height: 1.2,
      time: 0, duration: hookTotal,
      animations: [{ type: 'text-appear', scope: 'word', duration: 0.3 }],
    },

    // Body text
    ...(body ? [{
      type: 'text', text: body,
      font_family: 'Inter', font_weight: '500', font_size: '44px',
      fill_color: '#FFFFFF',
      width: '86%', height: '65%',
      x: '50%', y: '46%', x_alignment: '50%', y_alignment: '50%',
      text_alignment: 'center', line_height: 1.5,
      time: hookTotal, duration: bodyDur,
      animations: [{ type: 'fade', duration: 0.6 }],
      exit_animations: [{ type: 'fade', duration: 0.4 }],
    }] : []),

    // CTA — punchy scale-in
    ...(cta ? [{
      type: 'text', text: cta,
      font_family: 'Montserrat', font_weight: '800', font_size: '58px',
      fill_color: '#FF0050',
      width: '86%',
      x: '50%', y: '44%', x_alignment: '50%', y_alignment: '50%',
      text_alignment: 'center', line_height: 1.3,
      time: hookTotal + bodyDur, duration: ctaDur,
      animations: [{ type: 'scale-in', duration: 0.5 }],
    }] : []),

    // Caption / hashtags — subtle, always visible
    ...(caption ? [{
      type: 'text', text: caption,
      font_family: 'Inter', font_weight: '400', font_size: '28px',
      fill_color: 'rgba(255,255,255,0.38)',
      width: '90%',
      x: '50%', y: '93%', x_alignment: '50%', y_alignment: '50%',
      text_alignment: 'center',
      time: 0, duration: total,
    }] : []),
  ]

  return { output_format: 'mp4', width: 1080, height: 1920, duration: total, frame_rate: 30, elements }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.CREATOMATE_API_KEY
  if (!apiKey) return Response.json({ error: 'Video generation not configured — add CREATOMATE_API_KEY' }, { status: 503 })

  const { hook, body, cta, caption } = await req.json()
  if (!hook?.trim()) return Response.json({ error: 'hook required' }, { status: 400 })

  const source = buildComposition(hook.trim(), body?.trim() || '', cta?.trim() || '', caption?.trim() || '')

  const res = await fetch('https://api.creatomate.com/v1/renders', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source }),
  })

  if (!res.ok) {
    const err = await res.text()
    return Response.json({ error: `Render API error: ${err}` }, { status: 502 })
  }

  const renders = await res.json() as Array<{ id: string; status: string }>
  const render = renders[0]
  if (!render?.id) return Response.json({ error: 'No render returned' }, { status: 502 })

  return Response.json({ renderId: render.id, status: render.status })
}
