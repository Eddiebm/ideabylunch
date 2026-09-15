'use client'
import { useState } from 'react'

interface Props {
  productName: string
  tagline: string
  vision: string
}

const CARDS = [
  { fmt: 'profile', label: 'Profile Picture',    size: '400 × 400',  note: 'Instagram · WhatsApp · Facebook' },
  { fmt: 'cover',   label: 'Facebook Cover',     size: '820 × 312',  note: 'Facebook page cover' },
  { fmt: 'post',    label: 'Instagram Post',      size: '1080 × 1080', note: 'Feed · Stories preview' },
  { fmt: 'story',   label: 'Story / WhatsApp',   size: '1080 × 1920', note: 'Instagram · WhatsApp Business' },
  { fmt: 'header',  label: 'Twitter/X Header',   size: '1500 × 500',  note: 'Twitter · LinkedIn banner' },
]

function cardUrl(fmt: string, name: string, tagline: string) {
  const p = new URLSearchParams({ fmt, n: name.slice(0, 40), t: tagline.slice(0, 80) })
  return `/api/social/card?${p.toString()}`
}

export default function SocialKitTab({ productName, tagline }: Props) {
  const [generated, setGenerated] = useState(false)
  const [loadedCount, setLoadedCount] = useState(0)

  const allLoaded = loadedCount >= CARDS.length

  return (
    <div style={{ background:'#FFFFFF', borderRadius:16, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.04), 0 0 0 0.5px rgba(0,0,0,.06)', marginTop:10 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:'0.5px solid rgba(0,0,0,.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:24, height:24, borderRadius:6, background:'#F2F2F7', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:11, fontWeight:600, color:'#6E6E73' }}>9</span>
          </div>
          <span style={{ fontSize:13, fontWeight:600, color:'#1D1D1F', letterSpacing:'-.1px' }}>Social Kit</span>
          {generated && !allLoaded && (
            <div style={{ display:'flex', alignItems:'center', gap:5, background:'#F2F2F7', borderRadius:100, padding:'2px 8px' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#0066CC', animation:'pulse .8s ease infinite' }} />
              <span style={{ fontSize:11, color:'#6E6E73', fontWeight:500 }}>Generating</span>
            </div>
          )}
          {generated && allLoaded && (
            <div style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(48,209,88,.1)', borderRadius:100, padding:'2px 8px' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'#30D158' }} />
              <span style={{ fontSize:11, color:'#30D158', fontWeight:500 }}>Ready</span>
            </div>
          )}
        </div>
        <span style={{ fontSize:12, color:'#AEAEB2', fontWeight:400 }}>5 assets · all platforms</span>
      </div>

      <div style={{ padding:'20px 24px' }}>
        {!generated ? (
          <>
            <p style={{ fontSize:15, color:'#6E6E73', lineHeight:1.6, margin:'0 0 20px' }}>
              Generate all your social media assets in one click — profile picture, cover photos, feed posts, stories, and banners. Ready to download and post.
            </p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
              {CARDS.map(c => (
                <div key={c.fmt} style={{ background:'#F2F2F7', borderRadius:8, padding:'6px 12px', fontSize:12, color:'#6E6E73' }}>
                  {c.label}
                </div>
              ))}
            </div>
            <button
              onClick={() => setGenerated(true)}
              style={{ marginTop:16, background:'#0066CC', color:'#fff', border:'none', borderRadius:10, padding:'9px 20px', fontSize:15, fontWeight:600, letterSpacing:'-.2px', cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
              Generate Social Kit
            </button>
          </>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {CARDS.map(c => {
              const url = cardUrl(c.fmt, productName, tagline)
              const isStory = c.fmt === 'story'
              return (
                <div key={c.fmt} style={{ background:'#F9F9F9', borderRadius:12, overflow:'hidden' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', borderBottom:'0.5px solid rgba(0,0,0,.06)' }}>
                    <div>
                      <span style={{ fontSize:13, fontWeight:600, color:'#1D1D1F' }}>{c.label}</span>
                      <span style={{ fontSize:12, color:'#AEAEB2', marginLeft:8 }}>{c.size}</span>
                      <div style={{ fontSize:11, color:'#AEAEB2', marginTop:2 }}>{c.note}</div>
                    </div>
                    <a
                      href={url}
                      download={`${productName.replace(/\s+/g,'-').toLowerCase()}-${c.fmt}.png`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:8, background:'#1D1D1F', color:'#fff', fontSize:13, fontWeight:500, textDecoration:'none', flexShrink:0 }}>
                      ↓ Download
                    </a>
                  </div>
                  {/* Preview — contain story format to avoid huge vertical card */}
                  <div style={{
                    overflow:'hidden',
                    display:'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    background:'#eee',
                    maxHeight: isStory ? 240 : undefined,
                  }}>
                    <img
                      src={url}
                      alt={c.label}
                      onLoad={() => setLoadedCount(n => n + 1)}
                      style={{
                        display:'block',
                        width: isStory ? 'auto' : '100%',
                        height: isStory ? 240 : 'auto',
                        maxWidth:'100%',
                      }}
                    />
                  </div>
                </div>
              )
            })}

            {/* Pro upgrade teaser */}
            <div style={{ borderRadius:12, border:'1px solid rgba(0,0,0,.08)', padding:'16px 18px', background:'#FAFAFA', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:'#1D1D1F', marginBottom:4 }}>Social Kit Pro</div>
                <div style={{ fontSize:12, color:'#6E6E73', lineHeight:1.5 }}>AI-generated hero imagery, animated Reel intro, and post copy for each platform.</div>
              </div>
              <button
                disabled
                style={{ background:'#F2F2F7', color:'#AEAEB2', border:'none', borderRadius:10, padding:'9px 16px', fontSize:13, fontWeight:600, cursor:'not-allowed', flexShrink:0, whiteSpace:'nowrap' }}>
                Coming soon
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
