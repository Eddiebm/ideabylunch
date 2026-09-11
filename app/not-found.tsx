import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      padding: '24px', background: '#fff',
    }}>
      <div style={{ maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1D1D1F', margin: '0 0 8px' }}>
          Page not found
        </h1>
        <p style={{ fontSize: 15, color: '#6E6E73', lineHeight: 1.5, margin: '0 0 24px' }}>
          This page doesn&apos;t exist or was moved.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block', background: '#0066CC', color: '#fff',
            textDecoration: 'none', borderRadius: 10, padding: '10px 24px',
            fontSize: 15, fontWeight: 600,
          }}
        >
          Back to IdeaByLunch
        </Link>
      </div>
    </div>
  )
}
