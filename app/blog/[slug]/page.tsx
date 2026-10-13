export const runtime = 'edge'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BLOG_POSTS, getBlogPost } from '../../lib/blog'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) return { title: 'Post not found — IdeaByLunch' }
  return {
    title: `${post.title} — IdeaByLunch`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://ideabylunch.com/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getBlogPost(slug)
  if (!post) notFound()

  const more = BLOG_POSTS.filter(p => p.slug !== post.slug).slice(0, 2)

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #F2F2F7; }
        a { color: #0066CC; }
      `}</style>

      <nav style={{ background: '#fff', borderBottom: '0.5px solid rgba(0,0,0,.08)', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
        <Link href="/" style={{ fontSize: 17, fontWeight: 600, color: '#1D1D1F', textDecoration: 'none' }}>IdeaByLunch</Link>
        <Link href="/app" style={{ background: '#0066CC', color: '#fff', borderRadius: 8, padding: '7px 16px', fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>Cook my idea →</Link>
      </nav>

      <article style={{ maxWidth: 640, margin: '0 auto', padding: '56px 24px 80px', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif' }}>
        <Link href="/blog" style={{ fontSize: 14, color: '#6E6E73', textDecoration: 'none' }}>← Blog</Link>

        <header style={{ margin: '24px 0 40px' }}>
          <p style={{ fontSize: 13, color: '#AEAEB2', fontWeight: 500, margin: '0 0 12px' }}>
            {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · {post.readMins} min read
          </p>
          <h1 style={{ fontSize: 'clamp(30px,5vw,42px)', fontWeight: 700, color: '#1D1D1F', letterSpacing: '-1.3px', lineHeight: 1.15, margin: 0 }}>
            {post.title}
          </h1>
        </header>

        <div style={{ fontSize: 17, color: '#3C3C43', lineHeight: 1.75 }}>
          {post.body.map((block, i) => {
            if (block.type === 'h2') {
              return (
                <h2 key={i} style={{ fontSize: 24, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.5px', margin: '40px 0 16px' }}>
                  {block.text}
                </h2>
              )
            }
            if (block.type === 'law') {
              return (
                <div key={i} style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', margin: '20px 0', boxShadow: '0 1px 3px rgba(0,0,0,.06)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0066CC' }}>LAW {block.n}</span>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1D1D1F', letterSpacing: '-.3px', margin: 0 }}>{block.name}</h3>
                  </div>
                  <p style={{ fontSize: 16, color: '#3C3C43', lineHeight: 1.7, margin: 0 }}>{block.text}</p>
                </div>
              )
            }
            return (
              <p key={i} style={{ margin: '0 0 20px' }}>{block.text}</p>
            )
          })}
        </div>

        <div style={{ marginTop: 48, background: '#1D1D1F', borderRadius: 16, padding: '28px 32px', textAlign: 'center' }}>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,.85)', margin: '0 0 16px', lineHeight: 1.5 }}>
            Got an idea you've been sitting on? Don't let it decay.
          </p>
          <Link href="/app" style={{ background: '#0066CC', color: '#fff', borderRadius: 10, padding: '12px 28px', fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
            Get your free brief →
          </Link>
        </div>

        {more.length > 0 && (
          <div style={{ marginTop: 56, paddingTop: 32, borderTop: '0.5px solid rgba(0,0,0,.08)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: '#AEAEB2', margin: '0 0 16px' }}>More from the blog</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {more.map(p => (
                <Link key={p.slug} href={`/blog/${p.slug}`} style={{ fontSize: 16, fontWeight: 600, color: '#1D1D1F', textDecoration: 'none' }}>
                  {p.title} →
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </>
  )
}
