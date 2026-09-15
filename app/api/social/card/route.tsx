export const runtime = 'edge'
import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

const PALETTE = [
  '0F4C81', '1B5E20', '4A148C', '880E4F', 'BF360C',
  '006064', '455A64', '4E342E', '1565C0', '2E7D32',
]

function brandColor(name: string): string {
  let h = 0
  for (const c of name) h = ((h << 5) - h + c.charCodeAt(0)) | 0
  return PALETTE[Math.abs(h) % PALETTE.length]
}

function initials(name: string): string {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

const SIZES = {
  profile: [400,  400 ],
  cover:   [820,  312 ],
  post:    [1080, 1080],
  story:   [1080, 1920],
  header:  [1500, 500 ],
} as const

type Format = keyof typeof SIZES

export async function GET(req: NextRequest) {
  const p    = new URL(req.url).searchParams
  const fmt  = (p.get('fmt') || 'post') as Format
  const name = (p.get('n') || 'Your Brand').slice(0, 40)
  const tag  = (p.get('t') || '').slice(0, 80)
  const col  = p.get('c') || brandColor(name)

  const [w, h] = (SIZES[fmt] ?? SIZES.post) as [number, number]
  const ini    = initials(name)
  const bg     = `#${col}`

  const font = await fetch(
    'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
  ).then(r => r.arrayBuffer())

  let ui: React.ReactElement

  if (fmt === 'profile') {
    ui = (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', width:'100%', height:'100%', background: bg }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:120, height:120, borderRadius:60, background:'rgba(255,255,255,0.18)', marginBottom:24 }}>
          <span style={{ fontSize:48, fontWeight:700, color:'#fff' }}>{ini}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'center' }}>
          <span style={{ fontSize:30, fontWeight:700, color:'#fff' }}>{name}</span>
        </div>
        {tag && (
          <div style={{ display:'flex', justifyContent:'center', marginTop:10, paddingLeft:40, paddingRight:40 }}>
            <span style={{ fontSize:16, color:'rgba(255,255,255,0.7)', textAlign:'center' }}>{tag}</span>
          </div>
        )}
      </div>
    )
  } else if (fmt === 'cover') {
    ui = (
      <div style={{ display:'flex', width:'100%', height:'100%', background:'#fff' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:220, background: bg, flexShrink:0 }}>
          <span style={{ fontSize:72, fontWeight:700, color:'#fff' }}>{ini}</span>
        </div>
        <div style={{ display:'flex', flexDirection:'column', justifyContent:'center', flex:1, paddingLeft:48, paddingRight:48 }}>
          <span style={{ fontSize:36, fontWeight:700, color: bg }}>{name}</span>
          {tag && <span style={{ fontSize:20, color:'#555', marginTop:10 }}>{tag}</span>}
        </div>
      </div>
    )
  } else if (fmt === 'post') {
    const topH = Math.round(h * 0.6)
    const botH = h - topH
    ui = (
      <div style={{ display:'flex', flexDirection:'column', width:'100%', height:'100%' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:topH, background: bg, paddingLeft:80, paddingRight:80 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:120, height:120, borderRadius:60, background:'rgba(255,255,255,0.15)', marginBottom:32 }}>
            <span style={{ fontSize:52, fontWeight:700, color:'#fff' }}>{ini}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'center' }}>
            <span style={{ fontSize:54, fontWeight:700, color:'#fff', textAlign:'center' }}>{name}</span>
          </div>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:botH, background:'#fff', paddingLeft:80, paddingRight:80 }}>
          {tag && (
            <div style={{ display:'flex', justifyContent:'center', marginBottom:20 }}>
              <span style={{ fontSize:28, color:'#333', textAlign:'center' }}>{tag}</span>
            </div>
          )}
          <span style={{ fontSize:18, color:'#aaa' }}>ideabylunch.com</span>
        </div>
      </div>
    )
  } else if (fmt === 'story') {
    ui = (
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', width:'100%', height:'100%', background: bg, paddingLeft:80, paddingRight:80 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', width:160, height:160, borderRadius:80, background:'rgba(255,255,255,0.15)', marginBottom:48 }}>
          <span style={{ fontSize:64, fontWeight:700, color:'#fff' }}>{ini}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'center', marginBottom:24 }}>
          <span style={{ fontSize:60, fontWeight:700, color:'#fff', textAlign:'center' }}>{name}</span>
        </div>
        {tag && (
          <div style={{ display:'flex', justifyContent:'center', marginBottom:80 }}>
            <span style={{ fontSize:30, color:'rgba(255,255,255,0.75)', textAlign:'center' }}>{tag}</span>
          </div>
        )}
        <div style={{ display:'flex', position:'absolute', bottom:80 }}>
          <span style={{ fontSize:22, color:'rgba(255,255,255,0.45)' }}>ideabylunch.com</span>
        </div>
      </div>
    )
  } else {
    ui = (
      <div style={{ display:'flex', alignItems:'center', width:'100%', height:'100%', background: bg, paddingLeft:100, paddingRight:100 }}>
        <div style={{ display:'flex', flexDirection:'column' }}>
          <span style={{ fontSize:76, fontWeight:700, color:'#fff', marginBottom:16 }}>{name}</span>
          {tag && <span style={{ fontSize:34, color:'rgba(255,255,255,0.75)' }}>{tag}</span>}
        </div>
      </div>
    )
  }

  return new ImageResponse(ui, {
    width: w,
    height: h,
    fonts: [{ name: 'Inter', data: font, weight: 700, style: 'normal' }],
  })
}
