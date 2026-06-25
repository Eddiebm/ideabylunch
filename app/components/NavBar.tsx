'use client'
import { useState } from 'react'
import Link from 'next/link'

interface NavBarProps {
  isUS: boolean
  flag: string
  marketCode: string
  toggleHref: string
}

export default function NavBar({ isUS, flag, marketCode, toggleHref }: NavBarProps) {
  const [open, setOpen] = useState(false)

  const links = [
    { href: '#how', label: 'How it works', external: false },
    { href: '#pricing', label: 'Pricing', external: false },
    { href: '#faq', label: 'FAQ', external: false },
    { href: '/audit', label: 'Free audit', external: false },
  ]

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(242,242,247,0.92)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '0.5px solid rgba(0,0,0,.08)',
    }}>
      <div style={{
        maxWidth: 980, margin: '0 auto', padding: '0 20px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <a href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', letterSpacing: '-.3px', textDecoration: 'none', flexShrink: 0 }}>
          IdeaByLunch
        </a>

        {/* Desktop links */}
        <div className="ibl-nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          {links.map(l => (
            <a key={l.href} href={l.href} style={{ fontSize: 14, color: '#6E6E73', fontWeight: 400, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {l.label}
            </a>
          ))}
          {!isUS && (
            <a href={toggleHref} style={{ fontSize: 12, color: '#6E6E73', fontWeight: 500, border: '0.5px solid rgba(0,0,0,.15)', borderRadius: 6, padding: '4px 8px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              {flag} {marketCode} → USD
            </a>
          )}
          <Link href="/app" style={{ background: '#1D1D1F', color: '#FFFFFF', borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 500, letterSpacing: '-.1px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Get your brief →
          </Link>
        </div>

        {/* Hamburger (mobile only) */}
        <button
          className="ibl-hamburger"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: '#1D1D1F', lineHeight: 0 }}
        >
          {open ? (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M5 5L17 17M17 5L5 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 7h16M3 11h16M3 15h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div style={{
          background: 'rgba(242,242,247,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '0.5px solid rgba(0,0,0,.08)', padding: '8px 20px 20px',
        }}>
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              style={{ display: 'block', fontSize: 17, fontWeight: 500, color: '#1D1D1F', padding: '13px 0', borderBottom: '0.5px solid rgba(0,0,0,.06)', textDecoration: 'none' }}
            >
              {l.label}
            </a>
          ))}
          {!isUS && (
            <a
              href={toggleHref}
              style={{ display: 'block', fontSize: 14, color: '#6E6E73', padding: '13px 0', borderBottom: '0.5px solid rgba(0,0,0,.06)', textDecoration: 'none' }}
            >
              {flag} Switch to USD
            </a>
          )}
          <Link
            href="/app"
            onClick={() => setOpen(false)}
            style={{ display: 'block', background: '#0066CC', color: '#FFFFFF', borderRadius: 10, padding: '14px 20px', fontSize: 16, fontWeight: 600, textAlign: 'center', marginTop: 14, textDecoration: 'none' }}
          >
            Get your free brief →
          </Link>
        </div>
      )}
    </nav>
  )
}
