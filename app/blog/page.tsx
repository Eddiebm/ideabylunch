export const runtime = 'edge'
import type { Metadata } from 'next'
import Link from 'next/link'
import { BLOG_POSTS } from '../lib/blog'

export const metadata: Metadata = {
  title: 'Blog — IdeaByLunch',
  description: 'Ideas on building, launching, and shipping fast — from the team behind IdeaByLunch.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'Blog — IdeaByLunch',
    description: 'Ideas on building, launching, and shipping fast.',
    url: 'https://ideabylunch.com/blog',
  },
}

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  return (
    <>
      <style>{`* { box-sizing: border-box; } body { margin: 0; background: #F2F2F7; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }`}</style>
      <nav style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,.08)', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', textDecoration: 'none' }}>IdeaByLunch</Link>
        <Link href="/app" style={{ background: '#0066CC', color: '#fff', borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Cook my idea →</Link>
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '64px 24px 80px' }}>
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 'clamp(32px,6vw,44px)', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.5px', margin: '0 0 12px', lineHeight: 1.1 }}>Blog</h1>
          <p style={{ fontSize: 17, color: '#6E6E73', margin: 0, lineHeight: 1.6 }}>Ideas on building, launching, and shipping before motivation runs out.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {posts.map(post => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,.08)', textDecoration: 'none', display: 'block' }}
            >
              <p style={{ fontSize: 12, color: '#AEAEB2', fontWeight: 500, margin: '0 0 8px' }}>
                {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {post.readMins} min read
              </p>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.5px', margin: '0 0 8px', lineHeight: 1.25 }}>{post.title}</h2>
              <p style={{ fontSize: 15, color: '#6E6E73', margin: 0, lineHeight: 1.6 }}>{post.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
